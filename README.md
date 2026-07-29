# Stride Run Club — Web Frontend

The official web app for **Stride Run Club Bengaluru** — India's most engaged running community, with 52,000+ Instagram followers, 7,000+ athletes, and 97+ events a year.

Live at **[www.strideclub.in](https://www.strideclub.in)**.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router, React 19, TypeScript strict) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com) |
| Database & Auth | [Supabase](https://supabase.com) (PostgreSQL, Supabase Auth, Storage) |
| Auth provider | Google OAuth via Supabase (PKCE), cookie sessions with `@supabase/ssr` |
| Payments | [Razorpay](https://razorpay.com) (hosted checkout + signed webhook) |
| Transactional email | [Brevo](https://brevo.com) |
| Animation | [Framer Motion](https://motion.dev) |
| Images | `next/image` + [sharp](https://sharp.pixelplumbing.com) (WebP conversion on upload) |
| Deployment | [Vercel](https://vercel.com) |
| Analytics | Vercel Analytics + Speed Insights |
| Package manager | **Yarn** (never npm) |

---

## Branching & Deployment

> The live site only ever reflects `main`. All in-progress work lives on `staging`.

```
feature/* ──▶ staging ──▶ main ──▶ 🚀 live site
                  ▲                (Vercel Production)
            internal testing
           (Vercel Preview deploy)
```

| Environment | Branch | Vercel env | URL |
|---|---|---|---|
| Production | `main` | Production | https://www.strideclub.in |
| Staging | `staging` | Preview | https://staging.strideclub.in |

Both environments share **one** Supabase project, so a schema migration affects staging and production simultaneously. Run migrations *before* deploying code that depends on them.

### Preview-only features

`src/lib/feature-flags.ts` gates unreleased routes by deployment environment, not user role:

- `PREVIEW_FEATURES_ENABLED` — true everywhere except the production deploy of `main`.
- `guardPreviewFeature()` — call as the first line of a Server Component to return a hard `404` on production.
- `GATED_ROUTE_PREFIXES` — keeps gated routes out of the production `sitemap.ts`.

`NEXT_PUBLIC_VERCEL_ENV` is injected by Vercel — never set it manually.

**Currently gated (404 on production, visible on staging):** `/team`.

---

## Local Setup

### Prerequisites

- **Node.js 22.13+** (some transitive dependencies declare `^22.13.0 || >=24`; older 22.x works but will fail `yarn add` engine checks)
- Yarn 1.x — `npm install -g yarn`
- Access to the Stride Supabase project (or your own, with the schema applied)

### 1. Clone and install

```bash
git clone https://github.com/striderunbengaluru-tech/stride-web-frontend.git
cd stride-web-frontend
yarn install
```

### 2. Configure environment variables

There is no committed `.env.example` — create `.env.local` yourself:

```env
# ── Supabase ──────────────────────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>          # safe to expose, restricted by RLS
STRIDE_SUPABASE_SERVICE_ROLE_KEY=<service-role>   # SERVER ONLY — bypasses RLS

# ── App ───────────────────────────────────────────────────────────────────
NEXT_PUBLIC_SITE_URL=http://localhost:3000        # the deployed URL in Vercel

# ── Razorpay ──────────────────────────────────────────────────────────────
NEXT_PUBLIC_RAZORPAY_KEY_ID=<key-id>              # public, used by the checkout script
STRIDE_RAZORPAY_KEY_ID=<key-id>
STRIDE_RAZORPAY_KEY_SECRET=<key-secret>
STRIDE_RAZORPAY_WEBHOOK_SECRET=<webhook-secret>   # verifies webhook signatures

# ── Email (Brevo) ─────────────────────────────────────────────────────────
STRIDE_BREVO_API_KEY=<api-key>                    # sender: no-reply@strideclub.in

# ── Apple/Google Wallet passes (optional) ─────────────────────────────────
STRIDE_WALLETWALLET_API_KEY=<api-key>             # event tickets as wallet passes

# ── Strava (optional, profile connect) ────────────────────────────────────
STRIDE_STRAVA_CLIENT_ID=<client-id>
STRIDE_STRAVA_CLIENT_SECRET=<client-secret>

# ── Cron (Vercel supplies this as a Bearer token) ─────────────────────────
CRON_SECRET=<random-hex>                          # exact name required
```

> `STRIDE_SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security entirely. Use it only in server-only files, and never commit it.

### 3. Run

```bash
yarn dev     # http://localhost:3000
yarn build   # production build
yarn start   # serve the production build
yarn lint    # eslint
```

To exercise production-only behaviour (feature gating, gated sitemap) locally:

```bash
NEXT_PUBLIC_VERCEL_ENV=production yarn build
```

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/                 # become-a-member (sign-in), login, register
│   ├── admin/                  # Admin panel — role-gated by admin/layout.tsx
│   │   ├── events/             #   create / edit / preview events
│   │   ├── products/           #   shop items
│   │   ├── registrations/      #   attendee lists
│   │   ├── users/              #   members, roles, milestone sort
│   │   └── check-in/           #   QR + Stride Tag check-in
│   ├── events/                 # Listing, detail, QR confirmation page
│   ├── milestones/             # Public tier ladder (scroll timeline)
│   ├── leaderboard/            # Podium + ranked table
│   ├── profile/[username]/     # Athlete profiles
│   ├── my-runs/                # A member's own registrations
│   ├── blog/, originals/       # Editorial content
│   ├── shop/, partnerships/    # Merch, brand partnerships
│   └── api/                    # Route handlers (webhooks, uploads, cron)
├── components/
│   ├── ui/                     # Primitives — Timeline, TierBadge, Switch, …
│   ├── layout/                 # Navbar, Footer, MobileBottomNav
│   ├── home/                   # Hero, Up Next, Newsroom, Spotlight, FAQ
│   ├── events/, profile/,      # Feature components
│   │   milestones/, admin/
│   └── auth/                   # AuthProvider (client session context)
├── lib/
│   ├── supabase/               # server.ts / client.ts / admin.ts factories
│   ├── data/                   # Cached, tag-invalidated reads (events)
│   ├── actions/                # Server Actions (admin.ts gates on requireAdmin)
│   ├── email/                  # Brevo templates + send helpers
│   ├── validations/            # Zod schemas
│   ├── milestones.ts           # Tier ladder — single source of truth
│   ├── leaderboard.ts          # Ranking + tie-break, shared with the API route
│   ├── feature-flags.ts        # Production gating
│   ├── check-in.ts             # Mark a registration attended
│   └── wallet-quota.ts         # Wallet-pass issuance limits
├── content/                    # Editable copy (JSON/TS): faq, hero, newsroom, …
├── hooks/, utils/, types/
└── middleware.ts               # Session refresh + /admin protection
```

Copy that changes often lives in `src/content/` — editing `faq.json` or `hero.json` needs no component changes.

---

## Key Domain Concepts

**Milestone tiers** (`src/lib/milestones.ts`) — driven by `users.runs_completed`, which increments on a successful event check-in. One file defines each tier's label, run band, badge artwork, avatar frame colour, chip styling and perks; the profile, milestones page, leaderboard and admin all read from it.

| Tier | Runs |
|---|---|
| Duckling | 0–5 |
| Strider | 6–24 |
| Stride Athlete | 25–72 |
| Stride Pro Athlete | 73–108 |
| Stride Legend | 109+ |

**Check-in** — every athlete gets a 4-character **Stride Tag**, shown on their ticket after registering. At the run, an admin enters it at `/admin/check-in`. `POST /api/events/check-in` verifies the session and re-reads the caller's role from the DB, rejects a closed check-in window, requires a `CONFIRMED` registration that isn't already checked in, then sets `checked_in_at` and increments the athlete's `runs_completed` — which is what advances milestone tiers.

**Test events** — an event with `is_test_event = true` never appears on production (list, homepage, sitemap; its page 404s) even when `PUBLISHED`, but works fully on staging. Toggle it in the admin event form.

**Monthly cron** — `vercel.json` schedules `/api/cron/purge-inactive` (DPDP retention), authorised by `CRON_SECRET`.

---

## Conventions

- **Security first.** Every admin page is gated by `admin/layout.tsx`; every admin Server Action calls `requireAdmin()` as its first line; every `/api/admin/*` route re-checks session + role. Roles are always read fresh from the DB — never from JWT claims.
- **RLS is mandatory** on every table. `adminClient` bypasses it, so any route using it must verify admin role first.
- **Styling** is Tailwind utilities only. Brand tokens: `stride-yellow-accent` (#E1D03F), `stride-purple-primary` (#4B2862). Yellow surfaces always use `text-copy-black`. CTAs are `rounded-md`.
- **Server Components by default**; `'use client'` only for browser APIs, state or handlers. The root layout must stay cookie-free so public pages prerender.
- **Uploads** are converted to WebP with `sharp` before hitting Storage.
- **Mobile first** — every layout is checked at 375px; touch targets ≥ 44×44px.
- **Yarn only.** Delete `package-lock.json` if it appears.

`CLAUDE.md` holds the full engineering guidelines this codebase is held to.

---

## Deployment

Vercel builds every push:

- `staging` → Preview at https://staging.strideclub.in
- `main` → Production at https://www.strideclub.in

Environment variables are set per-environment under **Project → Settings → Environment Variables**. `NEXT_PUBLIC_SITE_URL` differs between Preview and Production; `NEXT_PUBLIC_VERCEL_ENV` is injected automatically.

Supabase → Authentication → URL Configuration must allow both callbacks (`https://www.strideclub.in/**` and `https://staging.strideclub.in/**`). Google OAuth only needs the fixed Supabase callback, never per-deploy Vercel URLs.
