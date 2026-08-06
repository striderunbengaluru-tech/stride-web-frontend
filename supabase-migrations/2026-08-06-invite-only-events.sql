-- ─────────────────────────────────────────────────────────────────────────────
-- Invite-only event mode — run this whole file in the Supabase SQL Editor
-- BEFORE deploying the app code. Idempotent: safe to re-run.
--
-- What it does:
--   1. events.invite_only, plus created_by / updated_by attribution.
--   2. Widens event_registrations.status with APPLIED and REJECTED, and adds
--      the decided_at / decided_by audit pair.
--   3. Re-issues register_for_event with an invite-only branch. THE SIGNATURE
--      IS UNCHANGED, so no overload is created and no DROP is required.
--   4. Adds approve_registrations — the atomic, capacity-capped bulk approve.
--   5. Adds the (event_id, status) index the new counts read.
--
-- Semantics of invite_only:
--   * Applying is FREE and UNLIMITED. Capacity does not gate an application.
--   * APPROVALS are capped at capacity; approval alone confirms the spot.
--   * price_paise / packages stay on the row untouched and re-activate for NEW
--     registrants the moment the flag goes back to false.
--   * APPLIED rows never enter the reserved count and never consume a package
--     budget — packages are hidden while the mode is on.
--   * The event stays publicly listed. Invite-only is a selection model, not a
--     visibility model, so no RLS or sitemap change belongs here.
--
-- BEFORE RUNNING, confirm the two hand-authored admin views pass the new
-- statuses through (their DDL is not in this repo — if either filters on
-- status, APPLIED rows would be invisible in the admin UI):
--   select pg_get_viewdef('public.admin_registrations_flat'::regclass, true);
--   select pg_get_viewdef('public.admin_event_summary'::regclass,     true);
-- ─────────────────────────────────────────────────────────────────────────────

-- ═══ 1 ── events: the flag and the attribution columns ══════════════════════
-- created_by / updated_by hold a DISPLAY NAME SNAPSHOT, not a user id, and
-- carry no foreign key on purpose: hardDeleteUser() erases the users row
-- (src/lib/account/hard-delete.ts), and attribution must survive that.
-- No new timestamps: events.created_at / updated_at already exist and
-- set_events_updated_at keeps the latter fresh.
--
-- adminClient runs as service_role, so auth.uid() is NULL inside every app
-- write — a trigger cannot populate these. They are passed from the server
-- actions in src/lib/actions/admin.ts.
alter table public.events add column if not exists invite_only boolean not null default false;
alter table public.events add column if not exists created_by  text;
alter table public.events add column if not exists updated_by  text;

-- ═══ 2 ── event_registrations: widen the status CHECK ═══════════════════════
-- Widening a CHECK can never invalidate an existing row, so there is no
-- NOT VALID / VALIDATE dance to do.
--
-- The old constraint is found by DEFINITION rather than by name: it was created
-- inline in `create table`, so its generated name is not guaranteed, and this
-- repo's schema file has drifted from the live database.
do $$
declare
  v_conname text;
begin
  select con.conname into v_conname
  from pg_constraint con
  join pg_class     rel on rel.oid = con.conrelid
  join pg_namespace ns  on ns.oid  = rel.relnamespace
  where ns.nspname  = 'public'
    and rel.relname = 'event_registrations'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) ilike '%status%'
    and pg_get_constraintdef(con.oid) ilike '%CONFIRMED%'
  limit 1;

  if v_conname is not null then
    execute format('alter table public.event_registrations drop constraint %I', v_conname);
  end if;
end
$$;

alter table public.event_registrations
  add constraint event_registrations_status_check
  check (status in ('PENDING', 'CONFIRMED', 'CANCELLED', 'APPLIED', 'REJECTED'));

-- The approve/reject decision trail. Same text-snapshot reasoning as
-- events.created_by above.
alter table public.event_registrations add column if not exists decided_at timestamptz;
alter table public.event_registrations add column if not exists decided_by text;

-- ═══ 3 ── register_for_event: the invite-only branch ════════════════════════
-- SIGNATURE UNCHANGED — a pure CREATE OR REPLACE, no overload, no drop.
--
-- The invite-only decision is read from the event row under the SAME lock that
-- already guards capacity, so a mid-flight toggle cannot be raced: whatever the
-- route believed when it read the event a moment ago, this is authoritative.
--
-- Returns, in addition to the existing values:
--   'APPLIED'            → invite-only application recorded (no seat consumed)
--   'ALREADY_REGISTERED' → unique(event_id, user_id) collision from a concurrent
--                          double-submit, which previously surfaced as a 500
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
  v_capacity    int;
  v_reserved    int;
  v_packages    jsonb;
  v_invite_only boolean;
  v_selected    jsonb;
  v_pkg_id      text;
  v_limit       int;
  v_used        int;
  v_held_ids    text[] := '{}';
  v_held_done   boolean := false;
  v_reg         record;
  v_reg_json    jsonb;
