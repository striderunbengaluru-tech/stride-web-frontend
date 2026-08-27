import type { PublicEvent, PublicEventDetail, PublicAthlete } from './types'

/**
 * Sandbox data for `?sandbox=1`.
 *
 * Why fixtures rather than "point agents at staging": staging shares the
 * production Supabase project. Its data IS production data, so documenting it
 * as a test environment would be false, and a destructive call there would be
 * destructive for real. These rows are the honest alternative — an agent can
 * exercise every tool, learn the response shape, and touch nothing.
 *
 * Everything here is obviously synthetic. Slugs are prefixed `sandbox-`, the
 * athlete names are placeholders, and no value is copied from a real event or a
 * real member. That is deliberate: a fixture that looks real is a fixture that
 * ends up quoted as real.
 */

export const SANDBOX_EVENTS: PublicEvent[] = [
  {
    slug: 'sandbox-saturday-community-run',
    name: 'Sandbox Saturday Community Run',
    subtitle: 'An example free community run',
    eventDate: '2099-01-04T01:00:00.000Z',
    location: 'Example Park, Bengaluru',
    priceLabel: 'Free',
    pricePaise: 0,
    distanceKm: 5,
    difficulty: 'Beginner',
    inviteOnly: false,
    registrationsClosed: false,
    url: '/events/sandbox-saturday-community-run',
  },
  {
    slug: 'sandbox-tiered-trail-race',
    name: 'Sandbox Tiered Trail Race',
    subtitle: 'An example paid event with packages',
    eventDate: '2099-02-15T01:30:00.000Z',
    location: 'Example Trailhead, Bengaluru',
    priceLabel: 'From ₹750',
    pricePaise: 0,
    distanceKm: 21,
    difficulty: 'Advanced',
    inviteOnly: false,
    registrationsClosed: false,
    url: '/events/sandbox-tiered-trail-race',
  },
  {
    slug: 'sandbox-invite-only-shakeout',
    name: 'Sandbox Invite-Only Shakeout',
    subtitle: 'An example invite-only event',
    eventDate: '2099-03-01T01:00:00.000Z',
    location: 'Example Stadium, Bengaluru',
    priceLabel: 'Free to apply',
    pricePaise: 0,
    distanceKm: 3,
    difficulty: 'Beginner',
    inviteOnly: true,
    registrationsClosed: false,
    url: '/events/sandbox-invite-only-shakeout',
  },
]

export const SANDBOX_EVENT_DETAIL: Record<string, PublicEventDetail> = {
  'sandbox-saturday-community-run': {
    ...SANDBOX_EVENTS[0],
    details:
      'This is sandbox data. A real community run listing carries the route, the pace groups, what to bring and where the post-run coffee is.',
    postRunLocation: 'Example Cafe, Bengaluru',
    endDate: null,
    packages: [],
    spotsLeft: 42,
    capacity: 60,
    termsAndConditions: null,
  },
  'sandbox-tiered-trail-race': {
    ...SANDBOX_EVENTS[1],
    details: 'This is sandbox data. Shows how a packaged event returns its tiers.',
    postRunLocation: null,
    endDate: null,
    packages: [
      { id: 'sandbox-run-only', name: 'Run only', amountPaise: 75000, details: 'Race entry and timing.', spotsLeft: 30 },
      { id: 'sandbox-run-tee', name: 'Run + tee', amountPaise: 125000, details: 'Race entry, timing and an event tee.', spotsLeft: 12 },
    ],
    spotsLeft: 42,
    capacity: 80,
    termsAndConditions: 'Sandbox terms. Real events carry their own.',
  },
  'sandbox-invite-only-shakeout': {
    ...SANDBOX_EVENTS[2],
    details:
      'This is sandbox data. Registering for a real invite-only event submits a free application that Stride reviews; nothing is charged.',
    postRunLocation: null,
    endDate: null,
    packages: [],
    spotsLeft: null,
    capacity: 25,
    termsAndConditions: null,
  },
}

export const SANDBOX_ATHLETES: PublicAthlete[] = [
  { rank: 1, name: 'Example Athlete One', username: 'sandbox-athlete-one', runsCompleted: 118, tier: 'Stride Legend', url: '/profile/sandbox-athlete-one' },
  { rank: 2, name: 'Example Athlete Two', username: 'sandbox-athlete-two', runsCompleted: 81, tier: 'Stride Pro Athlete', url: '/profile/sandbox-athlete-two' },
  { rank: 3, name: 'Example Athlete Three', username: null, runsCompleted: 44, tier: 'Stride Athlete', url: null },
  { rank: 4, name: 'Example Athlete Four', username: 'sandbox-athlete-four', runsCompleted: 12, tier: 'Strider', url: '/profile/sandbox-athlete-four' },
  { rank: 5, name: 'Example Athlete Five', username: 'sandbox-athlete-five', runsCompleted: 2, tier: 'Duckling', url: '/profile/sandbox-athlete-five' },
]

export const SANDBOX_TOTAL_ATHLETES = 1234
