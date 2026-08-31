import type { Metadata } from 'next'
import Link from 'next/link'
import { DEFAULT_OG_IMAGE, OG_IMAGE_WIDTH, OG_IMAGE_HEIGHT } from '@/lib/seo'
import { PRODUCTION_SITE_URL } from '@/lib/site-url'
import { JsonLd } from '@/components/seo/json-ld'
import {
  graph,
  organizationId,
  websiteId,
  breadcrumbNode,
} from '@/lib/json-ld'
import { LEAD_STRIDERS, striderImageUrls } from '@/content/lead-striders'
import { ParallaxUnfurlingGallery } from '@/components/ui/parallax-unfurling-gallery'
import { LeadStriderCard } from '@/components/team/lead-strider-card'

const CANONICAL_PATH = '/team'
const CANONICAL_URL = `${PRODUCTION_SITE_URL}${CANONICAL_PATH}`

// Title carries no brand suffix — the root layout's template appends
// " | Stride Run Club". openGraph/twitter are declared in full because a child
// that omits them inherits the layout's objects wholesale, which makes every
// shared link to this page preview as the homepage.
export const metadata: Metadata = {
  // No brand in this string — the template appends " | Stride Run Club". The
  // openGraph/twitter titles below are NOT templated, so they carry it in full.
  title: 'Lead Striders — Meet the Team',
  description:
    'Meet the seven Lead Striders who run Stride Run Club Bengaluru — the founders, pacers, run captains and organisers behind every group run, training block and race day.',
  keywords: [
    'Stride Run Club team',
    'Lead Striders',
    'Bengaluru run club founders',
    'running community organisers Bengaluru',
    'run captains Bengaluru',
  ],
  alternates: { canonical: CANONICAL_PATH, types: { 'text/markdown': '/team.md' } },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    siteName: 'Stride Run Club',
    url: CANONICAL_PATH,
    title: 'Lead Striders — The Team Behind Stride Run Club',
    description:
      'The seven Lead Striders who set the pace, plan the routes and make race morning happen in Bengaluru.',
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: OG_IMAGE_WIDTH,
        height: OG_IMAGE_HEIGHT,
        alt: 'Stride Run Club — the Lead Striders',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Lead Striders — The Team Behind Stride Run Club',
    description:
      'The seven Lead Striders who set the pace, plan the routes and make race morning happen.',
    images: [DEFAULT_OG_IMAGE],
  },
}

// `Person` nodes carry the team as structured data; the `AboutPage` and the
// `member` edge reference the `WebSite` / `Organization` nodes declared once in
// the root layout by `@id` rather than redeclaring them, so crawlers resolve a
// single organisation across the site.
// Blank fields are omitted rather than emitted empty: an empty `jobTitle` is a
// structured-data warning, and these are claims about real people.
const personNodes = LEAD_STRIDERS.map((strider) => ({
  '@type': 'Person',
  '@id': `${CANONICAL_URL}#${strider.slug}`,
  name: strider.name,
  ...(strider.role ? { jobTitle: strider.role } : {}),
  ...(strider.bio ? { description: strider.bio } : {}),
  image: striderImageUrls(strider)[0],
  url: `${CANONICAL_URL}#${strider.slug}`,
  memberOf: { '@id': `${PRODUCTION_SITE_URL}/#organization` },
  ...(strider.instagramUrl || strider.stravaUrl
    ? { sameAs: [strider.instagramUrl, strider.stravaUrl].filter(Boolean) }
    : {}),
}))

