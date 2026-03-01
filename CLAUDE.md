# CLAUDE.md — Stride Run Club

> This file governs all AI-assisted development on the Stride Run Club web application.
> Every decision made must follow this document in strict priority order:
> **Security → Performance → UI/UX → Functionality**

---

## 🏗️ Project Overview

**Stride Run Club** is a Next.js web application serving a running community with:
- Event & race registration
- Member community & social features
- Training plans & progress tracking

**Stack:** Next.js (App Router) · TypeScript · Tailwind CSS · Supabase · Contentful · Vercel

---

## ⚖️ Core Philosophy

Code quality is non-negotiable. Every line written must be:
- **Purposeful** — no dead code, no TODO leftovers, no commented-out blocks
- **Type-safe** — full TypeScript coverage, zero `any` unless explicitly justified with a comment
- **Maintainable** — readable by a developer with no prior context on this project
- **Minimal** — solve the problem simply; resist over-engineering

When in doubt, do less and do it well.

---

## 🔐 Security (Highest Priority)

Security is never an afterthought. All code must be written defensively by default.

### Authentication & Authorization
- Every protected route must verify session/auth server-side in the layout or page — never rely on client-side guards alone
- Role checks (admin, member, guest) must happen at the server boundary, not in UI components
- Never expose user IDs, emails, or sensitive fields in client-visible URLs or props unless absolutely necessary

### Data & Input
- All user input must be validated and sanitized server-side before any processing or storage — client-side validation is UX only
- Use Zod schemas for all form data, API route inputs, and external data sources — define schemas adjacent to their usage
- Never trust data coming from the client, including cookies and headers that aren't cryptographically signed
- Parameterize all database queries — never concatenate user input into query strings

### API Routes & Server Actions
- All API routes must explicitly handle and return appropriate HTTP status codes
- Rate-limit sensitive endpoints (registration, login, form submissions) using Vercel Edge middleware or a utility wrapper
- CORS must be explicitly configured — default-deny for non-browser origins where applicable
- Never log sensitive user data (passwords, tokens, payment info, health data)

### Environment & Secrets
- All secrets live in `.env.local` (local) and Vercel Environment Variables (production) — never hardcoded
- `.env.local` is always in `.gitignore` — verify this before any commit
- Secret variable names must use the `STRIDE_` prefix for app-specific vars (e.g. `STRIDE_JWT_SECRET`)
- Public env vars exposed to the client must use `NEXT_PUBLIC_` and must never contain secrets

### Cashfree Payments Security
- Never process or store raw card data — all payment capture happens exclusively through Cashfree's hosted SDK/checkout
- Always verify payment status server-side via Cashfree's Orders API after any client-side callback — never trust the client's success signal
- Validate the `x-webhook-signature` header on every Cashfree webhook before processing — reject unsigned or mismatched payloads immediately
- Payment webhook handlers must be idempotent — use the Cashfree `order_id` as an idempotency key to prevent double-registration on retries
- Store only `order_id`, `payment_status`, and `cf_payment_id` — never store card numbers, CVVs, or full PAN data
- All Cashfree API keys live in Vercel Environment Variables as `STRIDE_CASHFREE_APP_ID` and `STRIDE_CASHFREE_SECRET_KEY` — never in client bundles
- Use Cashfree's **Test** environment for all non-production deployments — gate the environment via `STRIDE_CASHFREE_ENV=sandbox|production`
- Registration slots must be held (status: `PENDING`) on order creation and only confirmed (status: `CONFIRMED`) on verified webhook — never on client callback alone

### Supabase Security
- Always use the **`supabase-js` server client** (from `@supabase/ssr`) in Server Components, Server Actions, and API routes — never the browser client on the server
- The `SUPABASE_SERVICE_ROLE_KEY` must never be exposed to the client — it bypasses RLS entirely and must only be used in trusted server-side admin contexts
- **Row Level Security (RLS) is mandatory on every table** — enable it at creation time and write explicit policies; a table with RLS disabled is a security breach
- RLS policies must enforce user ownership — e.g. members can only read/write their own training logs, registrations, and profile data
- Use Supabase Auth for all authentication — never roll a custom session system alongside it
- Auth session management in Next.js must use the `@supabase/ssr` package with cookie-based sessions — the legacy `auth-helpers-nextjs` package is deprecated and must not be used
- Never trust `supabase.auth.getUser()` from the client alone for server-side decisions — always re-verify the session server-side using the server client
- Storage bucket policies must be explicitly configured — default to private; only make buckets public when the content is intentionally public (e.g. event cover images)
- All Supabase Edge Functions must validate the JWT from the `Authorization` header before processing any request
- Environment variables:
  - `NEXT_PUBLIC_SUPABASE_URL` — safe to expose, required by the browser client
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — safe to expose, restricted by RLS
  - `STRIDE_SUPABASE_SERVICE_ROLE_KEY` — server only, never in client bundles

