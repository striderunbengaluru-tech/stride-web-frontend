-- ─────────────────────────────────────────────────────────────────────────────
-- Manually close registrations — run this whole file in the Supabase SQL Editor
-- BEFORE deploying the app code. Idempotent: safe to re-run.
--
-- What it does:
--   1. events.registrations_closed — an admin switch that shuts new sign-ups
--      whether or not capacity has been reached.
--   2. Re-issues register_for_event with the guard read under the SAME event-row
--      lock that already guards capacity. THE SIGNATURE IS UNCHANGED, so no
--      overload is created and no DROP is required.
--
-- Semantics of registrations_closed:
--   * NEW registrations and NEW invite-only applications are refused. The public
--     event page reads exactly as it does at capacity — "This event is full."
--   * EXISTING registrations are untouched. A CONFIRMED runner keeps their spot,
--     their ticket and their wallet pass; an APPLIED runner keeps their
--     application and can still be approved.
--   * approve_registrations is deliberately NOT gated on this flag: closing
--     sign-ups is how an admin stops the inflow *so that* they can work through
--     the applications already in.
--   * confirm_registration is deliberately NOT gated either: someone who
--     reserved a PENDING seat and then paid must still be confirmed, otherwise
--     closing registrations mid-checkout would take money for no seat.
--   * Independent of capacity. Leaving it off preserves today's behaviour
--     exactly, so no existing event changes when this migration lands.
-- ─────────────────────────────────────────────────────────────────────────────

-- ═══ 1 ── events: the flag ══════════════════════════════════════════════════
-- NOT NULL DEFAULT false: every existing event stays open, and the app never
-- has to distinguish "false" from "never set".
alter table public.events
  add column if not exists registrations_closed boolean not null default false;

-- No index, deliberately: nothing filters on it, and the listing pages already
-- select the whole row for the events they render.

-- ═══ 2 ── register_for_event: refuse new rows while closed ══════════════════
-- SIGNATURE UNCHANGED — a pure CREATE OR REPLACE, no overload, no drop. Only
-- the new v_reg_closed read and the guard below differ from the version in
-- 2026-08-06-invite-only-events.sql.
--
-- The flag is read under the same FOR UPDATE lock as capacity and invite_only,
-- so an admin closing the event mid-flight cannot be raced: whatever the route
-- believed when it read the event a moment ago, this is authoritative.
--
-- The guard sits BEFORE the invite-only branch on purpose — "closed" has to
-- mean closed for applications too, or an invite-only event could never be
-- shut off before its date.
--
-- Returns, in addition to the existing values:
--   'REGISTRATIONS_CLOSED' → the admin has closed sign-ups. Distinct from
--                            CAPACITY_FULL so the route can tell an operator
--                            decision apart from a sold-out run in its logs,
--                            even though both read as "full" to the runner.
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
  v_reg_closed  boolean;
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
  select capacity, packages, coalesce(invite_only, false), coalesce(registrations_closed, false)
    into v_capacity, v_packages, v_invite_only, v_reg_closed
  from public.events
  where id = p_event_id
  for update;

  if not found then
    return 'EVENT_NOT_FOUND';
  end if;

  -- ── Admin has closed sign-ups ────────────────────────────────────────────
  -- Before every other branch: nothing new gets in, priced or free, ticket or
  -- application. Rows already in the table are not touched by this function at
  -- all, which is what makes closing safe on a live event.
  if v_reg_closed then
    return 'REGISTRATIONS_CLOSED';
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
