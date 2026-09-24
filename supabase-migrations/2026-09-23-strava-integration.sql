-- ─────────────────────────────────────────────────────────────────────────────
-- Strava integration — run this whole file in the Supabase SQL Editor BEFORE
-- deploying the app code. Idempotent: safe to re-run.
--
-- What it does:
--   1. Drops the orphaned columns a previous, never-finished Strava attempt and
--      the retired avatar toggle left on `users` (most likely never created —
--      `drop column if exists` makes that a no-op).
--   2. `strava_connections` — one row per linked athlete: encrypted OAuth
--      tokens plus the year-to-date run totals that drive the km leaderboard.
--   3. `strava_activities` — the latest 5 public runs per athlete, for the
--      profile cards. Nothing older is kept.
--   4. `leaderboard_km_top` / `leaderboard_km_rank_for` — the "km this year"
--      board, mirroring leaderboard_top / leaderboard_rank_for.
--
-- Both tables have RLS enabled with NO policies: anon/authenticated can read
-- nothing, and only the service role (adminClient, server-only) touches them.
-- Tokens are AES-256-GCM encrypted by the app before they get here
-- (src/lib/strava/crypto.ts), so even a service-role leak doesn't yield
-- usable Strava credentials without STRIDE_STRAVA_TOKEN_KEY.
--
-- Rollback:
--   drop function if exists public.leaderboard_km_top(int);
--   drop function if exists public.leaderboard_km_rank_for(text);
--   drop table if exists public.strava_activities;
--   drop table if exists public.strava_connections;
-- ─────────────────────────────────────────────────────────────────────────────

-- ═══ 1 ── Clean up orphaned users columns ════════════════════════════════════
-- Inspect first (safe on its own) — shows which of these actually exist:
--
--   select column_name from information_schema.columns
--   where table_schema = 'public' and table_name = 'users'
--     and column_name in ('strava_connected', 'strava_pbs',
--                         'strava_recent_activities', 'strava_synced_at',
--                         'avatar_public');
--
-- users.strava_url is KEPT: it's the manual "my Strava profile" link on the
-- profile header, independent of the OAuth connection.
alter table public.users
  drop column if exists strava_connected,
  drop column if exists strava_pbs,
  drop column if exists strava_recent_activities,
  drop column if exists strava_synced_at,
  drop column if exists avatar_public;

-- ═══ 2 ── strava_connections ═════════════════════════════════════════════════
create table if not exists public.strava_connections (
  user_id            text primary key references public.users(id) on delete cascade,
  -- One Strava account can back exactly one Stride member, so nobody can
  -- count the same kilometres twice on the board.
  athlete_id         bigint not null unique,
  access_token_enc   text not null,
  refresh_token_enc  text not null,
  token_expires_at   timestamptz not null,
  scope              text not null,
  -- From Strava's /athletes/{id}/stats ytd_run_totals.
  ytd_run_distance_m integer not null default 0,
  ytd_run_count      integer not null default 0,
  -- The (IST) year the ytd_* values belong to. The board only counts rows for
  -- the current year, so a total that hasn't re-synced since 31 Dec can't
  -- linger into January.
  ytd_year           smallint not null,
  connected_at       timestamptz not null default now(),
  last_synced_at     timestamptz
);

create index if not exists strava_connections_ytd_idx
  on public.strava_connections (ytd_year, ytd_run_distance_m desc);

alter table public.strava_connections enable row level security;
revoke all on public.strava_connections from anon, authenticated;

-- ═══ 3 ── strava_activities ══════════════════════════════════════════════════
create table if not exists public.strava_activities (
  id               bigint primary key,            -- Strava activity id
  user_id          text not null references public.users(id) on delete cascade,
  name             text not null,
  sport_type       text not null,
  start_date       timestamptz not null,          -- UTC
  utc_offset_s     integer not null default 0,    -- the run's local start time = start_date + offset
  distance_m       integer not null,
  moving_time_s    integer not null,
  elapsed_time_s   integer not null,
  elevation_gain_m numeric(7,1) not null default 0,
  summary_polyline text,                          -- null for treadmill / indoor runs
  synced_at        timestamptz not null default now()
);

create index if not exists strava_activities_user_start_idx
  on public.strava_activities (user_id, start_date desc);

alter table public.strava_activities enable row level security;
revoke all on public.strava_activities from anon, authenticated;

-- ═══ 4 ── Km leaderboard ═════════════════════════════════════════════════════
-- Same shape and privileges as leaderboard_top / leaderboard_rank_for
-- (supabase-migrations/2026-07-31-test-events-dont-count.sql). runs_completed
-- comes along only so the board can show each athlete's milestone tier.
-- Ties on distance break by username so the order is stable.

create or replace function public.leaderboard_km_top(p_limit int default 50)
returns table (
  username           text,
  full_name          text,
  avatar_url         text,
  runs_completed     int,
  profile_public     boolean,
  ytd_run_distance_m int,
  total_athletes     bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with ranked as (
    select u.username,
           u.full_name,
           u.avatar_url,
           u.runs_completed,
           u.profile_public,
           sc.ytd_run_distance_m,
           row_number() over (order by sc.ytd_run_distance_m desc, u.username asc) as rn,
           count(*) over () as total_athletes
    from public.strava_connections sc
    join public.users u on u.id = sc.user_id
    where sc.ytd_year = extract(year from (now() at time zone 'Asia/Kolkata'))::int
      and sc.ytd_run_distance_m > 0
  )
  select username, full_name, avatar_url, runs_completed, profile_public,
         ytd_run_distance_m, total_athletes
  from ranked
  where rn <= p_limit
  order by rn;
$$;

create or replace function public.leaderboard_km_rank_for(p_user_id text)
returns table (
  rank               bigint,
  total_athletes     bigint,
  ytd_run_distance_m int,
  runs_completed     int,
  username           text,
  full_name          text,
  avatar_url         text
)
language sql
stable
security definer
set search_path = public
as $$
  with ranked as (
    select sc.user_id,
           u.username,
           u.full_name,
           u.avatar_url,
           u.runs_completed,
           sc.ytd_run_distance_m,
           row_number() over (order by sc.ytd_run_distance_m desc, u.username asc) as rank,
           count(*) over () as total_athletes
    from public.strava_connections sc
    join public.users u on u.id = sc.user_id
    where sc.ytd_year = extract(year from (now() at time zone 'Asia/Kolkata'))::int
      and sc.ytd_run_distance_m > 0
  )
  select rank, total_athletes, ytd_run_distance_m, runs_completed,
         username, full_name, avatar_url
  from ranked
  where user_id = p_user_id;
$$;

revoke all on function public.leaderboard_km_top(int)       from public, anon, authenticated;
revoke all on function public.leaderboard_km_rank_for(text) from public, anon, authenticated;
grant execute on function public.leaderboard_km_top(int)       to service_role;
grant execute on function public.leaderboard_km_rank_for(text) to service_role;

-- ═══ Verify ══════════════════════════════════════════════════════════════════
--   select relname, relrowsecurity from pg_class
--   where relname in ('strava_connections', 'strava_activities');   -- both true
--   select * from public.leaderboard_km_top(50);                     -- empty until someone connects
