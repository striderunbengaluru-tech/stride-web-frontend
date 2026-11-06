import type { Metadata } from 'next'
import { JsonLd } from '@/components/seo/json-ld'
import { SlayTools } from '@/components/webmcp/slay-tools'
import { SlayAbout } from '@/components/slay/slay-about'
import { SlayExperiences } from '@/components/slay/slay-experiences'
import { SlayDeck } from '@/components/slay/slay-deck'
import { SlayFaq } from '@/components/slay/slay-faq'
import { SlayFooter } from '@/components/slay/slay-footer'
import { SlayHeader } from '@/components/slay/slay-header'
import { SlayHero } from '@/components/slay/slay-hero'
import { SlayJoin } from '@/components/slay/slay-join'
import { SlayMarquee } from '@/components/slay/slay-marquee'
import { SlayTeam } from '@/components/slay/slay-team'
import { SlayTicker } from '@/components/slay/slay-ticker'
import { SLAY_FAQ, SLAY_INTRO, SLAY_UMBRELLA_LINE } from '@/content/slay'
import { SLAY_LOGOS, SLAY_OG_IMAGE } from '@/content/slay-photos'
import { breadcrumbNode, faqPageNode, graph, organizationId } from '@/lib/json-ld'
import { PRODUCTION_SITE_URL } from '@/lib/site-url'

/**
 * Slay Run Club — the women-only community under the Stride umbrella.
 *
 * Deliberately off the Stride design system: Slay has its own palette, display
 * face, header and footer (the root layout's chrome is hidden on this route via
 * `CHROME_FREE_PREFIXES`). Gated to staging by `join-slay/layout.tsx` until the
 * application form is wired to the database.
 */

const PAGE_URL = `${PRODUCTION_SITE_URL}/join-slay`
const TITLE = 'Join Slay Run Club - Women-only running in Bengaluru'
const OG_TITLE = 'Slay Run Club - Women-only run club in Bengaluru'
const OG_DESCRIPTION =
  'Social runs, fitness experiences and curated workshops for women in Bengaluru. No judgement, just women showing up for each other. Apply to join Slay Run Club.'

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: `${SLAY_INTRO} Social runs, fitness experiences and curated workshops in Bengaluru.`,
  keywords: ['Slay Run Club', 'women-only run club Bengaluru', 'women running community', 'run club for women', 'Stride Run Club'],
  alternates: { canonical: '/join-slay', types: { 'text/markdown': '/join-slay.md' } },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    siteName: 'Slay Run Club',
    url: '/join-slay',
    title: OG_TITLE,
    description: OG_DESCRIPTION,
    images: [{ url: SLAY_OG_IMAGE.src, width: SLAY_OG_IMAGE.width, height: SLAY_OG_IMAGE.height, alt: SLAY_OG_IMAGE.alt, type: 'image/jpeg' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: OG_TITLE,
    description: OG_DESCRIPTION,
    images: [{ url: SLAY_OG_IMAGE.src, alt: SLAY_OG_IMAGE.alt }],
  },
}

const jsonLd = graph([
  {
    '@type': 'SportsOrganization',
    '@id': `${PAGE_URL}#organization`,
    name: 'Slay Run Club',
    slogan: 'Slay every move.',
    description: `${SLAY_INTRO} ${SLAY_UMBRELLA_LINE}`,
    url: PAGE_URL,
    logo: SLAY_LOGOS.wordmarkPink.src,
    sport: 'Running',
    areaServed: { '@type': 'City', name: 'Bengaluru' },
    parentOrganization: { '@id': organizationId(PRODUCTION_SITE_URL) },
  },
  faqPageNode(PAGE_URL, SLAY_FAQ),
  breadcrumbNode(PRODUCTION_SITE_URL, [{ name: 'Slay Run Club', path: '/join-slay' }]),
])

export default function JoinSlayPage() {
  return (
    <>
      <JsonLd data={jsonLd} />
      <SlayTools />
      <SlayHeader />
      <main>
        <SlayHero />
        <SlayTicker />
        <SlayAbout />
        <SlayMarquee />
        <SlayExperiences />
        <SlayDeck />
        <SlayTeam />
        <SlayFaq />
        <SlayJoin />
      </main>
      <SlayFooter />
    </>
  )
}