### Supabase Performance
- Use Supabase's **Realtime** selectively — only subscribe to channels where live updates add real UX value (e.g. community feed, event capacity counters); unsubscribe on component unmount
- Always select only the columns you need — avoid `select('*')` in production queries
- Add database indexes on all foreign keys and frequently filtered columns (e.g. `user_id`, `event_id`, `status`, `created_at`) — define these in migration files, not just via the dashboard
- Use Supabase's built-in **connection pooling (Supavisor)** — configure the pooled connection string in `STRIDE_DATABASE_URL` for server-side usage to avoid exhausting connections on Vercel's serverless functions


- Middleware must be used to protect entire route groups — never leave admin or member-only routes publicly reachable by accident
- Set appropriate security headers (CSP, X-Frame-Options, HSTS) in `next.config.ts` and/or middleware

---

## ⚡ Performance (Second Priority)

Stride is a community app — it must feel fast for every member, on any device, on any connection.

### Rendering Strategy
- Default to **Server Components** for all data-fetching; opt into `'use client'` only when you need browser APIs, state, or event handlers
- Co-locate data fetching as close to the component that needs it as possible
- Never fetch data in a client component that could be fetched in a server component

### Data Fetching
- Use `fetch` with proper `cache` and `revalidate` options for all server-side data fetching
- Deduplicate requests using React's built-in request memoization — avoid waterfalls
- Paginate all lists (events, members, training logs) — never load unbounded data sets
- Prefer streaming with `loading.tsx` and `Suspense` boundaries for slow data

### Images & Assets
- Always use `next/image` for images — configure `sizes` and `priority` appropriately
- Optimize all static assets; use WebP/AVIF formats
- SVGs used as icons must be inlined or loaded as components — not via `<img>` tags

### Bundles & Code Splitting
- Lazy-load heavy client components (maps, charts, rich editors) with `next/dynamic`
- Monitor bundle size — no new dependency should be added without justification
- Prefer native browser APIs and small utilities over large libraries

### Vercel Deployment
- Use Edge Runtime for middleware and lightweight API routes where possible
- Leverage Vercel's ISR (`revalidate`) for public pages like event listings and club info
- Static-generate pages that don't require per-request data (about, FAQ, pricing)

---

## 🎨 UI & Design (Third Priority)

The interface must be clean, accessible, and consistent — it represents the club's identity.

### Design System
- All styling is done exclusively with **Tailwind CSS utility classes** — no inline styles, no CSS modules, no styled-components
- The brand palette and all design tokens are defined in `tailwind.config.ts` under `theme.extend` — never hardcode hex values in components

**Brand tokens (already configured in `tailwind.config.ts`):**
```ts
// tailwind.config.ts
theme: {
  extend: {
    colors: {
      'stride-yellow-accent': '#E1D03F',  // CTAs, highlights, active states
      'stride-purple-primary': '#4B2862', // Primary backgrounds, nav, headers
    },
    textColor: {
      DEFAULT: '#FFFFFF',                 // Default copy is white
      'stride-dark': '#010101',           // Dark copy (on light backgrounds)
    },
  },
},
```

**Usage rules:**
- `stride-yellow-accent` — buttons, active nav items, badges, focus rings, key highlights
- `stride-purple-primary` — page backgrounds, cards, sidebars, hero sections
- Copy defaults to **white (`#FFFFFF`)** on purple backgrounds; use `text-stride-dark` (`#010101`) only when rendering on light/yellow surfaces
- All other colors (grays, states, borders, neutrals) come from **Tailwind's default palette** — no custom additions without a documented reason
- Never use raw hex values in component files — always use the token class name (e.g. `bg-stride-purple-primary`, not `bg-[#4B2862]`)
- Component variants must be managed with `clsx` or `cva` — never string-interpolate class names conditionally
- **CTA buttons always use `rounded-md`** — never `rounded-full` on any button or anchor acting as a CTA
- **Text overflow must use `line-clamp`** — any text that can overflow its container must use Tailwind's `line-clamp-{n}` utility; never let text overflow unconstrained
- **Color contrast is non-negotiable for CWV** — all text/background combinations must meet WCAG AA (4.5:1 for body text, 3:1 for large text); prefer brand tokens that are pre-validated: white on purple (~9:1), yellow on purple (~5.5:1), dark (`#010101`) on yellow (~14:1)
- Dark mode support must be considered from the start — use Tailwind's `dark:` variant consistently

