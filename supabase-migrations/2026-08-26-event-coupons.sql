-- ─────────────────────────────────────────────────────────────────────────────
-- Coupon codes — run this whole file in the Supabase SQL Editor BEFORE
-- deploying the app code. Idempotent: safe to re-run.
--
-- What it does:
--   1. public.event_coupons — one row per code per event, with RLS enabled and
--      NO policies, so the anon/authenticated keys cannot enumerate codes.
--   2. events.coupons_enabled — the admin master switch, default false.
--   3. event_registrations.coupon_code / coupon_percent / discount_paise — the
--      snapshot of what was actually applied to a given registration.
--   4. Re-issues register_for_event with three new trailing params so the
--      snapshot is written in the SAME insert as the registration.
--
-- Semantics:
--   * A coupon takes a whole-number percent off the WHOLE total: the sum of the
--     selected packages, or events.price_paise for a standard-price event.
--   * The discounted figure is what lands in amount_due_paise, so verify-payment
--     and the Razorpay webhook — which both assert
--     captured_amount = amount_due_paise — keep working untouched.
--   * A 100% coupon drives the total to 0, and the register route's existing
--     free branch then confirms immediately without creating a Razorpay order.
--     There is no separate "free coupon" path to maintain.
--   * coupon_percent is SNAPSHOTTED, like selected_packages. Editing a coupon
--     later must never rewrite what an existing member was charged.
--   * No redemption caps. Revoking (active = false) is the control, and it bites
--     on the next attempt because the register route re-reads this table under
--     no cache. Redemptions are recorded per registration, so a cap can be added
--     later without a backfill.
--   * coupons_enabled defaults false, so NO existing event changes when this
--     lands, and any current run becomes couponable the moment an admin
--     switches it on.
--
-- ORDERING NOTE. Step 4 changes the function's SIGNATURE, which would otherwise
-- create an overload and make every call ambiguous. The old 8-arg version is
-- dropped first, and the three new params DEFAULT TO NULL — so the currently
-- deployed app, which calls with 8 named args, keeps working between running
-- this file and shipping the new code. That is what makes this safe to run
-- first. Same approach as 2026-07-30-event-packages-and-leaderboard.sql.
-- ─────────────────────────────────────────────────────────────────────────────

-- ═══ 1 ── event_coupons ═════════════════════════════════════════════════════
create table if not exists public.event_coupons (
  id          text primary key,
  event_id    text not null references public.events(id) on delete cascade,
  code        text not null,
  percent     int  not null check (percent between 1 and 100),
  active      boolean not null default true,
  created_by  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Case-insensitive uniqueness per event: STRIDE25 and stride25 are one coupon,
-- so a member typing either gets the same answer and an admin cannot
-- accidentally author two codes that look identical in the list.
create unique index if not exists event_coupons_event_code_key
  on public.event_coupons (event_id, upper(code));

-- No separate event_id index: the unique index above leads on event_id, so the
-- per-event lookups already use it.

-- RLS with NO policies, deliberately. This table is only ever read through
-- adminClient (service_role), which bypasses RLS. Leaving it enabled with no
-- policy is what stops anyone pulling the whole code list with the public anon
-- key — the "codes are secret" decision is enforced here, not in the UI.
alter table public.event_coupons enable row level security;

revoke all on public.event_coupons from anon;
revoke all on public.event_coupons from authenticated;

-- ═══ 2 ── events.coupons_enabled ════════════════════════════════════════════
-- NOT NULL DEFAULT false, matching registrations_closed: every existing event
-- stays exactly as it is, and the app never has to tell "false" from "never set".
alter table public.events
  add column if not exists coupons_enabled boolean not null default false;

-- ═══ 3 ── event_registrations: the applied snapshot ═════════════════════════
-- Nullable, because the overwhelming majority of registrations have no coupon
-- and NULL is the honest representation of that. No subtotal_paise column: it
-- is amount_due_paise + discount_paise, and a derivable column drifts.
alter table public.event_registrations
  add column if not exists coupon_code    text;
alter table public.event_registrations
  add column if not exists coupon_percent int;
alter table public.event_registrations
  add column if not exists discount_paise int;

-- ═══ 4 ── register_for_event: persist the coupon in the same insert ═════════
-- Based on the version in 2026-08-07-close-registrations.sql, NOT the copy in
-- supabase-schema.sql — that copy is stale and is missing the
-- registrations_closed guard below.
--
-- Only two things differ from 2026-08-07: the three new params, and the three
-- new columns in the normal-mode INSERT. Every guard, every return value and
-- the invite-only branch are unchanged.
drop function if exists public.register_for_event(text, text, text, text, text, text, text, int);

create or replace function public.register_for_event(
  p_registration_id   text,
  p_event_id          text,
  p_user_id           text,
  p_status            text,
  p_custom_responses  text,
  p_razorpay_order_id text default null,
  p_selected_packages text default null,
  p_amount_due_paise  int  default null,
  p_coupon_code       text default null,
  p_coupon_percent    int  default null,
  p_discount_paise    int  default null
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
  --   * the coupon columns are DISCARDED for the same reason: an application is
  --     free, so there is no total for a percentage to apply to, and recording
  --     one would put a discount on a receipt that never charged anything
  --   * amount_due 0 rather than NULL: NULL would let verify-payment fall back
  --     to events.price_paise, and 0 makes the receipt blocks render as free
  --     rather than as absent
  -- p_status is ignored here on purpose. If the toggle flipped between the
  -- route's read and this lock, the row is still recorded correctly.
  if v_invite_only then
    begin
      insert into public.event_registrations
        (id, event_id, user_id, status, razorpay_order_id, custom_responses,
         selected_packages, amount_due_paise,
         coupon_code, coupon_percent, discount_paise)
      values
        (p_registration_id, p_event_id, p_user_id, 'APPLIED', null,
         p_custom_responses, null, 0,
         null, null, null);
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
  --
  -- Note this counts SEATS, not money, so a coupon has no effect here: a
  -- discounted registration still holds exactly one spot in its tier.
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
       selected_packages, amount_due_paise,
       coupon_code, coupon_percent, discount_paise)
    values
      (p_registration_id, p_event_id, p_user_id, p_status, p_razorpay_order_id,
       p_custom_responses, p_selected_packages, p_amount_due_paise,
       p_coupon_code, p_coupon_percent, p_discount_paise);
  exception when unique_violation then
    return 'ALREADY_REGISTERED';
  end;

  return 'INSERTED';
end;
$$;

revoke all    on function public.register_for_event(text, text, text, text, text, text, text, int, text, int, int) from public;
revoke all    on function public.register_for_event(text, text, text, text, text, text, text, int, text, int, int) from anon;
revoke all    on function public.register_for_event(text, text, text, text, text, text, text, int, text, int, int) from authenticated;
grant  execute on function public.register_for_event(text, text, text, text, text, text, text, int, text, int, int) to service_role;

-- ═══ 5 ── Post-run checks ═══════════════════════════════════════════════════
-- Run these after the file. The first is the one that matters: TWO rows means
-- an overload survived and every registration will fail on an ambiguous call.
--
--   select oid::regprocedure from pg_proc where proname = 'register_for_event';
--   -- expect exactly one row, with 11 arguments
--
--   select relrowsecurity from pg_class where oid = 'public.event_coupons'::regclass;
--   -- expect true
--
--   select count(*) from pg_policies where tablename = 'event_coupons';
--   -- expect 0 — service_role bypasses RLS, everyone else gets nothing
