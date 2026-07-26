import type { Metadata } from 'next'
import HeroSection from '@/components/home/hero-section';
import NewsroomSection from '@/components/home/newsroom-section';
import SpotlightSection from '@/components/home/spotlight-section';
import FaqSection from '@/components/home/faq-section';

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
  },
  other: {
    'og:logo': 'https://ienotcjldormdxrzukpk.supabase.co/storage/v1/object/public/stride-assets/images/logos/stride-logo-color-transparent.svg',
  },
}

const schemaOrg = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${SITE_ORIGIN}/#website`,
      url: SITE_ORIGIN,
      name: 'Stride Run Club',
      description:
        "Bengaluru's most engaged running community: 7,000+ athletes, 52,000+ Instagram followers, and 97+ events per year.",
      publisher: { '@id': `${SITE_ORIGIN}/#organization` },
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${SITE_ORIGIN}/events?q={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@type': 'WebPage',
      '@id': `${CANONICAL_URL}#webpage`,
      url: CANONICAL_URL,
      name: 'Stride Run Club Bengaluru — Move as One',
      description:
        "Bengaluru's most engaged running community. 52,000+ followers, 7,000+ athletes, 97+ events a year.",
      image: OG_IMAGE,
      inLanguage: 'en-IN',
      isPartOf: { '@id': `${SITE_ORIGIN}/#website` },
      about: { '@id': `${SITE_ORIGIN}/#organization` },
      breadcrumb: {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: CANONICAL_URL,
          },
        ],
      },
    },
    {
      '@type': 'SportsOrganization',
      '@id': `${SITE_ORIGIN}/#organization`,
      name: 'Stride Run Club Bengaluru',
      alternateName: ['Stride Run Club', 'Stride RC'],
      url: SITE_ORIGIN,
      logo: {
        '@type': 'ImageObject',
        url: 'https://ienotcjldormdxrzukpk.supabase.co/storage/v1/object/public/stride-assets/images/logos/stride-logo-color-transparent.svg',
        width: 400,
        height: 130,
      },
      image: OG_IMAGE,
      description:
        "India's most engaged running community: 7,000+ athletes, 52,000+ Instagram followers, and 97+ events per year across Bengaluru.",
      foundingDate: '2022',
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
      sameAs: [
        'https://www.instagram.com/stride_runclub_bengaluru/',
        'https://www.strava.com/clubs/stride-run-club',
      ],
      numberOfEmployees: {
        '@type': 'QuantitativeValue',
        value: 6894,
        unitText: 'community members',
      },
      sport: 'Running',
    },
  ],
}

export default function Home() {
  return (
    <main>
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrg) }}
      />
      <HeroSection />
      <NewsroomSection />
      <SpotlightSection />
      <FaqSection />
    </main>
  );
}
