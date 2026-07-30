-- ─────────────────────────────────────────────────────────────────────────────
-- Per-package spot budgets — run this whole file in the Supabase SQL Editor
-- BEFORE deploying the app code. Idempotent: safe to re-run.
--
-- What it does:
--   1. Backfills `spotsTotal: 0` onto every existing package that predates the
--      field, so old rows parse cleanly and keep registering.
--   2. Extends register_for_event to enforce each package's own budget inside
--      the same row lock that already enforces total event capacity.
--   3. Adds the index that per-package count reads need.
--
-- Semantics of spotsTotal:
--   >= 1  → enforced. A package at its limit is rejected with PACKAGE_FULL.
--   0 / absent → "not budgeted": the legacy state. Registration falls back to
--   total event capacity alone, so a live event can't break the moment this
--   migration runs. The admin form refuses to SAVE such an event until every
--   package carries a real number that sums to capacity — the fix is forced on
--   the next edit, not on the next registration.
-- ─────────────────────────────────────────────────────────────────────────────

-- ═══ 1 ── Backfill spotsTotal onto pre-existing packages ════════════════════
-- Row-by-row with a per-row exception handler rather than one set-based UPDATE:
-- `packages` is a text column, so a single malformed value would abort the whole
-- statement. `packages::jsonb` is evaluated in the WHERE clause too, and clause
-- evaluation order is not guaranteed, so a typeof guard can't reliably protect
-- the cast. Skipping the bad row and reporting it is the safe shape.
do $$
declare
  r          record;
  v_packages jsonb;
  v_updated  int := 0;
  v_skipped  int := 0;
begin
  for r in
    select id, packages from public.events
    where packages is not null and packages <> '' and packages <> '[]'
  loop
    -- NULL sentinel rather than CONTINUE from inside the handler, so all control
    -- flow stays in the loop body.
    begin
      v_packages := r.packages::jsonb;
    exception when others then
      raise warning 'events.packages is not valid JSON for event %, skipped', r.id;
      v_packages := null;
    end;

    if v_packages is null or jsonb_typeof(v_packages) <> 'array' then
      v_skipped := v_skipped + 1;
      continue;
    end if;

    -- Already done (or nothing to do): leave the row untouched so a re-run is a
    -- genuine no-op and never rewrites an admin's real numbers back to 0.
    if not exists (
      select 1 from jsonb_array_elements(v_packages) pkg where not (pkg ? 'spotsTotal')
    ) then
      continue;
    end if;

    update public.events
    set packages = (
          select jsonb_agg(
                   case when pkg ? 'spotsTotal'
                        then pkg
                        else pkg || jsonb_build_object('spotsTotal', 0)
                   end
                   order by t.ord
                 )::text
          from jsonb_array_elements(v_packages) with ordinality as t(pkg, ord)
        ),
        updated_at = now()
    where id = r.id;

    v_updated := v_updated + 1;
  end loop;

  raise notice 'package spots backfill: % events updated, % skipped', v_updated, v_skipped;
end $$;

