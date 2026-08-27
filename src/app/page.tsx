import type { Metadata } from 'next'
import HeroSection from '@/components/home/hero-section';
import { UpNextSection } from '@/components/home/up-next-section';
import NewsroomSection from '@/components/home/newsroom-section';
import SpotlightSection from '@/components/home/spotlight-section';
import FaqSection from '@/components/home/faq-section';
import { JsonLd } from '@/components/seo/json-ld';
import {
  graph,
  websiteId,
  organizationId,
  faqPageNode,
  breadcrumbNode,
} from '@/lib/json-ld';
import { FAQ_ENTRIES } from '@/lib/markdown/render';

const OG_IMAGE = 'https://ienotcjldormdxrzukpk.supabase.co/storage/v1/object/public/stride-assets/images/web-assets/homepage-og.png'
const SITE_ORIGIN = 'https://www.strideclub.in'
const CANONICAL_URL = 'https://www.strideclub.in/'

export const metadata: Metadata = {
  title: "Stride Run Club Bengaluru - The 'Fittest Club' in India.",
  description:
    "Bengaluru's most engaged running community. 52,000+ followers, 7,000+ athletes, 97+ events a year. Whether you're chasing a PB or your first 5K, you belong here. Join Stride Run Club.",
  keywords: [
    'Stride Run Club',
    'running club Bengaluru',
    'running club Bangalore',
    'Bengaluru athletes',
    'run club India',
    'community running',
    'beginner running',
    '5K Bengaluru',
    'Agara Lake run',
    'fitness community Bengaluru',
    'social running club',
  ],
  openGraph: {
    title: 'Stride Run Club Bengaluru — Move as One',
    description:
      "Bengaluru's most engaged running community. 52,000+ followers, 7,000+ athletes, 97+ events a year. Whether you're chasing a PB or your first 5K, you belong here.",
    url: CANONICAL_URL,
    siteName: 'Stride Run Club',
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: 'Stride Run Club Bengaluru — Move as One',
      },
    ],
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Stride Run Club Bengaluru — Move as One',
    description:
      "Bengaluru's most engaged running community. 52,000+ followers, 7,000+ athletes, 97+ events a year.",
    images: [OG_IMAGE],
  },
  alternates: {
    canonical: CANONICAL_URL,
    types: { 'text/markdown': '/index.md' },
  },
  other: {
    'og:logo': 'https://ienotcjldormdxrzukpk.supabase.co/storage/v1/object/public/stride-assets/images/logos/stride-logo-color-transparent.png',
  },
}

/**
 * The homepage graph.
 *
 * Organization and WebSite come from @/lib/json-ld so this page cannot disagree
 * with the rest of the site — the previous hand-written copy here listed
 * `strava.com/clubs/stride-run-club`, which is not Stride's Strava club, so the
 * one property whose job is disambiguating the brand was pointing at the wrong
 * entity.
 *
 * FAQPage is new and reads the same `faq.json` the visible FAQ section renders,
 * so the structured answers and the on-page answers are the same words.
 */
// WebSite and SportsOrganization are NOT repeated here. The root layout emits
// both on every page from the same @/lib/json-ld functions, so restating them
// would ship the identical nodes twice per response for no gain — the `@id`
// references below resolve against the layout's copies.
const schemaOrg = graph([
  faqPageNode(SITE_ORIGIN, FAQ_ENTRIES),
  breadcrumbNode(SITE_ORIGIN, []),
  {
    '@type': 'WebPage',
    '@id': `${CANONICAL_URL}#webpage`,
    url: CANONICAL_URL,
    name: 'Stride Run Club Bengaluru — Move as One',
    description:
      "Bengaluru's most engaged running community. 52,000+ followers, 7,000+ athletes, 97+ events a year.",
    image: OG_IMAGE,
    inLanguage: 'en-IN',
    isPartOf: { '@id': websiteId(SITE_ORIGIN) },
    about: { '@id': organizationId(SITE_ORIGIN) },
    breadcrumb: { '@id': `${SITE_ORIGIN}/#breadcrumb` },
    primaryImageOfPage: { '@type': 'ImageObject', url: OG_IMAGE },
  },
])

export default function Home() {
  return (
    <main>
      <JsonLd data={schemaOrg} />
      <HeroSection />
      {/* Renders nothing when there's no upcoming run */}
      <UpNextSection />
      <NewsroomSection />
      <SpotlightSection />
      <FaqSection />
    </main>
  );
}
