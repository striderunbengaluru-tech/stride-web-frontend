-- ─────────────────────────────────────────────────────────────────────────────
-- Marketing email opt-in — run this in the Supabase SQL Editor BEFORE deploying
-- the app code (the event viewer-state route, the register route, the profile
-- update route and /api/email/unsubscribe all read or write these columns and
-- fail until they exist). Idempotent: safe to re-run.
--
-- What it does:
--   1. public.users.marketing_opt_in — whether the member has affirmatively
--      agreed to emails about other Stride runs and partner events. Defaults to
--      false for everyone, existing rows included: consent to marketing mail is
--      never assumed (DPDP s.6), so nobody is opted in by this migration.
--   2. public.users.marketing_opt_in_at — when that consent was last given.
--      Cleared on opt-out, so a non-null value always means "consented, at".
--   3. A partial index for the promo send scripts, which select only opted-in
--      members.
--
-- users.id is TEXT, not uuid — nothing here joins on it, but any policy added
-- later must compare against auth.uid()::text.
--
-- RLS is untouched: the columns ride on the existing users policies, and every
-- writer is a server route using the service-role client after its own check.
-- ─────────────────────────────────────────────────────────────────────────────

-- ═══ 1 + 2 ── Columns ════════════════════════════════════════════════════════
alter table public.users
  add column if not exists marketing_opt_in    boolean     not null default false,
  add column if not exists marketing_opt_in_at timestamptz;

comment on column public.users.marketing_opt_in is
  'Affirmative consent to marketing email (other runs, partner events). Never defaulted on.';
comment on column public.users.marketing_opt_in_at is
  'When marketing consent was last given; null when not opted in.';

-- ═══ 3 ── Index ══════════════════════════════════════════════════════════════
create index if not exists users_marketing_opt_in_idx
  on public.users (id)
  where marketing_opt_in;