// The organization node is the shared one, not a local re-declaration. This
// page used to emit its own stub at the same `@id` — name, url and members only
// — so two nodes claimed to be the same entity and one of them was missing the
// address, contact points and sameAs. `organizationNode` already lists these
// Person `@id`s in `member`, using the identical `/team#slug` form.
const schemaOrg = graph([
  {
    '@type': 'AboutPage',
    '@id': `${CANONICAL_URL}#webpage`,
    url: CANONICAL_URL,
    name: 'Lead Striders — The Team Behind Stride Run Club',
    description:
      `The ${LEAD_STRIDERS.length} Lead Striders who run Stride Run Club Bengaluru — founders, pacers, run captains and organisers.`,
    image: DEFAULT_OG_IMAGE,
    inLanguage: 'en-IN',
    isPartOf: { '@id': websiteId(PRODUCTION_SITE_URL) },
    about: { '@id': organizationId(PRODUCTION_SITE_URL) },
    breadcrumb: { '@id': `${CANONICAL_URL}#breadcrumb` },
  },
  // The Organization node itself comes from the root layout, which already
  // lists these Person `@id`s in its `member` array. Only the people are new here.
  breadcrumbNode(PRODUCTION_SITE_URL, [{ name: 'Lead Striders', path: CANONICAL_PATH }]),
  ...personNodes,
])

// Every pose of every strider becomes one tile on the spiral — 24 photos. These
// are the same URLs the cards below request, so the hero adds no new source
// images, only the narrower `sizes` variants it renders at.
const GALLERY_IMAGES = LEAD_STRIDERS.flatMap(striderImageUrls)

export default function TeamPage() {
  return (
    <main className='min-h-screen bg-stride-purple-primary'>
      <JsonLd data={schemaOrg} />

      {/* Opens the page with nothing above it, so the wall fills the first
          viewport and the rotation starts on the first pixel of scroll. It also
          owns the page's `h1`, revealed as its scroll completes — a second
          heading above the cards read as a duplicate of it. */}
      <ParallaxUnfurlingGallery
        images={GALLERY_IMAGES}
        label='Lead Striders photo gallery'
        //   (non-breaking space) between "Lead" and "Striders": at 375px the
        // heading must wrap, and it has to break after "your" instead of
        // splitting that pair across two lines.
        revealTitle={'Meet your Lead\u00A0Striders'}
      />

      <section className='px-4 pt-16 pb-28'>
        <div className='mx-auto max-w-6xl'>

          {/* An odd number of striders leaves the last card alone on the final
              row of the 2-up mobile grid. It spans both columns and centres
              itself at one column's width rather than hugging the left edge.
              The 3-up desktop grid divides evenly, so the override lifts at
              `lg`. Applied as real classes on the card — an
              `[&>*:last-child]:max-lg:…` arbitrary variant on this container
              compiled to no CSS at all. */}
          <div className='grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3'>
            {LEAD_STRIDERS.map((strider, i) => {
              const isOrphan =
                LEAD_STRIDERS.length % 2 === 1 && i === LEAD_STRIDERS.length - 1
              return (
                <LeadStriderCard
                  key={strider.slug}
                  strider={strider}
                  cardIndex={i}
                  priority={i < 2}
                  className={
                    isOrphan
                      ? 'col-span-2 mx-auto w-[calc(50%_-_0.5rem)] sm:w-[calc(50%_-_0.75rem)] lg:col-span-1 lg:mx-0 lg:w-auto'
                      : undefined
                  }
                />
              )
            })}
          </div>

          <div className='mt-14 rounded-xl border border-white/15 bg-white/10 p-6 text-center backdrop-blur-md sm:p-10'>
            <h2 className='font-libre text-xl font-bold text-copy-white sm:text-2xl'>
              Run with us
            </h2>
            <p className='mx-auto mt-3 max-w-xl font-figtree text-sm leading-relaxed text-white/70 sm:text-base'>
              Every Lead Strider started out as someone who just turned up. Join
              free, get your Stride Tag, and we will see you at the start line.
            </p>
            <Link
              href='/become-a-member'
              className='mt-6 inline-flex min-h-11 items-center justify-center rounded-md bg-stride-yellow-accent px-6 font-figtree font-semibold text-copy-black transition-opacity hover:opacity-90'
            >
              Become a member
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