### Glassmorphism (Site-Wide UI Pattern)
All UI cards, panels, modals, dropdowns, and floating elements must use the glassmorphic style:
```
bg-copy-white/10 backdrop-blur-md border border-copy-white/15 rounded-xl
```
- Hover state: `hover:border-stride-yellow-accent/50 transition-colors`
- This matches the navbar glass effect and creates a cohesive visual language across the app
- Never use solid white (`bg-copy-white`) or solid gray backgrounds on the dark purple site background
- For darker overlay needs (e.g. modals), use `bg-stride-purple-primary/80 backdrop-blur-xl`

### Mobile-First (Mandatory)
The majority of Stride's users are on mobile. Every component must be designed for mobile first:
- Start with a single-column layout; expand to multi-column at `sm:` / `md:` / `lg:` breakpoints
- Touch targets must be at least 44×44px — use `min-h-11` / `min-w-11` on interactive elements
- Test every new UI at 375px width before considering it complete
- Prefer `flex-col` as the base, upgrade to `flex-row` at `sm:` or wider
- Navigation and CTAs must be thumb-reachable — keep primary actions near the bottom of the screen on mobile

### Component Architecture
- Prefer small, composable components over monolithic ones
- Presentational components (pure UI) must be separated from data-fetching components
- Shared UI primitives (Button, Input, Card, Badge, Modal) must live in `components/ui/` and be fully reusable
- Page-specific components live in `components/[feature]/` (e.g. `components/events/`, `components/training/`)

### Accessibility (Non-Negotiable)
- All interactive elements must be keyboard navigable
- Use semantic HTML — `<button>`, `<nav>`, `<main>`, `<article>`, `<section>` over generic `<div>` soup
- All images must have descriptive `alt` text; decorative images use `alt=""`
- Color contrast must meet WCAG AA minimum (4.5:1 for text)
- Form inputs must always have associated `<label>` elements
- Use `aria-*` attributes only when semantic HTML isn't sufficient

### Responsive Design
- Mobile-first approach — all layouts designed for small screens, enhanced upward
- Test all UI at 375px, 768px, 1280px breakpoints before considering a feature complete
- No horizontal scroll on any screen size

---

## ⚙️ Functionality & Code Quality (Fourth Priority)

### TypeScript Rules
- `strict: true` is always enabled in `tsconfig.json` — never disable strict flags
- No `any` — use `unknown` and narrow it, or define proper types/interfaces
- Define shared domain types in `types/` (e.g. `types/event.ts`, `types/member.ts`, `types/training.ts`)
- Use `type` for object shapes and unions; use `interface` only when extending is needed
- Enums are avoided — use `as const` objects with a derived union type instead

### File & Folder Structure
```
/app
  /(auth)           # Login, signup, onboarding routes
  /(club)           # Member-facing routes (feed, training, profile)
  /(events)         # Event listings, registration, detail pages
  /(admin)          # Club admin panel — always protected
  /api              # API route handlers
/components
  /ui               # Primitive, reusable UI components (Button, Input, Card, Badge, Modal)
  /blocks           # Page-section/block components (hero, feature sections, CTAs)
  /home             # Home page-specific components
  /events           # Event-specific components
  /training         # Training plan & log components
  /community        # Social feed, member cards, comments
  /layout           # Navbar, Footer, Sidebar, etc.
/lib
  /supabase         # Supabase client factories (server.ts, client.ts, admin.ts)
  /contentful       # Contentful client, fetchers, and rich-text renderer config
  /auth             # Auth helpers and session utilities (built on Supabase Auth)
  /validations      # Zod schemas for all forms and API inputs
  /utils            # General utility functions
/types
  /contentful       # Auto-generated types from Contentful content models
/types              # Shared TypeScript types and domain models
/hooks              # Custom React hooks (client-side only)
/middleware.ts      # Route protection and security headers
```

### Naming Conventions
- Files: `kebab-case` for all files and folders
- Components: `PascalCase` exported function components
- Hooks: `useCamelCase` — always prefixed with `use`
- Server Actions: `camelCase` — suffixed with `Action` (e.g. `registerForEventAction`)
- Constants: `SCREAMING_SNAKE_CASE`
- Types/Interfaces: `PascalCase`

