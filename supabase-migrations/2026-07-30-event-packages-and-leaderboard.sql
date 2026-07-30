-- ─────────────────────────────────────────────────────────────────────────────
-- Event packages + leaderboard ranking — run this whole file in the Supabase
-- SQL Editor BEFORE deploying the app code. Idempotent: safe to re-run.
--
-- What it does:
--   1. Adds the events.packages_* columns so an event can offer priced tiers
--      instead of a single fixed price, and adds the two event_registrations
--      columns that record WHAT was bought and the server-computed total due.
--   2. Extends register_for_event to persist those two columns.
--   3. Adds leaderboard_top / leaderboard_rank_for, which move the board's
--      ranking into Postgres so a page render reads 50 rows instead of every
--      users row plus every confirmed check-in.
-- ─────────────────────────────────────────────────────────────────────────────

-- ═══ 1 ── Event packages ════════════════════════════════════════════════════
-- `packages` holds a JSON *string* (not jsonb), matching additional_fields /
-- banner_images / custom_responses — every reader in the app JSON.parse()s text.
-- packages_enabled is a separate flag rather than "is the array non-empty" so an
-- admin can switch packages off without losing what they authored.
alter table public.events
  add column if not exists packages              text    not null default '[]',
  add column if not exists packages_enabled      boolean not null default false,
  add column if not exists packages_multi_select boolean not null default false;

-- selected_packages: snapshot of the chosen packages at registration time, so a
--   later admin price edit can't rewrite someone's receipt.
-- amount_due_paise: the authoritative total this registration must pay. Needed
--   because verify-payment can no longer re-derive the expected amount from
--   events.price_paise once the charge is a per-registration package sum.
-- Both nullable: free events, non-package events and pre-existing rows stay null
-- and fall back to events.price_paise.
alter table public.event_registrations
  add column if not exists selected_packages text,
  add column if not exists amount_due_paise  int;

-- ═══ 2 ── register_for_event: persist the package snapshot + total ══════════
-- NOTE ON THE OVERLOAD: adding parameters creates a NEW function — `create or
-- replace` cannot change a signature. Leaving both versions in place makes every
-- call ambiguous ("function name is not unique"), so the old 6-arg version MUST
-- be dropped. That drop is safe for the currently deployed code, which calls
-- with 5 named args: the 8-arg version satisfies those calls via its defaults.
-- Hence: run this file first, deploy after. No downtime, no failed writes.
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
    (id, event_id, user_id, status, razorpay_order_id, custom_responses,
     selected_packages, amount_due_paise)
  values
    (p_registration_id, p_event_id, p_user_id, p_status, p_razorpay_order_id,
     p_custom_responses, p_selected_packages, p_amount_due_paise);

  return 'INSERTED';
end;
$$;

drop function if exists public.register_for_event(text, text, text, text, text, text);

revoke all    on function public.register_for_event(text, text, text, text, text, text, text, int) from public;
revoke all    on function public.register_for_event(text, text, text, text, text, text, text, int) from anon;
revoke all    on function public.register_for_event(text, text, text, text, text, text, text, int) from authenticated;
grant  execute on function public.register_for_event(text, text, text, text, text, text, text, int) to service_role;

-- ═══ 3 ── Leaderboard: rank in Postgres, not in Node ════════════════════════
-- Ordering mirrors the JS compare() this replaces, exactly:
--   1. runs_completed desc
--   2. among ties, the athlete who reached that total FIRST ranks higher, where
--      "reached_at" is their most recent confirmed check-in
--   3. athletes with no check-ins sort last within their tie — that's what
--      `nulls last` reproduces (the old `if (at) return -1` branches)
--   4. then username, so the order is stable
-- total_athletes uses count(*) over () INSIDE the CTE, so it counts every
-- athlete and is computed before the outer LIMIT.

create or replace function public.leaderboard_top(p_limit int default 50)
returns table (
  username       text,
  full_name      text,
  avatar_url     text,
  runs_completed int,
  profile_public boolean,
  total_athletes bigint
)
language sql
stable
security definer
set search_path = public
as $$
  -- user_id is cast to text because this repo's schema file has drifted and the
  -- declared types of users.id and event_registrations.user_id don't reliably
  -- agree (text vs uuid). An uncast join would fail outright with "operator does
  -- not exist: uuid = text"; ::text on both sides is correct either way, and the
  -- row counts here are small enough that losing index usage doesn't matter.
  with reached as (
    select user_id::text as user_id, max(checked_in_at) as reached_at
    from public.event_registrations
    where status = 'CONFIRMED' and checked_in_at is not null
    group by user_id::text
  ),
  ranked as (
    select u.username,
           u.full_name,
           u.avatar_url,
           u.runs_completed,
           u.profile_public,
           row_number() over (
             order by u.runs_completed desc, r.reached_at asc nulls last, u.username asc
           ) as rn,
           count(*) over () as total_athletes
    from public.users u
    left join reached r on r.user_id = u.id::text
  )
  select username, full_name, avatar_url, runs_completed, profile_public, total_athletes
  from ranked
  where rn <= p_limit
  order by rn;
$$;

-- The viewer's own position. Returns zero rows if the user doesn't exist, which
-- the caller treats as "not ranked".
create or replace function public.leaderboard_rank_for(p_user_id text)
returns table (
  rank           bigint,
  total_athletes bigint,
  runs_completed int,
  username       text,
  full_name      text,
  avatar_url     text
)
language sql
stable
security definer
set search_path = public
as $$
  -- user_id is cast to text because this repo's schema file has drifted and the
  -- declared types of users.id and event_registrations.user_id don't reliably
  -- agree (text vs uuid). An uncast join would fail outright with "operator does
  -- not exist: uuid = text"; ::text on both sides is correct either way, and the
  -- row counts here are small enough that losing index usage doesn't matter.
  with reached as (
    select user_id::text as user_id, max(checked_in_at) as reached_at
    from public.event_registrations
    where status = 'CONFIRMED' and checked_in_at is not null
    group by user_id::text
  ),
  ranked as (
    select u.id,
           u.username,
           u.full_name,
           u.avatar_url,
           u.runs_completed,
           row_number() over (
             order by u.runs_completed desc, r.reached_at asc nulls last, u.username asc
           ) as rank,
           count(*) over () as total_athletes
    from public.users u
    left join reached r on r.user_id = u.id::text
  )
  select rank, total_athletes, runs_completed, username, full_name, avatar_url
  from ranked
  where id = p_user_id;
$$;

revoke all    on function public.leaderboard_top(int) from public;
revoke all    on function public.leaderboard_top(int) from anon;
revoke all    on function public.leaderboard_top(int) from authenticated;
grant  execute on function public.leaderboard_top(int) to service_role;

revoke all    on function public.leaderboard_rank_for(text) from public;
revoke all    on function public.leaderboard_rank_for(text) from anon;
revoke all    on function public.leaderboard_rank_for(text) from authenticated;
grant  execute on function public.leaderboard_rank_for(text) to service_role;

-- Supports the `reached` aggregate above on the fastest-growing table.
create index if not exists er_checkin_user_idx
  on public.event_registrations (user_id, checked_in_at)
  where status = 'CONFIRMED' and checked_in_at is not null;
