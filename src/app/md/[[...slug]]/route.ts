import fs from 'fs'
import path from 'path'
import { notFound } from 'next/navigation'
import { getPublishedEvents, getEventBySlug } from '@/lib/data/events'
import { eventRowPriceLabel, eventPriceLabel } from '@/lib/utils/money'
import { formatDateTimeIST } from '@/lib/utils/ist'
import { BLOG_POSTS } from '@/content/blog/index'
import { estimateTokens, isNegotiablePath } from '@/lib/markdown-negotiation'
import type { EventPackage } from '@/types/event'

/**
 * The markdown half of `Accept: text/markdown` negotiation.
 *
 * Never linked and never navigated to directly — `src/middleware.ts` rewrites a
 * negotiated request here, so the URL an agent sees stays the real one. Each
 * branch renders from the SAME source the HTML page uses (the markdown files,
 * BLOG_POSTS, the cached event reads) rather than scraping rendered HTML, which
 * would emit nav and footer chrome as content and drift the moment the layout
 * changed.
 *
 * Which paths are negotiable lives in @/lib/markdown-negotiation so the
 * middleware and this handler cannot disagree.
 */

/** Absolute links, so a copied markdown document still resolves. */
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.strideclub.in'

const abs = (p: string) => `${SITE}${p}`

/** Collapses blank runs so the body reads cleanly whatever the branch built. */
function tidy(lines: (string | null | undefined | false)[]): string {
  return lines.filter((l): l is string => typeof l === 'string').join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n'
}

function readContentFile(name: string): string | null {
  try {
    return fs.readFileSync(path.join(process.cwd(), 'src/content/markdown', name), 'utf8')
  } catch {
    // Same read the HTML pages do; if it fails there is nothing to serve and
    // the caller falls back to a 404 rather than an empty document.
    return null
  }
}

function homeMarkdown(): string {
  return tidy([
    '# Stride Run Club',
    '',
    "> Bengaluru's most active running community. Group runs, races and events across the city, with milestone rewards for consistent participation and a shareable athlete profile. Tagline: \"Move as one.\" All fitness levels welcome.",
    '',
    '## What Stride is',
    '',
    'Stride Run Club organises two to three community runs a week across Bengaluru, plus races and collaborations. Membership is free. Runners check in at each run with a four-character Stride Tag, and completed runs move them through milestone tiers.',
    '',
    '## Key pages',
    '',
    `- [Events](${abs('/events')}) — every upcoming run and race, with registration`,
    `- [Milestones](${abs('/milestones')}) — the tier system and its rewards`,
    `- [Leaderboard](${abs('/leaderboard')}) — most active runners`,
    `- [Blog](${abs('/blog')}) — run recaps and community stories`,
    `- [Originals](${abs('/originals')}) — Stride's own programmes`,
    `- [Partnerships](${abs('/partnerships')}) — brand collaborations`,
    `- [Contact](${abs('/contact-us')})`,
    '',
    '## Machine-readable index',
    '',
    `A fuller structured index for AI assistants lives at [${abs('/llms.txt')}](${abs('/llms.txt')}).`,
    '',
    '## Elsewhere',
    '',
    '- Instagram: https://www.instagram.com/stride_runclub_bengaluru/',
    '- Strava: https://www.strava.com/clubs/striderunclubbengaluru',
  ])
}

async function eventsIndexMarkdown(): Promise<string> {
  const events = await getPublishedEvents()
  const now = Date.now()
  const upcoming = events.filter(e => !e.event_date || new Date(e.event_date).getTime() >= now)
  const past = events.filter(e => e.event_date && new Date(e.event_date).getTime() < now)

  const row = (e: (typeof events)[number]) => {
    const when = e.event_date ? formatDateTimeIST(e.event_date) : 'Date to be announced'
    const price = eventRowPriceLabel(e.price_paise, e.packages, e.packages_enabled)
    const where = e.location ? ` · ${e.location}` : ''
    const invite = e.invite_only ? ' · Invite only (application reviewed by Stride)' : ''
    return `- [${e.name}](${abs(`/events/${e.slug}`)}) — ${when}${where} · ${price}${invite}`
  }

  return tidy([
    '# Events — Stride Run Club',
    '',
    'Every Stride run, race and meetup in Bengaluru. Two to three community runs a week, all fitness levels welcome.',
    '',
    '## Upcoming',
    '',
    upcoming.length > 0 ? upcoming.map(row).join('\n') : '_No upcoming events right now. New dates are posted here._',
    '',
    past.length > 0 ? '## Past' : null,
    past.length > 0 ? '' : null,
    past.length > 0 ? past.map(row).join('\n') : null,
  ])
}

