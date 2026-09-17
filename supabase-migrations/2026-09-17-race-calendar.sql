-- ─────────────────────────────────────────────────────────────────────────────
-- Race calendar — run this whole file in the Supabase SQL Editor BEFORE
-- deploying the app code. Idempotent: safe to re-run.
--
-- What it does:
--   1. public.races — third-party races (Bengaluru 10K, TMM, …) curated by
--      admins and listed at /race-calendar. Separate from public.events on
--      purpose: a race has no registrations, payments, capacity or check-in.
--      It is a signpost to someone else's registration page.
--   2. RLS: anon/authenticated may read PUBLISHED rows only. Every write goes
--      through adminClient (service_role), which bypasses RLS. auth.uid() is
--      NULL inside those writes, so an "Admins can manage races" policy would
--      never match and is deliberately not written — same reasoning as
--      2026-08-26-event-coupons.sql.
--   3. Indexes for the two real access paths, and the shared set_updated_at()
--      trigger so updated_at is maintained by the database, not the action.
--
-- Semantics:
--   * race_date is a timestamptz instant. has_start_time records whether the
--     admin entered a clock time; when false the stored instant is 00:00 IST
--     on the race day (18:30Z the previous day) and the UI shows the date only.
--     Anything that groups by calendar day must therefore format in IST.
--   * distances is text[]: canonical codes (3K, 5K, 10K, HALF, FULL, ULTRA)
--     plus free-text customs such as '15K'. Shape is validated by Zod in the
--     server action; the database only forbids NULL.
--   * At least one of registration_url / coupon_code must be present. Enforced
--     here AND in the Zod superRefine, so a hand-rolled write still cannot
--     produce a row that leaves a runner with nowhere to go.
--   * created_by/updated_by are display-name snapshots — not user ids, not
--     foreign keys — so the trail survives hardDeleteUser(). See public.events.
-- ─────────────────────────────────────────────────────────────────────────────

-- ═══ 0 ── shared trigger function (already exists; harmless to re-issue) ═════
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ═══ 1 ── races ═════════════════════════════════════════════════════════════
create table if not exists public.races (
  id                    text primary key,                 -- nanoid from the server action
  name                  text not null,
  slug                  text not null,
  description           text,                             -- markdown, rendered with react-markdown
  poster_images         text[] not null default '{}',     -- public storage URLs under images/races/
  race_date             timestamptz not null,
  has_start_time        boolean not null default false,
  city                  text not null,
  venue                 text,
  organizer             text,
  distances             text[] not null default '{}',
  registration_url      text,
  coupon_code           text,
  registration_deadline timestamptz,
  status                text not null default 'DRAFT'
                          check (status in ('DRAFT', 'PUBLISHED', 'CANCELLED')),
  created_by            text,
  updated_by            text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  constraint races_slug_key unique (slug),
  constraint races_has_registration_path
    check (registration_url is not null or coupon_code is not null)
);

-- ═══ 2 ── indexes ═══════════════════════════════════════════════════════════
-- slug: covered by the unique constraint above (it creates races_slug_key).
-- Public listing: where status = 'PUBLISHED' order by race_date.
create index if not exists races_status_race_date_idx
  on public.races (status, race_date);
-- Admin listing: every status, newest race first.
create index if not exists races_race_date_idx
  on public.races (race_date);

-- ═══ 3 ── RLS ═══════════════════════════════════════════════════════════════
alter table public.races enable row level security;

drop policy if exists "Published races are publicly readable" on public.races;
create policy "Published races are publicly readable"
  on public.races for select
  using (status = 'PUBLISHED');

-- No insert/update/delete policies on purpose: with none, anon and
-- authenticated can write nothing, and service_role bypasses RLS entirely.

-- ═══ 4 ── updated_at trigger ════════════════════════════════════════════════
drop trigger if exists set_races_updated_at on public.races;
create trigger set_races_updated_at
  before update on public.races
  for each row execute procedure public.set_updated_at();

-- ═══ 5 ── Post-run checks ═══════════════════════════════════════════════════
--   select relrowsecurity from pg_class where oid = 'public.races'::regclass;
--   -- expect true
--
--   select policyname, cmd from pg_policies where tablename = 'races';
--   -- expect exactly one row: "Published races are publicly readable", SELECT
--
--   select conname from pg_constraint where conrelid = 'public.races'::regclass;
--   -- expect races_pkey, races_slug_key, races_status_check, races_has_registration_path
