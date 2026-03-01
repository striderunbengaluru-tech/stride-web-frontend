-- ============================================================
-- Stride Run Club — Initial Schema
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- UTILITY: updated_at trigger function
-- ──────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ──────────────────────────────────────────────────────────
-- TABLE: users (member profiles)
-- ──────────────────────────────────────────────────────────
create table public.users (
  id          uuid references auth.users(id) on delete cascade primary key,
  username    text unique not null,
  full_name   text,
  bio         text,
  role        text not null default 'GUEST'
                check (role in ('GUEST', 'MEMBER', 'ADMIN')),
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index users_username_idx on public.users (username);

alter table public.users enable row level security;

create policy "Profiles are publicly readable"
  on public.users for select
  using (true);

create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = id);

create trigger set_users_updated_at
  before update on public.users
  for each row execute procedure public.set_updated_at();

-- Auto-create profile on first sign-up
create or replace function public.handle_new_user()
returns trigger as $$
declare
  base_username  text;
  final_username text;
  suffix         int := 0;
begin
  base_username := lower(regexp_replace(
    coalesce(
      new.raw_user_meta_data ->> 'preferred_username',
      split_part(new.email, '@', 1)
    ),
    '[^a-z0-9]', '', 'g'
  ));

  -- Guarantee uniqueness by appending a numeric suffix if needed
  final_username := base_username;
  while exists (select 1 from public.users where username = final_username) loop
    suffix := suffix + 1;
    final_username := base_username || suffix::text;
  end loop;

  insert into public.users (id, username, full_name, avatar_url)
  values (
    new.id,
    final_username,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  );

  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ──────────────────────────────────────────────────────────
-- TABLE: events
-- ──────────────────────────────────────────────────────────
create table public.events (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  slug        text unique not null,
  description text,
  event_date  timestamptz,
  location    text,
  capacity    int,
  status      text not null default 'DRAFT'
                check (status in ('DRAFT', 'PUBLISHED', 'CANCELLED')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index events_slug_idx       on public.events (slug);
create index events_status_idx     on public.events (status);
create index events_event_date_idx on public.events (event_date);

alter table public.events enable row level security;

create policy "Published events are publicly readable"
  on public.events for select
  using (status = 'PUBLISHED');

create policy "Admins can manage events"
  on public.events for all
  using (
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'ADMIN'
    )
  );

create trigger set_events_updated_at
  before update on public.events
  for each row execute procedure public.set_updated_at();

-- ──────────────────────────────────────────────────────────
-- TABLE: products
-- ──────────────────────────────────────────────────────────
create table public.products (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text unique not null,
  description text,
  price_paise int not null,    -- stored in paise (INR × 100); e.g. ₹299 → 29900
  image_url   text,
  stock       int not null default 0,
  status      text not null default 'DRAFT'
                check (status in ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index products_slug_idx   on public.products (slug);
create index products_status_idx on public.products (status);

alter table public.products enable row level security;

create policy "Published products are publicly readable"
  on public.products for select
  using (status = 'PUBLISHED');

create policy "Admins can manage products"
  on public.products for all
  using (
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'ADMIN'
    )
  );

create trigger set_products_updated_at
  before update on public.products
  for each row execute procedure public.set_updated_at();
