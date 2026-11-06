-- ─────────────────────────────────────────────────────────────────────────────
-- Paid invite-only events — run this whole file in the Supabase SQL Editor
-- BEFORE deploying the app code. Idempotent: safe to re-run.
--
-- What it does:
--   1. Widens event_registrations.status with AWAITING_PAYMENT.
--   2. Adds payment_due_email_sent_at, the once-only claim for the
--      "selected, pay to confirm" mail.
--   3. approve_registrations: a paid event's approval lands on AWAITING_PAYMENT
--      with the price snapshotted into amount_due_paise. A free one confirms,
--      exactly as before.
--   4. confirm_registration: also confirms AWAITING_PAYMENT rows. Their seat is
--      already held, so they skip the capacity check.
--   5. register_for_event: AWAITING_PAYMENT rows hold a seat.
--
-- AWAITING_PAYMENT holds a seat indefinitely. There is no expiry: an admin
-- revokes an unpaid approval by hand (revokeApprovalsAction), which moves the
-- row back to APPLIED.
-- ─────────────────────────────────────────────────────────────────────────────

-- ═══ 1 ── status check ═══════════════════════════════════════════════════════
-- Named by 2026-08-06-invite-only-events.sql, so it can be dropped by name.
alter table public.event_registrations drop constraint if exists event_registrations_status_check;
alter table public.event_registrations
  add constraint event_registrations_status_check
  check (status in ('PENDING', 'CONFIRMED', 'CANCELLED', 'APPLIED', 'REJECTED', 'AWAITING_PAYMENT'));

-- ═══ 2 ── payment-due mail claim ═════════════════════════════════════════════
-- Same pattern as confirmation_email_sent_at: a conditional UPDATE on a null
-- column is the atomic "send exactly once" guard.
alter table public.event_registrations add column if not exists payment_due_email_sent_at timestamptz;

-- ═══ 3 ── approve_registrations ══════════════════════════════════════════════
-- Lock ordering vs confirm_registration is still safe: this function only ever
-- updates status='APPLIED' rows, and confirm_registration only takes the event
-- lock on its PENDING path. The AWAITING_PAYMENT path locks the registration
-- row alone. Do not relax `and er.status = 'APPLIED'` below.
--
-- Returns one row per requested id:
--   'APPROVED' (free, now CONFIRMED) | 'APPROVED_PAYMENT_DUE' (paid, now
--   AWAITING_PAYMENT) | 'ALREADY_CONFIRMED' | 'NOT_APPLIED' | 'CAPACITY_FULL'
--   | 'NOT_FOUND' | 'EVENT_NOT_FOUND' | 'EVENT_NOT_PUBLISHED' | 'EVENT_CONCLUDED'
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
  v_price     int;
  v_held      int;
  v_remaining int;
  v_blocked   text;
begin
  if p_registration_ids is null or array_length(p_registration_ids, 1) is null then
    return;
  end if;

  select e.capacity, e.status, coalesce(e.end_date, e.event_date), coalesce(e.price_paise, 0)
    into v_capacity, v_status, v_ends_at, v_price
  from public.events e
  where e.id = p_event_id
  for update;

  if not found then
    return query select unnest(p_registration_ids), 'EVENT_NOT_FOUND'::text;
    return;
  end if;

  v_blocked := case
    when v_status <> 'PUBLISHED' then 'EVENT_NOT_PUBLISHED'
    when v_ends_at is not null and v_ends_at < now() - interval '24 hours' then 'EVENT_CONCLUDED'
  end;

  if v_blocked is not null then
    return query select unnest(p_registration_ids), v_blocked;
    return;
  end if;

  -- An unpaid approval holds its seat, so it counts against the budget exactly
  -- like a confirmed one.
  select count(*) into v_held
  from public.event_registrations
  where event_id = p_event_id and status in ('CONFIRMED', 'AWAITING_PAYMENT');

  v_remaining := case when v_capacity is null then null
                      else greatest(v_capacity - v_held, 0) end;

  return query
  with wanted as (
    select er.id, er.status, er.created_at
    from public.event_registrations er
    where er.event_id = p_event_id
      and er.id = any (p_registration_ids)
  ),
  ranked as (
    select id, row_number() over (order by created_at, id) as rn
    from wanted
    where status = 'APPLIED'
  ),
  -- Price is snapshotted here, under the event lock: a later edit to the
  -- event's price must not change what an approved runner was told to pay.
  promoted as (
    update public.event_registrations er
    set status           = case when v_price > 0 then 'AWAITING_PAYMENT' else 'CONFIRMED' end,
        amount_due_paise = v_price,
        decided_at       = now(),
        decided_by       = p_decided_by,
        updated_at       = now()
    from ranked r
    where er.id     = r.id
      and er.status = 'APPLIED'
      and (v_remaining is null or r.rn <= v_remaining)
    returning er.id
  )
  select q.id,
         (case
            when p.id is not null and v_price > 0 then 'APPROVED_PAYMENT_DUE'
            when p.id is not null                 then 'APPROVED'
            when w.id is null                     then 'NOT_FOUND'
            when w.status = 'CONFIRMED'           then 'ALREADY_CONFIRMED'
            when w.status <> 'APPLIED'            then 'NOT_APPLIED'
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

-- ═══ 4 ── confirm_registration ═══════════════════════════════════════════════
-- Still the single PENDING/AWAITING_PAYMENT → CONFIRMED transition, called by
-- both verify-payment and the Razorpay webhook. Still idempotent.
create or replace function public.confirm_registration(
  p_registration_id     text,
  p_razorpay_payment_id text,
  p_amount_paid_paise   int
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id  text;
  v_status    text;
  v_capacity  int;
  v_held      int;
begin
  select event_id, status into v_event_id, v_status
  from public.event_registrations
  where id = p_registration_id
  for update;

  if not found then
    return 'NOT_FOUND';
  end if;
  if v_status = 'CONFIRMED' then
    return 'ALREADY_CONFIRMED';
  end if;
  if v_status not in ('PENDING', 'AWAITING_PAYMENT') then
    return 'NOT_PENDING';
  end if;

  -- An approved runner's seat was reserved at approval, so there is nothing to
  -- re-check — and refusing here would strand money that was already taken.
  if v_status = 'PENDING' then
    select capacity into v_capacity
    from public.events
    where id = v_event_id
    for update;

    if v_capacity is not null then
      select count(*) into v_held
      from public.event_registrations
      where event_id = v_event_id and status in ('CONFIRMED', 'AWAITING_PAYMENT');

      if v_held >= v_capacity then
        return 'CAPACITY_FULL';
      end if;
    end if;
  end if;

  update public.event_registrations
  set status              = 'CONFIRMED',
      razorpay_payment_id = p_razorpay_payment_id,
      amount_paid_paise   = p_amount_paid_paise,
      updated_at          = now()
  where id = p_registration_id;

  return 'CONFIRMED';
end;
$$;

revoke all    on function public.confirm_registration(text, text, int) from public;
revoke all    on function public.confirm_registration(text, text, int) from anon;
revoke all    on function public.confirm_registration(text, text, int) from authenticated;
grant  execute on function public.confirm_registration(text, text, int) to service_role;

-- ═══ 5 ── register_for_event: AWAITING_PAYMENT holds a seat ════════════════
-- Copied verbatim from 2026-08-26-event-coupons.sql; the ONLY change is the two
-- reserved-seat predicates, which now count AWAITING_PAYMENT. Signature unchanged.
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
        status in ('CONFIRMED', 'AWAITING_PAYMENT')
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
                  status in ('CONFIRMED', 'AWAITING_PAYMENT')
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
