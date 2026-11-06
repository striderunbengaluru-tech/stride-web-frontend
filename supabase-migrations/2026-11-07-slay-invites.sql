-- ─────────────────────────────────────────────────────────────────────────────
-- Slay Run Club invites — run this whole file in the Supabase SQL Editor BEFORE
-- deploying the app code. Idempotent: safe to re-run.
--
-- What it does:
--   1. public.slay_invites — one row per application from the /join-slay form:
--      full name, email, WhatsApp number, Instagram handle and why they want to
--      join. An admin reviews it; approved applicants are emailed the link to the
--      Slay WhatsApp community.
--   2. RLS on, and NO policies: the table is private personal data. The only
--      writer is submitSlayApplicationAction, which validates and rate-limits
--      server-side and then inserts through adminClient (service_role, bypasses
--      RLS). Grants are also revoked from anon/authenticated, so the public anon
--      key cannot reach the table through PostgREST even if a policy is added
--      by mistake later.
--   3. One application per email and one per WhatsApp number: a repeat is
--      reported to the applicant as received, not stored twice.
--   4. An index on created_at for the action's site-wide flood cap, which counts
--      applications from the last few minutes. The in-memory per-visitor limit
--      in the action is per server instance; this count is the same for all.
--
-- Semantics:
--   * whatsapp is the 10-digit Indian mobile number as entered (digits only,
--     no country code) — same rule as contact_number on registrations.
--   * instagram is stored without the leading '@'.
--   * email is stored lower-cased by the action; the unique index is on
--     lower(email) as well, so a hand-written row cannot dodge it by case.
--   * status: PENDING on arrival → APPROVED (invite emailed) or REJECTED, from
--     the Slay Approvals tab in /admin. reviewed_at / reviewed_by are set when it
--     leaves PENDING. Approval claims the row first (PENDING → APPROVED in one
--     conditional update), then emails; a failed send puts it back to PENDING.
-- ─────────────────────────────────────────────────────────────────────────────

-- ═══ 0 ── shared trigger function (already exists; harmless to re-issue) ═════
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ═══ 1 ── slay_invites ══════════════════════════════════════════════════════
create table if not exists public.slay_invites (
  id           uuid primary key default gen_random_uuid(),
  full_name    text not null check (char_length(full_name) between 2 and 80),
  email        text not null check (char_length(email) <= 254),
  whatsapp     text not null check (whatsapp ~ '^\d{10}$'),
  instagram    text not null check (instagram ~ '^[A-Za-z0-9._]{1,30}$'),
  reason       text not null check (char_length(reason) between 10 and 500),
  status       text not null default 'PENDING'
                 check (status in ('PENDING', 'APPROVED', 'REJECTED')),
  reviewed_at  timestamptz,
  reviewed_by  text,          -- admin display-name snapshot, not a user id (survives hardDeleteUser)
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create unique index if not exists slay_invites_email_key
  on public.slay_invites (lower(email));

create unique index if not exists slay_invites_whatsapp_key
  on public.slay_invites (whatsapp);

-- The flood cap: "how many applications in the last N minutes".
create index if not exists slay_invites_created_idx
  on public.slay_invites (created_at desc);

-- The review queue: newest pending first.
create index if not exists slay_invites_status_created_idx
  on public.slay_invites (status, created_at desc);

drop trigger if exists slay_invites_set_updated_at on public.slay_invites;
create trigger slay_invites_set_updated_at
  before update on public.slay_invites
  for each row execute function public.set_updated_at();

-- ═══ 2 ── access ════════════════════════════════════════════════════════════
alter table public.slay_invites enable row level security;
revoke all on public.slay_invites from anon, authenticated;
