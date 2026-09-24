-- ─────────────────────────────────────────────────────────────────────────────
-- Drop the separate "km this year" board — run in the Supabase SQL Editor
-- AFTER the app deploy that removes the km tab (the old build still calls
-- these). Idempotent: safe to re-run.
--
-- The leaderboard no longer has a km tab: each athlete's Strava km now sits
-- beside their name on the runs board, read straight from strava_connections
-- (see getYtdDistanceByUsername in src/lib/strava/data.ts). Nothing calls these
-- two functions from 2026-09-23-strava-integration.sql any more, and the index
-- existed only to serve their ORDER BY.
-- ─────────────────────────────────────────────────────────────────────────────

drop function if exists public.leaderboard_km_top(int);
drop function if exists public.leaderboard_km_rank_for(text);
drop index if exists public.strava_connections_ytd_idx;