begin
  -- Serialize concurrent registrations for this event; the lock is held until
  -- this function's transaction commits, so the counts below see every prior
  -- committed insert.
  select capacity, packages, coalesce(invite_only, false)
    into v_capacity, v_packages, v_invite_only
  from public.events
  where id = p_event_id
  for update;

  if not found then
    return 'EVENT_NOT_FOUND';
  end if;

  -- ── Invite-only: unlimited, free applications ────────────────────────────
  -- Deliberately BEFORE the capacity block and BEFORE the package loop:
  --   * capacity gates approvals, not applications
  --   * packages are hidden under this mode, so p_selected_packages is
  --     DISCARDED rather than trusted — a hand-posted package id must not be
  --     able to write a snapshot that getPackageSpotsTaken would then count
  --   * amount_due 0 rather than NULL: NULL would let verify-payment fall back
  --     to events.price_paise, and 0 makes the receipt blocks render as free
  --     rather than as absent
  -- p_status is ignored here on purpose. If the toggle flipped between the
  -- route's read and this lock, the row is still recorded correctly.
  if v_invite_only then
    begin
      insert into public.event_registrations
        (id, event_id, user_id, status, razorpay_order_id, custom_responses,
         selected_packages, amount_due_paise)
      values
        (p_registration_id, p_event_id, p_user_id, 'APPLIED', null,
         p_custom_responses, null, 0);
    exception when unique_violation then
      return 'ALREADY_REGISTERED';
    end;

    return 'APPLIED';
  end if;

  -- ── Normal mode ──────────────────────────────────────────────────────────
  -- The reserved predicate is a positive allowlist, so APPLIED rows left over
  -- from a switched-off invite-only window correctly hold no seat.
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

  -- Per-package budgets. Counted from each registration's selected_packages
  -- snapshot rather than a foreign key, so renaming or repricing a package
  -- cannot lose track of what it has sold.
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

        if v_limit is not null and v_limit > 0 then
          -- Flattened once, row by row with a per-row exception handler:
          -- selected_packages is TEXT, so one malformed value would otherwise
          -- abort the cast and take down registration for the whole event.
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
            return 'PACKAGE_FULL:' || v_pkg_id;
          end if;
        end if;
      end loop;
    end if;
  end if;

  begin
    insert into public.event_registrations
      (id, event_id, user_id, status, razorpay_order_id, custom_responses,
       selected_packages, amount_due_paise)
    values
      (p_registration_id, p_event_id, p_user_id, p_status, p_razorpay_order_id,
       p_custom_responses, p_selected_packages, p_amount_due_paise);
  exception when unique_violation then
    return 'ALREADY_REGISTERED';
  end;

  return 'INSERTED';
end;
$$;

revoke all    on function public.register_for_event(text, text, text, text, text, text, text, int) from public;
revoke all    on function public.register_for_event(text, text, text, text, text, text, text, int) from anon;
revoke all    on function public.register_for_event(text, text, text, text, text, text, text, int) from authenticated;
grant  execute on function public.register_for_event(text, text, text, text, text, text, text, int) to service_role;

