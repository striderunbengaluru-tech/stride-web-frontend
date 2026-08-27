import { getPublishedEvents, getEventBySlug, getConfirmedCount, getPackageSpotsTaken } from '@/lib/data/events'
import { getLeaderboardTop } from '@/lib/leaderboard'
import { MILESTONE_TIERS, getMilestone } from '@/lib/milestones'
import { eventRowPriceLabel, eventPriceLabel } from '@/lib/utils/money'
import { LEAD_STRIDERS } from '@/content/lead-striders'
import type { EventPackage } from '@/types/event'
import type {
  PublicEvent,
  PublicEventDetail,
  PublicEventPackage,
  PublicAthlete,
  PublicMilestoneTier,
  PublicClubInfo,
} from './types'
import {
  SANDBOX_EVENTS,
  SANDBOX_EVENT_DETAIL,
  SANDBOX_ATHLETES,
  SANDBOX_TOTAL_ATHLETES,
} from './fixtures'

/**
 * The read layer behind the MCP tools and `/ask`.
 *
 * Two invariants hold in every function here, and both are load-bearing:
 *
 * 1. **Reads go through the existing cached helpers** — `getPublishedEvents`,
 *    `getEventBySlug`, `getLeaderboardTop`. Those already scope their columns,
 *    already filter DRAFT and test events, and are already tagged so a purge
 *    from the admin actions refreshes them. Reaching past them to `adminClient`
 *    would bypass all three and turn a read tool into an open data leak.
 *
 * 2. **Fields are projected one at a time** into the `Public*` types. No spread
 *    of a database row, ever — that is how a column added next month ends up in
 *    an agent's response.
 *
 * Nothing here writes.
 */

/** Whether a request asked for fixtures instead of live data. */
export function isSandbox(url: URL): boolean {
  const value = url.searchParams.get('sandbox')
  return value === '1' || value === 'true'
}

