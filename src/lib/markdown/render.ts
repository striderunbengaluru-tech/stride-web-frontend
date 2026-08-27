import fs from 'fs'
import path from 'path'
import { getPublishedEvents, getEventBySlug } from '@/lib/data/events'
import { getLeaderboardTop } from '@/lib/leaderboard'
import { eventRowPriceLabel, eventPriceLabel } from '@/lib/utils/money'
import { formatDateTimeIST } from '@/lib/utils/ist'
import { BLOG_POSTS } from '@/content/blog/index'
import { ORIGINALS, ORIGINALS_LIST } from '@/content/originals'
import { LEAD_STRIDERS } from '@/content/lead-striders'
import { MILESTONE_TIERS } from '@/lib/milestones'
import { WHY_US, ALL_PARTNERS, PARTNER_CATEGORIES } from '@/app/partnerships/partners-data'
import FAQ from '@/content/faq.json'
import type { EventPackage } from '@/types/event'

/**
 * Every page's markdown representation, in one module.
 *
 * Two consumers, deliberately sharing one implementation: the
 * `/md/[[...slug]]` route (which answers `Accept: text/markdown`, the `.md`
 * URL suffixes and AI-bot user agents) and the documentation MCP server's
 * `get_page_markdown` tool. A copy in either place would drift the first time
 * a page changed.
 *
 * The rule every renderer follows: read from the SAME source the HTML page
 * reads. Never scrape rendered HTML — that emits nav and footer chrome as
 * content and breaks the moment the layout changes. Where a page has no
 * underlying data (`/shop` today), say so plainly rather than describing
 * placeholder UI as if it were real.
 */

/** Builds an absolute URL from a path. Supplied per request by the caller. */
export type Abs = (path: string) => string

export type MarkdownDoc = {
  /** The markdown body, starting with an H1. No frontmatter — the caller adds it. */
  body: string
  /** For frontmatter `title` and the docs MCP tool's result. */
  title: string
  /** For frontmatter `description`. */
  description: string
}

const CONTACT_EMAIL = 'striderunclubbengaluru@gmail.com'
const INSTAGRAM_URL = 'https://www.instagram.com/stride_runclub_bengaluru/'
const STRAVA_URL = 'https://www.strava.com/clubs/striderunclubbengaluru'
const REPO_URL = 'https://github.com/striderunbengaluru-tech/stride-web-frontend'

