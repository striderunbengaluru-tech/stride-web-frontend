import { LEAD_STRIDERS } from '@/content/lead-striders'
import { MILESTONE_TIERS } from '@/lib/milestones'
import type { PublicEvent, PublicEventDetail } from '@/lib/mcp/types'

/**
 * Every schema.org node Stride emits, built in one place.
 *
 * There used to be six hand-rolled JSON-LD objects across the app, each with
 * its own copy of the Organization block. They cross-referenced `#organization`
 * and `#website` by `@id` correctly, which is exactly why the drift was
 * dangerous: two pages could claim different facts about the same `@id` and a
 * consumer would take whichever it read last.
 *
 * `sameAs` matters more than its size suggests. It is how an assistant tells
 * this Stride from every other company called Stride, so anything that
 * independently identifies the club belongs in it.
 */

const CONTACT_EMAIL = 'striderunclubbengaluru@gmail.com'
const INSTAGRAM_URL = 'https://www.instagram.com/stride_runclub_bengaluru/'
const STRAVA_URL = 'https://www.strava.com/clubs/striderunclubbengaluru'
const GITHUB_URL = 'https://github.com/striderunbengaluru-tech'

/**
 * Third-party identities for the club.
 *
 * A Wikidata item is the highest-value entry this list can gain — it is the
 * spine of the knowledge graphs behind Google, Bing and most assistants. There
 * isn't one for Stride yet; add its URL here the day it exists, and nothing
 * else needs to change.
 */
export const SAME_AS: string[] = [INSTAGRAM_URL, STRAVA_URL, GITHUB_URL]

export const LOGO_PATH = '/assets/images/stride-logo-color-transparent.png'

export function organizationId(origin: string): string {
  return `${origin}/#organization`
}

export function websiteId(origin: string): string {
  return `${origin}/#website`
}

/**
 * The club, as `SportsOrganization` — a subtype of Organization, so it still
 * satisfies anything looking for the broader type while saying what the
 * organisation actually does.
 *
 * `contactPoint` and `address` are here because they are what a consumer checks
 * to decide a business is real. Both are genuinely public: the email is on the
 * contact page and the address is the city, which is as specific as a run club
 * with no premises can honestly be.
 */
export function organizationNode(origin: string) {
  return {
    '@type': 'SportsOrganization',
    '@id': organizationId(origin),
    name: 'Stride Run Club',
    alternateName: ['Stride Run Club Bengaluru', 'Stride'],
    url: origin,
    slogan: 'Move as one.',
    description:
      "Bengaluru's most engaged running community. Two to three group runs a week, plus races and curated experiences. Membership is free and all fitness levels are welcome.",
    sport: 'Running',
    foundingDate: '2022',
    logo: {
      '@type': 'ImageObject',
      url: `${origin}${LOGO_PATH}`,
      width: 280,
      height: 92,
    },
    image: `${origin}${LOGO_PATH}`,
    email: CONTACT_EMAIL,
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        email: CONTACT_EMAIL,
        url: `${origin}/contact-us`,
        availableLanguage: ['en', 'en-IN'],
        areaServed: 'IN',
      },
      {
        '@type': 'ContactPoint',
        contactType: 'sales',
        name: 'Brand partnerships',
        email: CONTACT_EMAIL,
        url: `${origin}/partnerships`,
        availableLanguage: ['en', 'en-IN'],
        areaServed: 'IN',
      },
    ],
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Bengaluru',
      addressRegion: 'Karnataka',
      addressCountry: 'IN',
    },
    areaServed: {
      '@type': 'City',
      name: 'Bengaluru',
      containedInPlace: { '@type': 'AdministrativeArea', name: 'Karnataka, India' },
    },
    location: {
      '@type': 'Place',
      name: 'Bengaluru, Karnataka, India',
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Bengaluru',
        addressRegion: 'Karnataka',
        addressCountry: 'IN',
      },
    },
    foundingLocation: { '@type': 'Place', name: 'Bengaluru, India' },
    member: LEAD_STRIDERS.map(strider => ({
      '@type': 'Person',
      '@id': `${origin}/team#${strider.slug}`,
    })),
    sameAs: SAME_AS,
  }
}

export function websiteNode(origin: string) {
  return {
    '@type': 'WebSite',
    '@id': websiteId(origin),
    url: origin,
    name: 'Stride Run Club',
    description: "Bengaluru's most engaged running community. Move as one.",
    inLanguage: 'en-IN',
    publisher: { '@id': organizationId(origin) },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${origin}/events?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }
}

/** `[{ name: 'Events', path: '/events' }]` — Home is prepended automatically. */
export function breadcrumbNode(
  origin: string,
  trail: { name: string; path: string }[],
) {
  const items = [{ name: 'Home', path: '/' }, ...trail]
  return {
    '@type': 'BreadcrumbList',
    '@id': `${origin}${trail[trail.length - 1]?.path ?? '/'}#breadcrumb`,
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `${origin}${item.path === '/' ? '' : item.path}` || origin,
    })),
  }
}

export function faqPageNode(
  origin: string,
  entries: { question: string; answer: string }[],
) {
  return {
    '@type': 'FAQPage',
    '@id': `${origin}/#faq`,
    mainEntity: entries.map(entry => ({
      '@type': 'Question',
      name: entry.question,
      acceptedAnswer: { '@type': 'Answer', text: entry.answer },
    })),
  }
}