function parsePackages(json: string | null | undefined): EventPackage[] {
  try {
    const parsed = JSON.parse(json ?? '[]')
    return Array.isArray(parsed) ? (parsed as EventPackage[]) : []
  } catch {
    return []
  }
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export type ListEventsArgs = {
  when?: 'upcoming' | 'past' | 'all'
  maxPricePaise?: number
  maxDistanceKm?: number
  difficulty?: string
  limit?: number
}

const DEFAULT_EVENT_LIMIT = 25
const MAX_EVENT_LIMIT = 100

export async function listEvents(
  args: ListEventsArgs,
  sandbox: boolean,
): Promise<{ events: PublicEvent[]; total: number }> {
  const when = args.when ?? 'upcoming'
  const limit = Math.min(Math.max(args.limit ?? DEFAULT_EVENT_LIMIT, 1), MAX_EVENT_LIMIT)

  const all: PublicEvent[] = sandbox
    ? SANDBOX_EVENTS
    : (await getPublishedEvents()).map(e => ({
        slug: e.slug,
        name: e.name,
        subtitle: e.subtitle,
        eventDate: e.event_date,
        location: e.location,
        priceLabel: e.invite_only
          ? 'Free to apply'
          : eventRowPriceLabel(e.price_paise, e.packages, e.packages_enabled),
        pricePaise: e.price_paise,
        // Not on the list row — the detail read has them. Listing surfaces show
        // neither, so returning null here matches what a card shows rather than
        // triggering one detail query per row.
        distanceKm: null,
        difficulty: null,
        inviteOnly: e.invite_only === true,
        registrationsClosed: false,
        url: `/events/${e.slug}`,
      }))

  const now = Date.now()
  const timeFiltered = all.filter(e => {
    if (when === 'all') return true
    if (!e.eventDate) return when === 'upcoming'
    const at = new Date(e.eventDate).getTime()
    return when === 'upcoming' ? at >= now : at < now
  })

  const filtered = timeFiltered.filter(e => {
    if (args.maxPricePaise !== undefined && e.pricePaise > args.maxPricePaise) return false
    if (args.maxDistanceKm !== undefined && e.distanceKm !== null && e.distanceKm > args.maxDistanceKm) return false
    if (args.difficulty && e.difficulty?.toLowerCase() !== args.difficulty.toLowerCase()) return false
    return true
  })

  // Upcoming soonest-first; past most-recent-first. Undated events sort last.
  const sorted = [...filtered].sort((a, b) => {
    if (!a.eventDate) return 1
    if (!b.eventDate) return -1
    const diff = new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()
    return when === 'past' ? -diff : diff
  })

  return { events: sorted.slice(0, limit), total: sorted.length }
}

export async function getEvent(
  slug: string,
  sandbox: boolean,
): Promise<PublicEventDetail | null> {
  if (sandbox) return SANDBOX_EVENT_DETAIL[slug] ?? null

  const event = await getEventBySlug(slug)
  if (!event || event.status !== 'PUBLISHED') return null

  const rawPackages = parsePackages(event.packages)
  const inviteOnly = event.invite_only === true
  const packagesEnabled = !inviteOnly && (event.packages_enabled ?? false) && rawPackages.length > 0

  // Availability is published only when the admin turned it on for this event.
  // `show_spots_left` is that switch, and honouring it here is what keeps the
  // tool from disclosing capacity pressure the page deliberately hides.
  const showSpots = event.show_spots_left === true
  const confirmed = showSpots ? await getConfirmedCount(event.id) : 0
  const spotsTaken = showSpots && packagesEnabled ? await getPackageSpotsTaken(event.id) : {}

  const packages: PublicEventPackage[] = packagesEnabled
    ? rawPackages.map(p => ({
        id: p.id,
        name: p.name,
        amountPaise: p.amountPaise,
        details: p.details,
        spotsLeft:
          showSpots && p.spotsTotal && p.spotsTotal > 0
            ? Math.max(p.spotsTotal - (spotsTaken[p.id] ?? 0), 0)
            : null,
      }))
    : []

  return {
    slug: event.slug,
    name: event.name,
    subtitle: event.subtitle,
    eventDate: event.event_date,
    endDate: event.end_date,
    location: event.location,
    priceLabel: inviteOnly
      ? 'Free to apply'
      : eventPriceLabel(event.price_paise, rawPackages, packagesEnabled),
    pricePaise: event.price_paise,
    distanceKm: event.distance_km,
    difficulty: event.difficulty,
    inviteOnly,
    registrationsClosed: event.registrations_closed === true,
    details: event.details,
    postRunLocation: event.post_run_location,
    packages,
    spotsLeft:
      showSpots && event.capacity !== null
        ? Math.max(event.capacity - confirmed, 0)
        : null,
    capacity: showSpots ? event.capacity : null,
    termsAndConditions: event.terms_and_conditions,
    url: `/events/${event.slug}`,
  }
}

// ---------------------------------------------------------------------------
// Leaderboard
// ---------------------------------------------------------------------------

const DEFAULT_BOARD_LIMIT = 10
const MAX_BOARD_LIMIT = 50

export async function getLeaderboard(
  limit: number | undefined,
  sandbox: boolean,
): Promise<{ athletes: PublicAthlete[]; totalAthletes: number }> {
  const size = Math.min(Math.max(limit ?? DEFAULT_BOARD_LIMIT, 1), MAX_BOARD_LIMIT)

  if (sandbox) {
    return { athletes: SANDBOX_ATHLETES.slice(0, size), totalAthletes: SANDBOX_TOTAL_ATHLETES }
  }

  const { rows, totalAthletes } = await getLeaderboardTop(size)

  // `profile_public: false` is an athlete opting out of being linked. The HTML
  // board shows a name and a count only for those rows, so neither the username
  // nor the profile URL is emitted here — returning them would hand an agent
  // exactly the identifier the member asked to withhold.
  const athletes: PublicAthlete[] = rows.map((row, i) => ({
    rank: i + 1,
    name: row.full_name ?? row.username,
    username: row.profile_public ? row.username : null,
    runsCompleted: row.runs_completed,
    tier: getMilestone(row.runs_completed).label,
    url: row.profile_public ? `/profile/${row.username}` : null,
  }))

  return { athletes, totalAthletes }
}

// ---------------------------------------------------------------------------
// Milestones and club info — static, so no sandbox variant is needed
// ---------------------------------------------------------------------------

export function getMilestoneTiers(): PublicMilestoneTier[] {
  return MILESTONE_TIERS.map(tier => ({
    key: tier.key,
    label: tier.label,
    runsRequired: tier.threshold,
    runsForNextTier: tier.nextAt,
    perks: tier.perks,
  }))
}

export function getClubInfo(): PublicClubInfo {
  return {
    name: 'Stride Run Club',
    tagline: 'Move as one.',
    description:
      "A running community in Bengaluru, India. Two to three group runs a week, plus races, curated experiences and brand collaborations. All fitness levels welcome; most people who run with Stride have never run with a club before.",
    city: 'Bengaluru',
    region: 'Karnataka',
    country: 'IN',
    membershipCost: 'Free. No membership fee, no subscription, no paid tiers.',
    runsPerWeek: '2 to 3',
    stats: {
      uniqueRunners2025: '5754',
      firstTimeRunnerShare2025: '63%',
      communityRuns2025: '97',
      peakAttendanceSingleRun: '300+',
      instagramFollowers: '52000+',
      leadStriders: String(LEAD_STRIDERS.length),
      milestoneTiers: String(MILESTONE_TIERS.length),
    },
    links: {
      website: '/',
      events: '/events',
      pricing: '/pricing',
      milestones: '/milestones',
      leaderboard: '/leaderboard',
      team: '/team',
      partnerships: '/partnerships',
      signUp: '/become-a-member',
      instagram: 'https://www.instagram.com/stride_runclub_bengaluru/',
      strava: 'https://www.strava.com/clubs/striderunclubbengaluru',
      email: 'mailto:striderunclubbengaluru@gmail.com',
      sourceCode: 'https://github.com/striderunbengaluru-tech/stride-web-frontend',
    },
    howToJoin:
      'Sign up free at /become-a-member with a Google account. That creates an athlete profile and a four-character Stride Tag. Turn up to a run, read the tag out at the start line, and the run is counted toward your milestone tier. Sign-up and registration are completed by the person in a browser and cannot be delegated to an agent.',
  }
}
