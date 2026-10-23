-- ─────────────────────────────────────────────────────────────────────────────
-- Event ownership by role — run this in the Supabase SQL Editor BEFORE deploying
-- the app code (the admin Events tab, the event actions and the image routes
-- read or write this column and fail until it exists). Idempotent: safe to
-- re-run.
--
-- What it does:
--   events.owner_role — the role of whoever created the event, stamped once at
--   creation and never changed. A LEAD may see and manage only events whose
--   owner_role is LEAD; an ADMIN manages every event. Every existing event is
--   admin-created, so the default backfills them all to ADMIN and leads start
--   with nothing to touch.
--
-- Why a role and not a user id: `created_by` is a display-name snapshot (it has
-- to survive hardDeleteUser erasing the users row), so it can't say who owns an
-- event. The rule is per role, not per person — any lead may manage any
-- lead-created event — so the role is all that needs storing.
--
-- RLS is untouched: events are only written by server actions using the
-- service-role client after their own role check.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.events
  add column if not exists owner_role text not null default 'ADMIN';

alter table public.events drop constraint if exists events_owner_role_check;
alter table public.events
  add constraint events_owner_role_check check (owner_role in ('ADMIN', 'LEAD'));

comment on column public.events.owner_role is
  'Role of the creator, stamped at creation. LEAD events are the only ones a LEAD may see or manage.';

-- The Events tab filters on it for every lead page load.
create index if not exists events_owner_role_idx on public.events (owner_role);