/**
 * One `Offer` per way to pay for an event.
 *
 * A packaged event gets one Offer per package rather than a single "from"
 * price — that is what makes a price comparison correct instead of merely
 * plausible. Invite-only events are free `Offer`s, because applying costs
 * nothing and pretending there is no offer at all would read as "not
 * available".
 */
function offerNodes(origin: string, event: PublicEventDetail) {
  const url = `${origin}${event.url}`
  const availability = event.registrationsClosed
    ? 'https://schema.org/SoldOut'
    : 'https://schema.org/InStock'

  if (event.packages.length > 0) {
    return event.packages.map(pkg => ({
      '@type': 'Offer',
      name: pkg.name,
      description: pkg.details || undefined,
      price: (pkg.amountPaise / 100).toFixed(2),
      priceCurrency: 'INR',
      availability,
      url,
      category: 'Event registration',
    }))
  }

  return [
    {
      '@type': 'Offer',
      name: event.inviteOnly ? 'Application (free)' : 'Registration',
      price: (event.pricePaise / 100).toFixed(2),
      priceCurrency: 'INR',
      availability,
      url,
      category: 'Event registration',
    },
  ]
}

/**
 * An event as `SportsEvent`.
 *
 * Events are Stride's core entity and carried no structured data at all before
 * this — so nothing could answer "when is the next Stride run and what does it
 * cost" without reading the page.
 *
 * `eventAttendanceMode` is always offline: every Stride run happens in
 * Bengaluru, in person. Omitting it makes a consumer guess.
 */
export function sportsEventNode(origin: string, event: PublicEventDetail) {
  const url = `${origin}${event.url}`

  return {
    '@type': 'SportsEvent',
    '@id': `${url}#event`,
    name: event.name,
    description: event.subtitle ?? `${event.name} — a Stride Run Club event in Bengaluru.`,
    url,
    startDate: event.eventDate ?? undefined,
    endDate: event.endDate ?? undefined,
    eventStatus: event.registrationsClosed
      ? 'https://schema.org/EventScheduled'
      : 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    sport: 'Running',
    isAccessibleForFree: event.pricePaise === 0 && event.packages.length === 0,
    location: {
      '@type': 'Place',
      name: event.location ?? 'Bengaluru',
      address: {
        '@type': 'PostalAddress',
        streetAddress: event.location ?? undefined,
        addressLocality: 'Bengaluru',
        addressRegion: 'Karnataka',
        addressCountry: 'IN',
      },
    },
    organizer: { '@id': organizationId(origin) },
    performer: { '@id': organizationId(origin) },
    maximumAttendeeCapacity: event.capacity ?? undefined,
    offers: offerNodes(origin, event),
    ...(event.distanceKm
      ? {
          additionalProperty: [
            {
              '@type': 'PropertyValue',
              name: 'Distance',
              value: event.distanceKm,
              unitCode: 'KMT',
            },
            ...(event.difficulty
              ? [{ '@type': 'PropertyValue', name: 'Difficulty', value: event.difficulty }]
              : []),
          ],
        }
      : {}),
  }
}

/** The events index as an `ItemList` of lightweight event references. */
export function eventListNode(origin: string, events: PublicEvent[]) {
  return {
    '@type': 'ItemList',
    '@id': `${origin}/events#list`,
    name: 'Stride Run Club events',
    numberOfItems: events.length,
    itemListElement: events.map((event, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${origin}${event.url}`,
      name: event.name,
    })),
  }
}

/**
 * Membership as a free `Offer` on a `Service`.
 *
 * The literal answer to "how much does Stride cost", in a form a consumer can
 * read without parsing prose. `price: '0'` with a currency is deliberate —
 * omitting the price entirely reads as "unknown", not "free".
 */
export function membershipServiceNode(origin: string) {
  return {
    '@type': 'Service',
    '@id': `${origin}/pricing#membership`,
    name: 'Stride Run Club membership',
    serviceType: 'Running club membership',
    description:
      'Free membership of Stride Run Club. Includes an athlete profile, a Stride Tag for checking in at runs, milestone tier progression, community access, and entry to every free community run.',
    provider: { '@id': organizationId(origin) },
    areaServed: { '@type': 'City', name: 'Bengaluru' },
    url: `${origin}/pricing`,
    termsOfService: `${origin}/terms-of-service`,
    offers: {
      '@type': 'Offer',
      name: 'Free membership',
      price: '0',
      priceCurrency: 'INR',
      availability: 'https://schema.org/InStock',
      url: `${origin}/become-a-member`,
      eligibleRegion: { '@type': 'Country', name: 'India' },
      description: 'No membership fee, no subscription, and no paid tiers.',
    },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Milestone tiers',
      itemListElement: MILESTONE_TIERS.map(tier => ({
        '@type': 'Offer',
        name: tier.label,
        price: '0',
        priceCurrency: 'INR',
        description: `Earned at ${tier.threshold} runs attended. Includes: ${tier.perks.join('; ')}.`,
      })),
    },
  }
}

/** Wraps nodes in the `@graph` envelope every page uses. */
export function graph(nodes: unknown[]) {
  return { '@context': 'https://schema.org', '@graph': nodes }
}