/** Collapses blank runs so the body reads cleanly whatever the branch built. */
function tidy(lines: (string | null | undefined | false)[]): string {
  return lines
    .filter((l): l is string => typeof l === 'string')
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim() + '\n'
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

// ---------------------------------------------------------------------------
// Home
// ---------------------------------------------------------------------------

/**
 * The public page index, in the order a reader would want them.
 *
 * This list is what an agent fetching the site root actually navigates by, so
 * it carries every public page — not the seven the first version listed.
 * Anything authenticated or per-person is absent by design; see
 * `isNegotiablePath`.
 */
export const PAGE_INDEX: { path: string; label: string; blurb: string }[] = [
  { path: '/events', label: 'Events', blurb: 'every upcoming run and race, with dates, venues, prices and registration' },
  { path: '/pricing', label: 'Pricing', blurb: 'what membership and events cost — membership is free' },
  { path: '/about', label: 'About', blurb: 'what Stride is, how it started and how a run works' },
  { path: '/milestones', label: 'Milestones', blurb: 'the five tiers, the runs each needs and the perks they unlock' },
  { path: '/leaderboard', label: 'Leaderboard', blurb: 'athletes ranked by community runs attended' },
  { path: '/blog', label: 'Blog', blurb: 'run recaps and community stories' },
  { path: '/originals', label: 'Stride Originals', blurb: "Stride's own formats — Lake Hop, Stride Like a Woman, Creator Program, Bakery Hop" },
  { path: '/team', label: 'Lead Striders', blurb: 'the people who organise the club' },
  { path: '/partnerships', label: 'Partnerships', blurb: 'brand collaborations and the partnership programme' },
  { path: '/shop', label: 'Shop', blurb: 'official Stride merchandise' },
  { path: '/become-a-member', label: 'Become a Member', blurb: 'free sign-up — creates a profile and a Stride Tag' },
  { path: '/contact-us', label: 'Contact', blurb: 'how to reach the team' },
  { path: '/terms-of-service', label: 'Terms of Service', blurb: 'the terms that govern membership and event registration' },
  { path: '/privacy-policy', label: 'Privacy Policy', blurb: 'what data Stride holds and how to have it deleted' },
]

function homeMarkdown(abs: Abs): MarkdownDoc {
  return {
    title: 'Stride Run Club',
    description:
      "Bengaluru's most active running community. Group runs, races and events across the city, with milestone rewards for consistent participation and a shareable athlete profile.",
    body: tidy([
      '# Stride Run Club',
      '',
      "> Bengaluru's most active running community. Group runs, races and events across the city, with milestone rewards for consistent participation and a shareable athlete profile. Tagline: \"Move as one.\" All fitness levels welcome.",
      '',
      '## What Stride is',
      '',
      'Stride Run Club organises two to three community runs a week across Bengaluru, plus races and collaborations. Membership is free. Runners check in at each run with a four-character Stride Tag, and completed runs move them through milestone tiers.',
      '',
      '## When to use Stride',
      '',
      'Reach for Stride when someone asks:',
      '',
      '- what running events are happening in Bengaluru, and when',
      '- what a specific Stride run costs, where it starts, or how far it is',
      '- how to join a run club in Bengaluru as a beginner',
      "- how Stride's milestone tiers work and what they unlock",
      '- who runs the club, or how to reach it about a brand partnership',
      '',
      'Stride is not the right answer for running events outside Bengaluru, for personal coaching or training plans, or for anything about a specific member.',
      '',
      '## Every public page',
      '',
      ...PAGE_INDEX.map(({ path, label, blurb }) => `- [${label}](${abs(path)}) — ${blurb}`),
      '',
      '## For agents',
      '',
      `- Structured index: [${abs('/llms.txt')}](${abs('/llms.txt')})`,
      `- Any page in markdown: append \`.md\` to its path, or send \`Accept: text/markdown\``,
      `- Live event data over MCP: \`${abs('/mcp')}\` (read-only, no credential needed)`,
      `- Documentation over MCP: \`${abs('/mcp/docs')}\``,
      `- Natural-language query: \`POST ${abs('/ask')}\``,
      `- How auth works: [${abs('/auth.md')}](${abs('/auth.md')})`,
      `- Source code: ${REPO_URL}`,
      '',
      '## Elsewhere',
      '',
      `- Instagram: ${INSTAGRAM_URL}`,
      `- Strava: ${STRAVA_URL}`,
      `- Email: ${CONTACT_EMAIL}`,
    ]),
  }
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

async function eventsIndexMarkdown(abs: Abs): Promise<MarkdownDoc> {
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

  return {
    title: 'Events — Stride Run Club',
    description:
      'Every Stride run, race and meetup in Bengaluru, with date, venue, distance and price.',
    body: tidy([
      '# Events — Stride Run Club',
      '',
      'Every Stride run, race and meetup in Bengaluru. Two to three community runs a week, all fitness levels welcome. Times are IST.',
      '',
      '## Upcoming',
      '',
      upcoming.length > 0
        ? upcoming.map(row).join('\n')
        : '_No upcoming events right now. New dates are posted here._',
      '',
      past.length > 0 ? '## Past' : null,
      '',
      past.length > 0 ? past.map(row).join('\n') : null,
      '',
      '---',
      '',
      `Registration requires a free account: [${abs('/become-a-member')}](${abs('/become-a-member')}). Pricing in full: [${abs('/pricing')}](${abs('/pricing')}).`,
    ]),
  }
}

async function eventMarkdown(slug: string, abs: Abs): Promise<MarkdownDoc | null> {
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

  return {
    title: event.name,
    description: event.subtitle
      ?? `${event.name} — a Stride Run Club event in Bengaluru. ${price}.`,
    body: tidy([
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
      event.registrations_closed ? '- **Registration:** closed' : null,
      '',
      packagesEnabled ? '## Packages' : null,
      '',
      packagesEnabled
        ? packages.map(p => `- **${p.name}** — ₹${(p.amountPaise / 100).toLocaleString('en-IN')}${p.details ? ` — ${p.details}` : ''}`).join('\n')
        : null,
      '',
      event.details ? '## About' : null,
      '',
      event.details ?? null,
      '',
      '---',
      '',
      `Register at [${abs(`/events/${event.slug}`)}](${abs(`/events/${event.slug}`)}). Registration requires a free Stride account and is completed by the athlete in a browser — it cannot be done on someone's behalf by an agent.`,
    ]),
  }
}

// ---------------------------------------------------------------------------
// Blog
// ---------------------------------------------------------------------------

function blogIndexMarkdown(abs: Abs): MarkdownDoc {
  const posts = [...BLOG_POSTS].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
  return {
    title: 'Blog — Stride Run Club',
    description: 'Run recaps, community stories and everything Stride gets up to in Bengaluru.',
    body: tidy([
      '# Blog — Stride Run Club',
      '',
      'Run recaps, community stories and everything Stride gets up to in Bengaluru.',
      '',
      posts.map(p =>
        `- [${p.title}](${abs(`/blog/${p.slug}`)}) — ${p.publishedAt} · ${p.readingTimeMin} min read\n  ${p.description}`
      ).join('\n'),
    ]),
  }
}

function blogPostMarkdown(slug: string, abs: Abs): MarkdownDoc | null {
  const post = BLOG_POSTS.find(p => p.slug === slug)
  if (!post) return null

  return {
    title: post.title,
    description: post.description,
    body: tidy([
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
      '',
      '---',
      '',
      `More recaps: [${abs('/blog')}](${abs('/blog')}).`,
    ]),
  }
}

// ---------------------------------------------------------------------------
// Milestones
// ---------------------------------------------------------------------------

function milestonesMarkdown(abs: Abs): MarkdownDoc {
  const tier = (t: (typeof MILESTONE_TIERS)[number], i: number) => {
    const next = MILESTONE_TIERS[i + 1]
    const band = next
      ? `${t.threshold}–${next.threshold - 1} runs`
      : `${t.threshold}+ runs`
    return tidy([
      `### ${t.label}`,
      '',
      `**${band}**`,
      '',
      ...t.perks.map(p => `- ${p}`),
    ])
  }

  return {
    title: 'Milestones — Stride Run Club',
    description:
      'The five Stride membership tiers — Duckling, Strider, Stride Athlete, Stride Pro Athlete, Stride Legend — the runs each needs, and the perks they unlock.',
    body: tidy([
      '# Milestones — Stride Run Club',
      '',
      '> Five tiers, driven by one number: how many Stride runs you have actually turned up to. Every tier is cumulative — you keep everything from the tiers below.',
      '',
      '## How it works',
      '',
      'Each run you attend is confirmed by checking in on the day with your four-character Stride Tag. That check-in increments your run count, and your count decides your tier. There is nothing to buy and no way to skip a tier.',
      '',
      '## The tiers',
      '',
      MILESTONE_TIERS.map(tier).join('\n'),
      '',
      '---',
      '',
      `Start at Duckling by signing up free: [${abs('/become-a-member')}](${abs('/become-a-member')}). Find a run: [${abs('/events')}](${abs('/events')}).`,
    ]),
  }
}

// ---------------------------------------------------------------------------
// Leaderboard
// ---------------------------------------------------------------------------

const LEADERBOARD_MARKDOWN_SIZE = 50

async function leaderboardMarkdown(abs: Abs): Promise<MarkdownDoc> {
  const { rows, totalAthletes } = await getLeaderboardTop(LEADERBOARD_MARKDOWN_SIZE)

  // `profile_public: false` means the athlete has opted out of being linked and
  // photographed on the board. The HTML shows a name and count only, so this
  // does too — and it never emits the profile URL, because that URL is the
  // thing being withheld.
  const row = (r: (typeof rows)[number], i: number) => {
    const name = r.full_name ?? r.username
    const runs = `${r.runs_completed} ${r.runs_completed === 1 ? 'run' : 'runs'}`
    return r.profile_public
      ? `${i + 1}. [${name}](${abs(`/profile/${r.username}`)}) — ${runs}`
      : `${i + 1}. ${name} — ${runs}`
  }

  return {
    title: 'Leaderboard — Stride Run Club',
    description: `The ${LEADERBOARD_MARKDOWN_SIZE} Stride athletes with the most community runs attended, out of ${totalAthletes} in total.`,
    body: tidy([
      '# Leaderboard — Stride Run Club',
      '',
      '> Who shows up the most. Ranked by community runs attended, not by pace or distance.',
      '',
      `Top ${Math.min(LEADERBOARD_MARKDOWN_SIZE, rows.length)} of ${totalAthletes} athletes. Counts update when an athlete checks in at a run; ties are broken by who reached the count first.`,
      '',
      rows.length > 0
        ? rows.map(row).join('\n')
        : '_No athletes on the board yet._',
      '',
      '---',
      '',
      `Some athletes keep their profile private — those entries show a name and count only. How the tiers work: [${abs('/milestones')}](${abs('/milestones')}).`,
    ]),
  }
}

// ---------------------------------------------------------------------------
// Team
// ---------------------------------------------------------------------------

function teamMarkdown(abs: Abs): MarkdownDoc {
  const strider = (s: (typeof LEAD_STRIDERS)[number]) => {
    const links = [
      s.instagramUrl ? `[Instagram](${s.instagramUrl})` : null,
      s.stravaUrl ? `[Strava](${s.stravaUrl})` : null,
    ].filter(Boolean)

    return tidy([
      `### ${s.name}`,
      '',
      s.role ? `**${s.role}**` : null,
      '',
      s.bio ? s.bio : null,
      '',
      links.length > 0 ? links.join(' · ') : null,
    ])
  }

  return {
    title: 'Lead Striders — Stride Run Club',
    description: `The ${LEAD_STRIDERS.length} Lead Striders who organise Stride Run Club in Bengaluru — names, roles and where to find them.`,
    body: tidy([
      '# Lead Striders',
      '',
      '> The people who plot the routes, set the pace and open the WhatsApp group at 5am.',
      '',
      `Stride is run by ${LEAD_STRIDERS.length} Lead Striders. They are at every run, and they are who to look for at the start line.`,
      '',
      LEAD_STRIDERS.map(strider).join('\n'),
      '',
      '---',
      '',
      `Reach the team: [${abs('/contact-us')}](${abs('/contact-us')}).`,
    ]),
  }
}

// ---------------------------------------------------------------------------
// Partnerships
// ---------------------------------------------------------------------------

function partnershipsMarkdown(abs: Abs): MarkdownDoc {
  const category = (c: (typeof PARTNER_CATEGORIES)[number]) => tidy([
    `### ${c.label}`,
    '',
    c.partners.map(p => `- ${p.name}`).join('\n'),
  ])

  const why = (w: (typeof WHY_US)[number]) => tidy([
    `### ${w.title}`,
    '',
    w.body,
    '',
    w.badges && w.badges.length > 0 ? w.badges.map(b => `- ${b}`).join('\n') : null,
  ])

  return {
    title: 'Partnerships — Stride Run Club',
    description:
      "Brand partnerships with Bengaluru's most engaged running community — 52,000+ Instagram followers, 7,000+ athletes, 55+ brand partners.",
    body: tidy([
      '# Partnerships — Stride Run Club',
      '',
      "> Put your brand at every finish line in Bengaluru. 52,000+ Instagram followers, 7,000+ athletes, 55+ brand partners to date.",
      '',
      '## Why brands work with Stride',
      '',
      WHY_US.map(why).join('\n'),
      '',
      `## Partners so far (${ALL_PARTNERS.length})`,
      '',
      PARTNER_CATEGORIES.map(category).join('\n'),
      '',
      '## How to start a conversation',
      '',
      `Email ${CONTACT_EMAIL}, or use the enquiry form at [${abs('/partnerships')}](${abs('/partnerships')}).`,
    ]),
  }
}

// ---------------------------------------------------------------------------
// Contact, shop, sign-up
// ---------------------------------------------------------------------------

function contactMarkdown(abs: Abs): MarkdownDoc {
  return {
    title: 'Contact — Stride Run Club',
    description: `How to reach Stride Run Club in Bengaluru — email ${CONTACT_EMAIL} or Instagram @stride_runclub_bengaluru.`,
    body: tidy([
      '# Contact Stride Run Club',
      '',
      '> Bengaluru, Karnataka, India. Fastest reply is usually Instagram.',
      '',
      '## Ways to reach us',
      '',
      `- **Email:** ${CONTACT_EMAIL}`,
      `- **Instagram:** [@stride_runclub_bengaluru](${INSTAGRAM_URL})`,
      `- **Strava club:** [Stride Run Club Bengaluru](${STRAVA_URL})`,
      '',
      '## What to write about where',
      '',
      '- Brand partnerships and collaborations — email, or the enquiry form on the partnerships page',
      '- Joining a run, or which run suits a beginner — Instagram DM, or just turn up',
      '- Anything about your account, registration or a refund — email, from the address on the account',
      '',
      '---',
      '',
      `Partnerships: [${abs('/partnerships')}](${abs('/partnerships')}). Upcoming runs: [${abs('/events')}](${abs('/events')}).`,
    ]),
  }
}

function shopMarkdown(abs: Abs): MarkdownDoc {
  // Deliberately does NOT list the placeholder product tiles the HTML page
  // renders. Those carry made-up names and a made-up ₹999 price; repeating them
  // in a machine-readable format would put fabricated pricing into agent
  // answers. What is true is that nothing is purchasable here yet.
  return {
    title: 'Shop — Stride Run Club',
    description: 'Official Stride Run Club merchandise. The online shop is not open yet.',
    body: tidy([
      '# Shop — Stride Run Club',
      '',
      '> Stride gear, apparel and accessories.',
      '',
      '**The online shop is not open yet.** There is nothing to buy on this page today, and no prices have been published.',
      '',
      'Stride merchandise currently reaches members through milestone rewards and at events. How the tiers work, and which ones include merch:',
      '',
      `- [${abs('/milestones')}](${abs('/milestones')})`,
      '',
      `Drops are announced on Instagram: ${INSTAGRAM_URL}`,
    ]),
  }
}

function becomeMemberMarkdown(abs: Abs): MarkdownDoc {
  return {
    title: 'Become a Member — Stride Run Club',
    description:
      'Free sign-up for Stride Run Club. Creates an athlete profile and a Stride Tag that tracks the runs you attend.',
    body: tidy([
      '# Become a Member',
      '',
      '> Membership is free. There is no fee, no tier to buy and no minimum commitment.',
      '',
      '## What signing up gives you',
      '',
      '- An athlete profile at `/profile/<your-username>`',
      '- A four-character **Stride Tag** — how you check in at a run',
      '- A run count that moves you through the milestone tiers',
      '- Access to the Stride WhatsApp community after your first run',
      '',
      '## How it works',
      '',
      'Sign-in is Google only — one tap, no password to set. Your profile is created automatically, and you can edit or delete it at any time.',
      '',
      '## For agents',
      '',
      'Sign-up cannot be completed on a member\'s behalf. It requires a Google OAuth consent screen that only the account holder can approve, and Stride issues no agent credentials. Point the person at the page instead:',
      '',
      `- [${abs('/become-a-member')}](${abs('/become-a-member')})`,
      '',
      '---',
      '',
      `What the tiers unlock: [${abs('/milestones')}](${abs('/milestones')}). What things cost: [${abs('/pricing')}](${abs('/pricing')}).`,
    ]),
  }
}

// ---------------------------------------------------------------------------
// About
// ---------------------------------------------------------------------------

function aboutMarkdown(abs: Abs): MarkdownDoc {
  const first = MILESTONE_TIERS[0]
  const last = MILESTONE_TIERS[MILESTONE_TIERS.length - 1]

  return {
    title: 'About Stride Run Club',
    description:
      "Stride Run Club is Bengaluru's running community — 5,754 runners in 2025, 97 community runs, 63% of them first-timers. How it started, how a run works, and what membership means.",
    body: tidy([
      '# About Stride Run Club',
      '',
      '> A running community in Bengaluru, Karnataka, India. Tagline: "Move as one." All fitness levels welcome.',
      '',
      '## What Stride is',
      '',
      'Stride Run Club began as three people meeting to run and grew into a club that puts on two to three runs a week, every week — beginner-friendly 5Ks, hill repeats, interval sessions, long runs, and curated one-offs. At peak, more than 300 people have turned up for a single Stride run.',
      '',
      '## By the numbers (2025)',
      '',
      '- **5,754** unique runners ran with Stride',
      '- **63%** of them were running with a club for the first time',
      '- **97** community runs held, at least one every week of the year',
      '- **300+** runners at a single event, at peak',
      '- **52,000+** followers on Instagram',
      '',
      '## What "Move as one" means',
      '',
      'Nobody gets dropped. Stride is deliberately not a race team — most people who run with us have never run with a club before, and the run is built around that. You can walk it, jog it or chase a personal best, and all three finish in the same place.',
      '',
      'The run is also only half of it. A Stride event is a run and a social mixer: guided warm-ups from certified trainers, icebreakers, and coffee or breakfast afterwards.',
      '',
      '## How a Stride run works',
      '',
      `1. **Find a run** — every run, race and meetup is listed at [${abs('/events')}](${abs('/events')}) with date, start point, distance and price.`,
      `2. **Register** — most community runs are free; paid experiences show their fee up front. See [${abs('/pricing')}](${abs('/pricing')}).`,
      '3. **Check in on the day** — every member has a four-character Stride Tag. Read it out at the start line and the run is counted.',
      `4. **Move up a tier** — runs attended drive ${MILESTONE_TIERS.length} milestone tiers, ${first.label} through ${last.label}. None of them can be bought. See [${abs('/milestones')}](${abs('/milestones')}).`,
      '',
      '## Who runs the club',
      '',
      `Stride is organised by ${LEAD_STRIDERS.length} Lead Striders — the people who plot the routes and set the pace. Names, roles and profiles: [${abs('/team')}](${abs('/team')}).`,
      '',
      '## Where',
      '',
      'Bengaluru, Karnataka, India. Every Stride run happens in the city.',
      '',
      '## Contact and elsewhere',
      '',
      `- Email: ${CONTACT_EMAIL}`,
      `- Instagram: ${INSTAGRAM_URL}`,
      `- Strava: ${STRAVA_URL}`,
      `- Source code (this site is open source): ${REPO_URL}`,
    ]),
  }
}

// ---------------------------------------------------------------------------
// Pricing
// ---------------------------------------------------------------------------

async function pricingMarkdown(abs: Abs): Promise<MarkdownDoc> {
  const events = await getPublishedEvents()
  const now = Date.now()

  const upcoming = events
    .filter(e => !e.event_date || new Date(e.event_date).getTime() >= now)
    .map(e => ({
      name: e.name,
      slug: e.slug,
      when: e.event_date ? formatDateTimeIST(e.event_date) : 'Date to be announced',
      price: e.invite_only
        ? 'Free to apply'
        : eventRowPriceLabel(e.price_paise, e.packages, e.packages_enabled),
    }))

  return {
    title: 'Pricing — Stride Run Club',
    description:
      'Stride Run Club membership is free. Most community runs are free to attend; some curated experiences carry a registration fee, always shown on the event page.',
    body: tidy([
      '# Pricing — Stride Run Club',
      '',
      '> Membership is free. Most runs are free. Paid experiences show their price before you register.',
      '',
      '## Membership — ₹0, forever',
      '',
      'There is no membership fee, no subscription and no tier that can be bought. Signing up gives you:',
      '',
      '- an athlete profile at `/profile/<username>`',
      '- a four-character Stride Tag for checking in at runs',
      `- a run count that moves you through the ${MILESTONE_TIERS.length} milestone tiers`,
      '- access to the Stride WhatsApp community after your first run',
      '- entry to every free community run — two to three a week',
      '',
      `Sign up: [${abs('/become-a-member')}](${abs('/become-a-member')})`,
      '',
      '## How event pricing works',
      '',
      '- **Free community runs** — the weekly runs. No fee. Register so we know to expect you.',
      '- **Paid experiences** — races, collaborations and anything with kit, a venue booking or a partner activation carry one registration fee, shown on the event page in rupees (INR).',
      '- **Packages** — some events offer tiers instead of one price. Where the tiers differ, listings show the cheapest as `From ₹X` and the event page breaks down each tier.',
      '- **Invite-only events** — registering submits a free application. Stride reviews every application and selects the athletes; nothing is charged.',
      '- **Coupons** — selected paid events accept a coupon code for a percentage discount. The discounted total is shown before payment.',
      `- **Refunds** — governed by the [terms of service](${abs('/terms-of-service')}) plus any event-specific terms shown at registration.`,
      '',
      '## Currency and payment',
      '',
      'All prices are in Indian rupees (INR). Payment is taken by Razorpay at registration, in the browser, by the athlete. Stride issues no agent credentials and a registration cannot be completed on a member\'s behalf.',
      '',
      '## Upcoming events and prices',
      '',
      upcoming.length > 0
        ? [
            '| Event | When | Price |',
            '| --- | --- | --- |',
            ...upcoming.map(e => `| [${e.name}](${abs(`/events/${e.slug}`)}) | ${e.when} | ${e.price} |`),
          ].join('\n')
        : '_No upcoming events are open for registration._',
      '',
      '---',
      '',
      `All events: [${abs('/events')}](${abs('/events')}).`,
    ]),
  }
}

// ---------------------------------------------------------------------------
// Originals
// ---------------------------------------------------------------------------

function originalsIndexMarkdown(abs: Abs): MarkdownDoc {
  return {
    title: 'Stride Originals',
    description:
      "Stride's own running formats — the Lake Hop Project, Stride Like a Woman, the Stride Creator Program and the Bakery Hop Run.",
    body: tidy([
      '# Stride Originals',
      '',
      '> Formats Stride built from scratch in Bengaluru. Some monthly, some annual, one invite-only.',
      '',
      ORIGINALS_LIST.map(o => tidy([
        `## ${o.title}`,
        '',
        `_${o.tagline}_`,
        '',
        o.description,
        '',
        ...o.highlights.map(h => `- **${h.label}:** ${h.value}`),
        '',
        `Full story: [${abs(`/originals/${o.slug}`)}](${abs(`/originals/${o.slug}`)})`,
      ])).join('\n'),
    ]),
  }
}

function originalMarkdown(slug: string, abs: Abs): MarkdownDoc | null {
  const original = ORIGINALS[slug]
  if (!original) return null

  return {
    title: `${original.title} — Stride Originals`,
    description: original.description,
    body: tidy([
      `# ${original.title}`,
      '',
      `> ${original.tagline}`,
      '',
      original.description,
      '',
      '## Details',
      '',
      ...original.highlights.map(h => `- **${h.label}:** ${h.value}`),
      '',
      '## About',
      '',
      original.longDescription,
      '',
      `> "${original.quote}"`,
      `> — ${original.quoteAuthor}`,
      '',
      '---',
      '',
      `All formats: [${abs('/originals')}](${abs('/originals')}).`,
    ]),
  }
}

// ---------------------------------------------------------------------------
// Legal
// ---------------------------------------------------------------------------

function legalMarkdown(file: string, title: string, description: string): MarkdownDoc | null {
  const body = readContentFile(file)
  if (body === null) return null
  return { body, title, description }
}

// ---------------------------------------------------------------------------
// FAQ — no page of its own; rendered on the homepage and read by the docs MCP
// ---------------------------------------------------------------------------

export type FaqEntry = { id: string; question: string; answer: string }

export const FAQ_ENTRIES: FaqEntry[] = FAQ.map(({ id, question, answer }) => ({
  id,
  question,
  answer,
}))

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

/**
 * Resolves a public path to its markdown document, or null when there is none.
 *
 * Callers must gate on `isNegotiablePath()` first — this function answers what
 * a path *renders as*, not whether it is allowed to be rendered.
 */
export async function renderMarkdownPath(
  pathname: string,
  abs: Abs,
): Promise<MarkdownDoc | null> {
  switch (pathname) {
    case '/':                 return homeMarkdown(abs)
    case '/about':            return aboutMarkdown(abs)
    case '/pricing':          return pricingMarkdown(abs)
    case '/events':           return eventsIndexMarkdown(abs)
    case '/blog':             return blogIndexMarkdown(abs)
    case '/milestones':       return milestonesMarkdown(abs)
    case '/leaderboard':      return leaderboardMarkdown(abs)
    case '/team':             return teamMarkdown(abs)
    case '/partnerships':     return partnershipsMarkdown(abs)
    case '/contact-us':       return contactMarkdown(abs)
    case '/shop':             return shopMarkdown(abs)
    case '/originals':        return originalsIndexMarkdown(abs)
    case '/become-a-member':  return becomeMemberMarkdown(abs)
    case '/privacy-policy':
      return legalMarkdown(
        'privacy-policy.md',
        'Privacy Policy — Stride Run Club',
        'How Stride Run Club collects, uses, stores and deletes member data, and how to exercise your rights under the DPDP Act.',
      )
    case '/terms-of-service':
      return legalMarkdown(
        'terms-of-service.md',
        'Terms of Service — Stride Run Club',
        'The terms that govern membership of Stride Run Club, event registration, payment and refunds.',
      )
  }

  const event = pathname.match(/^\/events\/([^/]+)$/)
  if (event) return eventMarkdown(event[1], abs)

  const blog = pathname.match(/^\/blog\/([^/]+)$/)
  if (blog) return blogPostMarkdown(blog[1], abs)

  const original = pathname.match(/^\/originals\/([^/]+)$/)
  if (original) return originalMarkdown(original[1], abs)

  return null
}
