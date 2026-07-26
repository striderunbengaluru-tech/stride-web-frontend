-- ─────────────────────────────────────────────────────────────────────────────
-- Razorpay payment hardening — run this whole file in the Supabase SQL Editor.
-- Idempotent: safe to re-run.
--
-- What it does:
--   1. Adds event_registrations.amount_paid_paise — the amount actually captured
--      by Razorpay (server-verified), so the amount shown on the confirmation
--      page / email is DB-sourced and can never be spoofed from the client.
--   2. Updates register_for_event so an in-checkout PENDING hold reserves a seat
--      for 15 minutes (abandoned holds lazily expire → no cron, no oversell).
--   3. Adds confirm_registration — the single atomic, capacity-guarded confirm
--      path used by BOTH the verify-payment route and the Razorpay webhook.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1 ── amount actually captured (nullable: free regs and unpaid PENDING stay null)
alter table public.event_registrations
  add column if not exists amount_paid_paise int;

-- 2 ── Seat reservation during checkout.
-- Capacity now counts CONFIRMED registrations PLUS fresh PENDING holds (created
-- within the last 15 minutes), so a seat is held the moment checkout opens and
-- freed automatically if the payer abandons. The SELECT ... FOR UPDATE row lock
-- still serializes concurrent registrations (CWE-362 fix) — unchanged.
create or replace function public.register_for_event(
  p_registration_id   text,
  p_event_id          text,
  p_user_id           text,
  p_status            text,
  p_custom_responses  text,
  p_razorpay_order_id text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_capacity  int;
  v_reserved  int;
begin
  select capacity into v_capacity
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

  insert into public.event_registrations
    (id, event_id, user_id, status, razorpay_order_id, custom_responses)
  values
    (p_registration_id, p_event_id, p_user_id, p_status, p_razorpay_order_id, p_custom_responses);

  return 'INSERTED';
end;
$$;

revoke all    on function public.register_for_event(text, text, text, text, text, text) from public;
revoke all    on function public.register_for_event(text, text, text, text, text, text) from anon;
revoke all    on function public.register_for_event(text, text, text, text, text, text) from authenticated;
grant  execute on function public.register_for_event(text, text, text, text, text, text) to service_role;

-- 3 ── Atomic, capacity-guarded confirmation.
-- Confirms a PENDING registration only if a seat is still available, in the same
-- SELECT ... FOR UPDATE transaction as the capacity check — so even the rare
-- "paid after the 15-min hold expired and the seat was taken" case can never
-- oversell. Records the server-verified captured amount + Razorpay payment id.
-- Returns:
--   'CONFIRMED'         → this call confirmed the registration
--   'ALREADY_CONFIRMED' → a prior call (webhook/verify-payment) already did
--   'CAPACITY_FULL'     → event filled while payment was in flight (do NOT confirm)
--   'NOT_FOUND' / 'NOT_PENDING' → registration missing or not in a confirmable state
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
  v_confirmed int;
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
  if v_status <> 'PENDING' then
    return 'NOT_PENDING';
  end if;

  select capacity into v_capacity
  from public.events
  where id = v_event_id
  for update;

  if v_capacity is not null then
    select count(*) into v_confirmed
    from public.event_registrations
    where event_id = v_event_id and status = 'CONFIRMED';

    if v_confirmed >= v_capacity then
      return 'CAPACITY_FULL';
    end if;
  end if;

  update public.event_registrations
  set status            = 'CONFIRMED',
      razorpay_payment_id = p_razorpay_payment_id,
      amount_paid_paise = p_amount_paid_paise,
      updated_at        = now()
  where id = p_registration_id;

  return 'CONFIRMED';
end;
$$;

revoke all    on function public.confirm_registration(text, text, int) from public;
revoke all    on function public.confirm_registration(text, text, int) from anon;
revoke all    on function public.confirm_registration(text, text, int) from authenticated;
grant  execute on function public.confirm_registration(text, text, int) to service_role;