### Functions & Logic
- Functions must do one thing — if a function needs an "and" in its description, split it
- Max function length: ~40 lines. If longer, extract and name the sub-logic
- No magic numbers or strings — extract to named constants
- Avoid deeply nested conditionals — use early returns and guard clauses

### Error Handling
- All async operations must handle errors explicitly — no silent `catch(() => {})` blocks
- User-facing errors must be friendly and actionable — no raw error stack traces in the UI
- Server errors must be logged server-side with enough context to diagnose
- Use Next.js `error.tsx` boundaries at each route segment for graceful degradation

### Testing Mindset
- Write code that is testable by design — pure functions, clear dependencies, no hidden side effects
- Complex business logic (registration rules, training plan calculations) must have unit tests
- Critical user flows (event registration, auth) must have integration coverage

---

## 🚫 Hard Rules — Never Do These

| Rule | Reason |
|---|---|
| Never use `any` without a `// justification:` comment | Destroys type safety |
| Never fetch data in a client component if a server component can do it | Performance regression |
| Never commit `.env.local` or secrets | Security breach |
| Never expose the Contentful CMA token anywhere in the codebase | Full content write access — critical breach |
| Never fetch Contentful data in a client component | Performance regression and token exposure risk |
| Never render Contentful rich text as raw HTML | XSS vulnerability |
| Never disable RLS on a Supabase table | Exposes all rows to any authenticated user |
| Never use the service role key in client-side code | Full DB bypass — critical security breach |
| Never use `select('*')` in production queries | Overfetching, performance regression, data leakage |
| Never use `dangerouslySetInnerHTML` without explicit sanitization | XSS vulnerability |
| Never trust Cashfree client callbacks as payment confirmation | Payment fraud risk |
| Never store card/payment instrument data locally | PCI compliance violation |
| Never leave console.log statements in committed code | Noise and potential data leaks |
| Never skip input validation on API routes | Security breach |
| Never hardcode user roles or IDs | Auth bypass risk |
| Never merge untested changes to `main` | Stability |
| Never install a library without checking its bundle size impact | Performance regression |
| Never build UI without considering mobile first | UX failure |
| Never use `rounded-full` on CTA buttons | Stride CTAs always use `rounded-md` |

---

## ✅ Definition of Done

A feature or change is only complete when:
- [ ] TypeScript compiles with zero errors and zero `any` warnings
- [ ] All inputs are validated with Zod
- [ ] Auth/authorization is enforced server-side
- [ ] Mobile layout is tested and correct
- [ ] Accessibility basics are in place (keyboard nav, labels, alt text)
- [ ] No console logs or dead code left in the diff
- [ ] Error states are handled and user-facing messages are friendly
- [ ] Performance implications have been considered (rendering mode, caching, lazy loading)

---

## 🖼️ Brand Assets & Images

### Stride Instagram
- Official Instagram: **https://www.instagram.com/stride_runclub_bengaluru/**
- Use `cdn.instagram.com` as an allowed hostname in `next.config.ts` for any Instagram-hosted images

### Placeholder Images
- Use **https://placehold.co/{width}x{height}/{bg-hex}/{text-hex}?text={label}** for all placeholder images during development
- Example: `https://placehold.co/1920x1080/4B2862/E1D03F?text=Stride+Run+Club`
- Adjust dimensions freely based on context (hero: 1920×1080, card: 600×400, avatar: 300×300, etc.)
- Replace placeholders with real Stride assets (from Instagram or photo library) before shipping

### Allowed Image Domains (next.config.ts)
- `placehold.co` — development placeholders
- `cdn.instagram.com` — Stride brand photos from Instagram

---

## 🏃 Stride-Specific Domain Rules

- **Events:** Registration must prevent double-booking; capacity limits must be enforced server-side
- **Training Plans:** Logged runs and personal records are private to the member by default — never expose one member's data to another
- **Community Feed:** Social content must be sanitized before storage and before rendering — assume all user-generated content is hostile
- **Roles:** At minimum, distinguish `GUEST`, `MEMBER`, and `ADMIN` — define these in `types/auth.ts` and use them consistently
- **Dates & Times:** Always store dates in UTC; display in the user's local timezone using `Intl.DateTimeFormat`
- **Units:** Support both metric (km) and imperial (miles) for all distance data — store in meters internally

---

*Last updated: Feb 2026 — Maintained alongside the Stride Run Club codebase.*