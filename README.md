# Stride Run Club — Web Frontend

The official web app for **Stride Run Club Bengaluru** — India's most engaged running community with 52,000+ followers, 6,894 runners, and 97+ events per year.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router, TypeScript strict) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com) |
| Database & Auth | [Supabase](https://supabase.com) (PostgreSQL + Supabase Auth) |
| Auth Provider | Google OAuth via Supabase (PKCE flow) |
| Payments | [Cashfree](https://cashfree.com) (hosted checkout) |
| Deployment | [Vercel](https://vercel.com) |
| Analytics | Vercel Analytics + Speed Insights |
| Package Manager | [Yarn](https://yarnpkg.com) |

---

## Local Setup

### Prerequisites

- Node.js 20+
- Yarn (`npm install -g yarn`)
- A Supabase project ([create one free](https://supabase.com))

### 1. Clone the repo

```bash
git clone https://github.com/kush-1510/stride-web-frontend.git
cd stride-web-frontend
```

### 2. Install dependencies

```bash
yarn install
```

### 3. Configure environment variables

Copy the example env file and fill in your values:

```bash
cp .env.example .env.local
```

Required variables:

```env
# Supabase — find these in your Supabase project settings
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
STRIDE_SUPABASE_SERVICE_ROLE_KEY=<service-role-key>   # server-only, never expose to client

# App
NEXT_PUBLIC_SITE_URL=http://localhost:3000             # use production URL on Vercel

# Cashfree payments
STRIDE_CASHFREE_APP_ID=<app-id>
STRIDE_CASHFREE_SECRET_KEY=<secret-key>
STRIDE_CASHFREE_ENV=sandbox                           # use 'production' on live

# QR check-in (generate a random hex string)
STRIDE_QR_SECRET=<random-hex-secret>
```

> **Note:** `STRIDE_SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security — keep it strictly server-side and never commit it.

### 4. Run the dev server

```bash
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. The app hot-reloads as you edit files.

### 5. Build for production

```bash
yarn build
yarn start
```

---

## Project Structure

```
src/
├── app/                  # Next.js App Router pages & API routes
│   ├── (auth)/           # Login, signup, OAuth callback
│   ├── admin/            # Admin panel (role-gated)
│   ├── events/           # Event listings, registration, QR confirmation
│   ├── partnerships/     # Brand partnerships page
│   ├── profile/          # Member profiles
│   └── api/              # API route handlers
├── components/
│   ├── ui/               # Primitive reusable components
│   ├── layout/           # Navbar, Footer, MobileBottomNav
│   ├── events/           # Event-specific components
│   ├── partnerships/     # Partnerships page components
│   └── admin/            # Admin panel components
├── lib/
│   ├── supabase/         # Server, client, and admin Supabase clients
│   ├── actions/          # Server Actions
│   └── qr-token.ts       # HMAC-based QR check-in tokens
└── types/                # Shared TypeScript domain types
```

---

## Key Conventions

- **Styling:** Tailwind utility classes only — no inline styles or CSS modules. Brand tokens: `stride-yellow-accent` (#E1D03F) and `stride-purple-primary` (#4B2862).
- **Auth:** Supabase Auth with Google OAuth. Session managed via `@supabase/ssr` cookies. Always verify server-side.
- **Data fetching:** Default to Server Components. Use `'use client'` only for interactivity.
- **Package manager:** Always use `yarn`. Delete `package-lock.json` if it appears.

---

## Deployment

The app is deployed on Vercel. Every push to `main` triggers a production deployment. Set all env vars under **Project → Settings → Environment Variables** in the Vercel dashboard.