async function eventMarkdown(slug: string): Promise<string | null> {
  const event = await getEventBySlug(slug)
  if (!event || event.status === 'DRAFT') return null

  let packages: EventPackage[] = []
  try {
    const parsed = JSON.parse(event.packages ?? '[]')
    if (Array.isArray(parsed)) packages = parsed as EventPackage[]
  } catch { packages = [] }

  const inviteOnly = event.invite_only === true
  const packagesEnabled = !inviteOnly && (event.packages_enabled ?? false) && packages.length > 0
  const price = inviteOnly ? 'Free to apply' : eventPriceLabel(event.price_paise, packages, packagesEnabled)

  return tidy([
    `# ${event.name}`,
    '',
    event.subtitle ? `> ${event.subtitle}` : null,
    '',
    inviteOnly
      ? '**Invite only.** Registering submits a free application. Stride reviews every application and selects the athletes; a spot is confirmed only once approved.'
      : null,
    '',
    '## Details',
    '',
    event.event_date ? `- **When:** ${formatDateTimeIST(event.event_date)} IST` : null,
    event.location ? `- **Where:** ${event.location}` : null,
    `- **Price:** ${price}`,
    event.distance_km ? `- **Distance:** ${event.distance_km} km` : null,
    event.difficulty ? `- **Difficulty:** ${event.difficulty}` : null,
    event.post_run_location ? `- **Post-run:** ${event.post_run_location}` : null,
    '',
    packagesEnabled ? '## Packages' : null,
    packagesEnabled ? '' : null,
    packagesEnabled
      ? packages.map(p => `- **${p.name}** — ₹${(p.amountPaise / 100).toLocaleString('en-IN')}`).join('\n')
      : null,
    '',
    event.details ? '## About' : null,
    '',
    event.details ?? null,
    '',
    '---',
    '',
    `Register at [${abs(`/events/${event.slug}`)}](${abs(`/events/${event.slug}`)}).`,
  ])
}

function blogIndexMarkdown(): string {
  const posts = [...BLOG_POSTS].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
  return tidy([
    '# Blog — Stride Run Club',
    '',
    'Run recaps, community stories and everything Stride gets up to in Bengaluru.',
    '',
    posts.map(p =>
      `- [${p.title}](${abs(`/blog/${p.slug}`)}) — ${p.publishedAt} · ${p.readingTimeMin} min read\n  ${p.description}`
    ).join('\n'),
  ])
}

function blogPostMarkdown(slug: string): string | null {
  const post = BLOG_POSTS.find(p => p.slug === slug)
  if (!post) return null

  return tidy([
    `# ${post.title}`,
    '',
    `_${post.publishedAt} · ${post.readingTimeMin} min read · by ${post.author.name}, ${post.author.role}_`,
    '',
    post.tags.length > 0 ? `Tags: ${post.tags.join(', ')}` : null,
    '',
    post.tldr.length > 0 ? '## TL;DR' : null,
    '',
    post.tldr.length > 0 ? post.tldr.map(t => `- ${t}`).join('\n') : null,
    '',
    post.content,
  ])
}

/** Resolves a rewritten path to its markdown body, or null for a 404. */
async function render(pathname: string): Promise<string | null> {
  if (pathname === '/') return homeMarkdown()
  if (pathname === '/events') return eventsIndexMarkdown()
  if (pathname === '/blog') return blogIndexMarkdown()
  if (pathname === '/privacy-policy') return readContentFile('privacy-policy.md')
  if (pathname === '/terms-of-service') return readContentFile('terms-of-service.md')

  const event = pathname.match(/^\/events\/([^/]+)$/)
  if (event) return eventMarkdown(event[1])

  const blog = pathname.match(/^\/blog\/([^/]+)$/)
  if (blog) return blogPostMarkdown(blog[1])

  return null
}

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ slug?: string[] }> },
): Promise<Response> {
  const { slug } = await ctx.params
  const pathname = '/' + (slug ?? []).join('/')

  // Re-checked here, not just in the middleware: this route is publicly
  // reachable, and the allowlist is what keeps it from becoming a second way to
  // read something the HTML side gates.
  if (!isNegotiablePath(pathname)) notFound()

  const body = await render(pathname)
  if (body === null) notFound()

  return new Response(body, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      // Without this a shared cache would happily hand an agent's markdown to
      // the next browser that asked for the same URL.
      'Vary': 'Accept',
      'X-Markdown-Tokens': String(estimateTokens(body)),
      'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300',
    },
  })
}