-- ═══ 2 ── register_for_event: enforce each package's own budget ══════════════
-- The signature is unchanged from the 8-arg version, so this is a plain
-- create-or-replace: no overload to drop, and the existing grants stand.
--
-- The per-package check sits INSIDE the `select ... for update` on the event row
-- that already guards total capacity, so two concurrent registrations for the
-- last spot of a package serialise behind the same lock and only one can win.
--
-- "Taken" matches the total-capacity rule exactly: CONFIRMED, plus PENDING holds
-- younger than the 15-minute checkout window. Counting is done against each
-- registration's `selected_packages` snapshot rather than a foreign key, so a
-- later rename or reprice of a package cannot lose track of what it has sold.
create or replace function public.register_for_event(
  p_registration_id   text,
  p_event_id          text,
  p_user_id           text,
  p_status            text,
  p_custom_responses  text,
  p_razorpay_order_id text default null,
  p_selected_packages text default null,
  p_amount_due_paise  int  default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_capacity  int;
  v_reserved  int;
  v_packages  jsonb;
  v_selected  jsonb;
  v_pkg_id    text;
  v_limit     int;
  v_used      int;
  -- Package ids held by every current registration, flattened. Materialised at
  -- most once per call, and only if some picked package actually has a budget.
  v_held_ids  text[] := '{}';
  v_held_done boolean := false;
  v_reg       record;
  v_reg_json  jsonb;
begin
  select capacity, packages into v_capacity, v_packages
  from public.events
  where id = p_event_id
  for update;

  if not found then
    return 'EVENT_NOT_FOUND';
  end if;

  if v_capacity is not null then
    select count(*) into v_reserved
    from public.event_registrations
    where event_id = p_event_id
      and (
        status = 'CONFIRMED'
        or (status = 'PENDING' and created_at > now() - interval '15 minutes')
      );

    if v_reserved >= v_capacity then
      return 'CAPACITY_FULL';
    end if;
  end if;

  -- ── Per-package budgets ──────────────────────────────────────────────────
  -- Skipped entirely when this registration picked no packages (a plain priced
  -- or free event) or when the event's package JSON is unusable.
  if p_selected_packages is not null and p_selected_packages <> '' and p_selected_packages <> '[]' then
    begin
      v_selected := p_selected_packages::jsonb;
    exception when others then
      v_selected := '[]'::jsonb;
    end;

    if v_packages is null or jsonb_typeof(v_packages) <> 'array' then
      v_packages := '[]'::jsonb;
    end if;

    if jsonb_typeof(v_selected) = 'array' then
      for v_pkg_id in select sel->>'id' from jsonb_array_elements(v_selected) sel loop
        -- jsonb_typeof guard: a non-numeric spotsTotal would make the ::int
        -- cast throw and fail the registration outright. Anything that isn't a
        -- number reads as "not budgeted", same as absent.
        select case when jsonb_typeof(pkg->'spotsTotal') = 'number'
                    then (pkg->>'spotsTotal')::int
               end
          into v_limit
        from jsonb_array_elements(v_packages) pkg
        where pkg->>'id' = v_pkg_id
        limit 1;

        -- null/0 limit = not budgeted (legacy). Total capacity already covered it.
        if v_limit is not null and v_limit > 0 then
          -- Flatten the held package ids once, row by row with a per-row
          -- exception handler. A set-based `er.selected_packages::jsonb` would be
          -- faster, but selected_packages is a TEXT column: one malformed value
          -- anywhere in the event would abort the cast and take down registration
          -- for everyone. Skipping the bad row is the correct trade.
          if not v_held_done then
            for v_reg in
              select selected_packages
              from public.event_registrations
              where event_id = p_event_id
                and selected_packages is not null
                and (
                  status = 'CONFIRMED'
                  or (status = 'PENDING' and created_at > now() - interval '15 minutes')
                )
            loop
              -- A NULL sentinel rather than CONTINUE from inside the handler:
              -- same effect, and it keeps all control flow in the loop body.
              begin
                v_reg_json := v_reg.selected_packages::jsonb;
              exception when others then
                v_reg_json := null;
              end;

              if v_reg_json is not null and jsonb_typeof(v_reg_json) = 'array' then
                v_held_ids := v_held_ids
                  || array(select sel->>'id' from jsonb_array_elements(v_reg_json) sel);
              end if;
            end loop;
            v_held_done := true;
          end if;

          select count(*) into v_used
          from unnest(v_held_ids) held
          where held = v_pkg_id;

          if v_used >= v_limit then
            -- The id, not the name: the caller resolves it to the name the
            -- runner actually saw, from the same snapshot it priced against.
            return 'PACKAGE_FULL:' || v_pkg_id;
          end if;
        end if;
      end loop;
    end if;
  end if;

  insert into public.event_registrations
    (id, event_id, user_id, status, razorpay_order_id, custom_responses,
     selected_packages, amount_due_paise)
  values
    (p_registration_id, p_event_id, p_user_id, p_status, p_razorpay_order_id,
     p_custom_responses, p_selected_packages, p_amount_due_paise);

  return 'INSERTED';
end;
$$;

revoke all    on function public.register_for_event(text, text, text, text, text, text, text, int) from public;
revoke all    on function public.register_for_event(text, text, text, text, text, text, text, int) from anon;
revoke all    on function public.register_for_event(text, text, text, text, text, text, text, int) from authenticated;
grant  execute on function public.register_for_event(text, text, text, text, text, text, text, int) to service_role;

-- NOTE ON confirm_registration: it is deliberately NOT given a package check.
-- It re-checks total capacity today; adding a package check there would let a
-- runner be rejected AFTER Razorpay captured their money. The PENDING hold that
-- register_for_event creates already reserves the package spot for the whole
-- 15-minute checkout window — the same guarantee total capacity gets.

-- ═══ 3 ── Index for the per-package count reads ═════════════════════════════
-- Serves both the RPC's count above and packageSpotsTaken() in the admin action.
create index if not exists er_event_selected_pkgs_idx
  on public.event_registrations (event_id, status)
  where selected_packages is not null;
