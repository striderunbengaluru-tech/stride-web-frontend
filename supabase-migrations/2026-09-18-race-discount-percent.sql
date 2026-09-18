-- ─────────────────────────────────────────────────────────────────────────────
-- Race coupon discount — run this in the Supabase SQL Editor BEFORE deploying
-- the app code (the public and admin race queries select the new column and
-- fail until it exists). Idempotent: safe to re-run.
--
-- What it does:
--   1. public.races.discount_percent — the whole-number percentage the
--      organiser's coupon takes off, shown as "10% off" beside the code on the
--      calendar, the hover card, the race page and the admin list.
--   2. Two CHECKs: 1–100 inclusive, and no discount without a coupon_code.
--
-- RLS is untouched: the column rides on the existing races policies.
-- ─────────────────────────────────────────────────────────────────────────────

-- ═══ 1 ── Column ═════════════════════════════════════════════════════════════
alter table public.races
  add column if not exists discount_percent smallint;

comment on column public.races.discount_percent is
  'Whole percent off the organiser''s fee with coupon_code. Display only; Stride never redeems it.';

-- ═══ 2 ── Constraints ════════════════════════════════════════════════════════
alter table public.races
  drop constraint if exists races_discount_percent_range,
  add constraint races_discount_percent_range
    check (discount_percent is null or discount_percent between 1 and 100);

alter table public.races
  drop constraint if exists races_discount_requires_coupon,
  add constraint races_discount_requires_coupon
    check (discount_percent is null or coupon_code is not null);

-- ═══ 3 ── Post-run checks ════════════════════════════════════════════════════
--   select column_name, data_type from information_schema.columns
--   where table_name = 'races' and column_name = 'discount_percent';
--   -- expect one row, smallint
--
--   select conname from pg_constraint where conrelid = 'public.races'::regclass;
--   -- expect races_discount_percent_range and races_discount_requires_coupon
