/**
 * The public shapes the MCP tools and `/ask` return.
 *
 * Deliberately narrower than the database rows behind them. Every field here is
 * something the HTML pages already show to anyone, projected explicitly rather
 * than spread from a row — so a column added to `events` or to the leaderboard
 * SQL cannot reach an agent by default. That is the whole point of restating
 * these types instead of re-exporting `EventDetailRow`.
 *
 * Notably absent, and never to be added: anything from `users` beyond a public
 * display name and username, and anything at all from `event_registrations`.
 */

export type PublicEvent = {
  slug: string
  name: string
  subtitle: string | null
  /** ISO 8601 UTC. Clients format it; Stride's own surfaces show IST. */
  eventDate: string | null
  location: string | null
  /** Human-readable, matching what the event card shows: "Free", "₹500", "From ₹750". */
  priceLabel: string
  /** Integer paise. 0 on a packaged event — read `priceLabel` for the headline. */
  pricePaise: number
  distanceKm: number | null
  difficulty: string | null
  inviteOnly: boolean
  registrationsClosed: boolean
  /** Site-relative. The caller makes it absolute against its own origin. */
  url: string
}

export type PublicEventPackage = {
  id: string
  name: string
  amountPaise: number
  details: string
  /** null when the event does not publish per-package availability. */
  spotsLeft: number | null
}

export type PublicEventDetail = PublicEvent & {
  details: string | null
  postRunLocation: string | null
  endDate: string | null
  packages: PublicEventPackage[]
  /** null unless the event has `show_spots_left` set. */
  spotsLeft: number | null
  capacity: number | null
  termsAndConditions: string | null
}

export type PublicAthlete = {
  rank: number
  /** Display name, or the username when no full name is set. */
  name: string
  /** null when the athlete keeps their profile private — so is `url`. */
  username: string | null
  runsCompleted: number
  tier: string
  url: string | null
}

export type PublicMilestoneTier = {
  key: string
  label: string
  runsRequired: number
  runsForNextTier: number | null
  perks: string[]
}

export type PublicClubInfo = {
  name: string
  tagline: string
  description: string
  city: string
  region: string
  country: string
  membershipCost: string
  runsPerWeek: string
  stats: Record<string, string>
  links: Record<string, string>
  howToJoin: string
}
