-- ─────────────────────────────────────────────────────────────────────────────
-- Test events must not count as runs — run this whole file in the Supabase SQL
-- Editor. Idempotent: safe to re-run.
--
-- Background: `events.is_test_event` marks a staging-only rehearsal. Checking a
-- runner in to one is a deliberate exercise of the real flow, but it was
-- crediting `users.runs_completed`, which drives both the leaderboard and the
-- milestone tier. So a rehearsal moved people up the board.
--
-- The app code now skips the increment (see src/lib/check-in.ts and
-- src/app/api/events/check-in/route.ts). This file does the other two halves:
--   1. Repairs the totals already inflated by test check-ins.
--   2. Teaches the leaderboard's tiebreak to ignore test events too.
--
-- ORDER: run section 1 before deploying, or a fresh test check-in could land
-- between the repair and the deploy and re-inflate a total.
-- ─────────────────────────────────────────────────────────────────────────────

-- ═══ 1 ── Repair runs_completed ══════════════════════════════════════════════
-- runs_completed is a denormalised counter, so it is recomputed from the source
-- of truth: CONFIRMED registrations that were checked in to a NON-test event.
--
-- Inspect first — this shows every user whose stored total disagrees with the
-- recomputed one, and is safe to run on its own:
--
--   with actual as (
--     select u.id, u.username, u.runs_completed as stored,
--            count(er.id) as recomputed
--     from public.users u
--     left join public.event_registrations er
--       on er.user_id::text = u.id::text
--      and er.status = 'CONFIRMED'
--      and er.checked_in_at is not null
--     left join public.events e
--       on e.id = er.event_id
--      and coalesce(e.is_test_event, false) = false
--     where er.id is null or e.id is not null
--     group by u.id, u.username, u.runs_completed
--   )
--   select * from actual where stored <> recomputed order by username;

-- The repair itself. user_id/id are cast to text because this repo's schema file
-- has drifted and the declared types don't reliably agree (text vs uuid) — ::text
-- on both sides is correct either way, and these row counts are small.
with recomputed as (
  select u.id,
         (
           select count(*)
           from public.event_registrations er
           join public.events e on e.id = er.event_id
           where er.user_id::text = u.id::text
             and er.status = 'CONFIRMED'
             and er.checked_in_at is not null
             and coalesce(e.is_test_event, false) = false
         ) as runs
  from public.users u
)
update public.users u
set runs_completed = r.runs,
    updated_at     = now()
from recomputed r
where r.id = u.id
  and u.runs_completed <> r.runs;

-- Verify (expect zero rows):
--   select username, runs_completed from public.users
--   where runs_completed <> (
--     select count(*) from public.event_registrations er
--     join public.events e on e.id = er.event_id
--     where er.user_id::text = users.id::text
--       and er.status = 'CONFIRMED' and er.checked_in_at is not null
--       and coalesce(e.is_test_event, false) = false
--   );

-- ═══ 2 ── Leaderboard: ignore test events in the tiebreak ═══════════════════
-- Both functions rank primarily by users.runs_completed, which section 1 and the
-- app change now keep test-free. The secondary key — "whoever reached that total
-- first ranks higher", taken from the most recent confirmed check-in — still read
-- test check-ins, so a rehearsal could reorder tied athletes. Same `reached` CTE
-- in both, now joined to events and filtered.
--
-- Everything else is unchanged from
-- supabase-migrations/2026-07-30-event-packages-and-leaderboard.sql.

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
  with reached as (
    select er.user_id::text as user_id, max(er.checked_in_at) as reached_at
    from public.event_registrations er
    join public.events e on e.id = er.event_id
    where er.status = 'CONFIRMED'
      and er.checked_in_at is not null
      and coalesce(e.is_test_event, false) = false
    group by er.user_id::text
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
  with reached as (
    select er.user_id::text as user_id, max(er.checked_in_at) as reached_at
    from public.event_registrations er
    join public.events e on e.id = er.event_id
    where er.status = 'CONFIRMED'
      and er.checked_in_at is not null
      and coalesce(e.is_test_event, false) = false
    group by er.user_id::text
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

-- Supports the events join the `reached` CTE now does.
create index if not exists events_is_test_event_idx
  on public.events (is_test_event);
