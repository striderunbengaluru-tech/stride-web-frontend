# AGENTS.md — Stride Run Club web app

Instructions for AI coding agents working in this repository.

> **[CLAUDE.md](./CLAUDE.md) is the authority.** It carries the full engineering
> standard for this codebase — security rules, performance rules, the design
> system, the branching model, the definition of done. **Read it before writing
> code.** This file is a short orientation and a pointer to it, not a substitute:
> where the two ever disagree, CLAUDE.md wins.

Live site: <https://www.strideclub.in> · Agent surface: <https://www.strideclub.in/llms.txt>

---

## What this is

The web application for Stride Run Club, a running community in Bengaluru,
India. Members find and register for runs, earn milestone tiers by attending
them, and get a public athlete profile.

**Stack:** Next.js 16 (App Router) · TypeScript (strict) · Tailwind CSS v4 ·
Supabase (Postgres + Auth + Storage) · Razorpay · Vercel

**Package manager: yarn.** Never npm — if `package-lock.json` appears, delete it.

```bash
yarn install
yarn dev            # http://localhost:3000
yarn build          # must pass clean before any PR
yarn lint           # see the known-debt note below
npx tsc --noEmit    # must report zero errors
```

---

## Before you change anything

Four rules from CLAUDE.md that are worth repeating here, because breaking any of
them is a security incident rather than a bug:

1. **Every admin entry point gates independently.** Pages under `/admin/*` via
   `src/app/admin/layout.tsx`; every server action in `src/lib/actions/admin.ts`
   calls `requireAdmin()` as its first line; every admin API route inlines a
   session check plus a **fresh role read from the database**. Never trust a JWT
   claim for a role — it can be stale after a change.
2. **`adminClient` bypasses row-level security.** Any code path that uses it must
   verify the caller's admin role *before* the first call, or it is an open data
   leak. It is server-only, and `STRIDE_SUPABASE_SERVICE_ROLE_KEY` must never
   reach a client bundle.
3. **Validate every input server-side with Zod.** Client validation is UX only.
4. **Never commit secrets.** `.env.local` is gitignored; keep it that way.

Read the full document before touching auth, payments, admin, or anything that
reads the `users` table.

---

## Layout

```
src/app/            App Router routes
  (auth)/           sign-in and registration pages
  admin/            admin portal — gated by its layout
  api/              API routes, all authenticated
  mcp/              read-only MCP servers (product + docs)
  ask/              NLWeb natural-language endpoint
  md/               markdown representation of every public page
  .well-known/      agent-discovery documents
src/components/
  ui/               reusable primitives
  webmcp/           in-page WebMCP tool registrations
  seo/              the single JsonLd component
src/lib/
  supabase/         server.ts · client.ts · admin.ts
  markdown/         the markdown renderer, shared by /md and the docs MCP server
  mcp/              MCP tool registry, data layer, discovery documents
  json-ld.ts        every schema.org node, in one place
  actions/          server actions
src/content/        static content — blog posts, FAQ, team
```

## Conventions

- **Files** `kebab-case`. **Components** `PascalCase`. **Hooks** `useCamelCase`.
  **Server actions** `camelCaseAction`. **Constants** `SCREAMING_SNAKE_CASE`.
- **Tailwind only.** No inline styles, no CSS modules. Brand tokens are
  `stride-purple-primary` and `stride-yellow-accent`; text on yellow is always
  `text-copy-black`. CTA buttons are always `rounded-md`, never `rounded-full`.
- **Glass card pattern:** `bg-white/10 backdrop-blur-md border border-white/15 rounded-xl`.
- **Server Components by default.** `'use client'` only for browser APIs, state
  or event handlers. Never fetch data client-side that a server component could
  fetch.
- **No `any`** without a `// justification:` comment. Use `unknown` and narrow.
- **Mobile first.** Test at 375px. Touch targets at least 44×44px (`min-h-11`).
- **Server actions that can fail visibly return `{ error }`** rather than
  throwing — Next.js masks thrown action errors in production.

## Branching

`feature/*` → `staging` → `main`. **`main` is production and deploys to the live
domain.** Never commit feature work directly to `main`. `staging` deploys as a
Vercel preview at <https://staging.strideclub.in> and **shares the production
Supabase project** — so staging is not an isolated environment, and staging data
is real data.

## Known debt, so you don't chase it

- `yarn lint` reports roughly a dozen pre-existing errors on `staging`
  (`react-hooks/set-state-in-effect` and similar) unrelated to any new work.
  Compare against a baseline run rather than expecting zero.
- `supabase-schema.sql` at the repo root has drifted from the live schema. Do not
  trust it as a source of truth; migrations are applied through the Supabase SQL
  editor and recorded in `supabase-migrations/`.
- There is no test suite. Complex logic should still be written to be testable —
  pure functions, explicit dependencies, no hidden side effects.

## The agent-facing surface

This site is built to be read by agents as well as people. If you change a page,
keep these in step:

| Surface | Where |
| --- | --- |
| Markdown twin of every public page | `src/lib/markdown/render.ts`, allowlist in `src/lib/markdown-negotiation.ts` |
| Routing for `.md`, `Accept:` and bot UAs | `rewrites()` in `next.config.ts` |
| MCP tools | `src/lib/mcp/registry.ts` → the routes under `src/app/mcp/` |
| Discovery documents | `src/lib/mcp/discovery.ts` → `src/app/.well-known/` |
| Structured data | `src/lib/json-ld.ts` |
| Site manual | `public/llms.txt` |

**Adding a public page means:** a markdown renderer, an entry in the negotiable
allowlist and in `next.config.ts`, an `alternates.types['text/markdown']` in its
metadata, a sitemap entry in `src/lib/sitemap-entries.ts`, and a line in
`public/llms.txt`. **Never** add an admin, API or auth route to `llms.txt` or to
the `robots.txt` allow list.

**One rule above all here: never advertise an endpoint that does not resolve.**
Every URI in a `.well-known` document, in `llms.txt`, or in `auth.md` must
return something. The discovery documents are generated from the tool registry
specifically so they cannot promise a tool that no longer exists.