-- ═══ 4 ── approve_registrations: atomic, capacity-capped bulk approve ═══════
-- The cap MUST be enforced under the event row lock, not in TypeScript. A
-- "read the confirmed count, then update N rows" loop is exactly the race this
-- schema already closed twice (register_for_event and confirm_registration):
-- two admins hitting "Approve all" at the same instant would both see the same
-- remaining count and oversell the run.
--
-- Lock ordering vs confirm_registration (which takes the registration row
-- first, then the event row) is an inversion on paper. It cannot deadlock in
-- practice because the two functions touch disjoint rows: this one only ever
-- updates status='APPLIED' rows, confirm_registration only ever updates
-- status='PENDING' rows, and a row has exactly one status. The
-- `and er.status = 'APPLIED'` predicate below is what makes that true — do not
-- relax it.
--
-- Ordering: first-come-first-served by created_at, so the seat goes to whoever
-- applied earliest, deterministically, regardless of the order the client
-- happened to serialise its checkbox map into.
--
-- Returns one row per requested id:
--   'APPROVED' | 'ALREADY_CONFIRMED' | 'NOT_APPLIED' | 'CAPACITY_FULL'
--   | 'NOT_FOUND' | 'EVENT_NOT_FOUND' | 'EVENT_NOT_PUBLISHED' | 'EVENT_CONCLUDED'
--
-- Deliberately does NOT touch confirmation_email_sent_at — the app fires
-- sendConfirmationEmailOnce per approved id, and that column's atomic claim is
-- the single guard against a duplicate send.
create or replace function public.approve_registrations(
  p_event_id         text,
  p_registration_ids text[],
  p_decided_by       text
)
returns table (registration_id text, outcome text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_capacity  int;
  v_status    text;
  v_ends_at   timestamptz;
  v_confirmed int;
  v_remaining int;
  v_blocked   text;
begin
  if p_registration_ids is null or array_length(p_registration_ids, 1) is null then
    return;
  end if;

  select e.capacity, e.status, coalesce(e.end_date, e.event_date)
    into v_capacity, v_status, v_ends_at
  from public.events e
  where e.id = p_event_id
  for update;

  if not found then
    return query select unnest(p_registration_ids), 'EVENT_NOT_FOUND'::text;
    return;
  end if;

  -- Approving after the run happened would fire a selection email for an event
  -- that is over. The 24h grace matches the check-in window in
  -- src/lib/check-in.ts.
  v_blocked := case
    when v_status <> 'PUBLISHED' then 'EVENT_NOT_PUBLISHED'
    when v_ends_at is not null and v_ends_at < now() - interval '24 hours' then 'EVENT_CONCLUDED'
  end;

  if v_blocked is not null then
    return query select unnest(p_registration_ids), v_blocked;
    return;
  end if;

  -- Re-read under the lock. CONFIRMED (not "approved") is the right basis: an
  -- event that sold seats before the toggle went on must have those seats
  -- counted against the approval budget.
  select count(*) into v_confirmed
  from public.event_registrations
  where event_id = p_event_id and status = 'CONFIRMED';

  -- capacity IS NULL → unlimited, the same convention register_for_event uses.
  -- greatest(...,0) keeps an already-over-capacity event from going negative.
  v_remaining := case when v_capacity is null then null
                      else greatest(v_capacity - v_confirmed, 0) end;

  return query
  with wanted as (
    select er.id, er.status, er.created_at
    from public.event_registrations er
    where er.event_id = p_event_id
      and er.id = any (p_registration_ids)
  ),
  -- Ranked over the APPLIED subset only, so a stale CONFIRMED id in the input
  -- does not silently consume one of the remaining seats.
  ranked as (
    select id, row_number() over (order by created_at, id) as rn
    from wanted
    where status = 'APPLIED'
  ),
  promoted as (
    update public.event_registrations er
    set status     = 'CONFIRMED',
        decided_at = now(),
        decided_by = p_decided_by,
        updated_at = now()
    from ranked r
    where er.id     = r.id
      and er.status = 'APPLIED'
      and (v_remaining is null or r.rn <= v_remaining)
    returning er.id
  )
  select q.id,
         (case
            when p.id is not null       then 'APPROVED'
            when w.id is null           then 'NOT_FOUND'
            when w.status = 'CONFIRMED' then 'ALREADY_CONFIRMED'
            when w.status <> 'APPLIED'  then 'NOT_APPLIED'
            else 'CAPACITY_FULL'
          end)::text
  from (select distinct unnest(p_registration_ids) as id) q
  left join wanted   w on w.id = q.id
  left join promoted p on p.id = q.id;
end;
$$;

revoke all    on function public.approve_registrations(text, text[], text) from public;
revoke all    on function public.approve_registrations(text, text[], text) from anon;
revoke all    on function public.approve_registrations(text, text[], text) from authenticated;
grant  execute on function public.approve_registrations(text, text[], text) to service_role;

-- ═══ 5 ── Index ═════════════════════════════════════════════════════════════
-- Serves the CONFIRMED count inside approve_registrations, the applied-count
-- reads on /admin/events and /admin/registrations, and the applicant list.
-- er_event_selected_pkgs_idx from 2026-07-31 is also (event_id, status) but is
-- PARTIAL on `selected_packages is not null`, so it cannot serve these.
create index if not exists er_event_status_idx
  on public.event_registrations (event_id, status);

-- No index on events.invite_only, deliberately: nothing filters on it, and it
-- would select the vast majority of rows even if something did.
