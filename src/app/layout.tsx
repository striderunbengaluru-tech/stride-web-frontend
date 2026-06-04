import type { Metadata } from "next";
import { Libre_Baskerville, Figtree, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Navbar from "@/components/layout/navbar";
import { NavbarGate } from "@/components/layout/navbar-gate";
import Footer from "@/components/layout/footer";
import MobileBottomNav from "@/components/layout/mobile-bottom-nav";
import { AuthProvider } from "@/components/auth/auth-provider";
import "./globals.css";

const libreBaskerville = Libre_Baskerville({
  variable: "--font-libre-baskerville",
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
});

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const SITE_URL = 'https://www.strideclub.in'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Stride Run Club Bengaluru — Move as One',
    template: '%s | Stride Run Club',
  },
  description:
    "Bengaluru's most engaged running community. 52,000+ followers, 7,000+ athletes, 97+ events a year. Join Stride Run Club.",
  keywords: ['Stride Run Club', 'Bengaluru running', 'running community', 'group runs Bengaluru', '10K', 'half marathon', 'marathon training'],
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: SITE_URL,
    siteName: 'Stride Run Club',
    title: 'Stride Run Club Bengaluru — Move as One',
    description: "Bengaluru's most engaged running community. Join group runs, earn milestones, and get your shareable athlete profile.",
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Stride Run Club Bengaluru — Move as One',
    description: "Bengaluru's most engaged running community.",
  },
  icons: {
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
    icon: [
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
  },
  manifest: '/site.webmanifest',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: SITE_URL,
      name: 'Stride Run Club',
      description: "Bengaluru's most engaged running community. Move as one.",
      inLanguage: 'en-IN',
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${SITE_URL}/events?q={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: 'Stride Run Club',
      url: SITE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/assets/images/stride-logo-color-transparent.svg`,
        width: 280,
        height: 92,
      },
      foundingLocation: {
        '@type': 'Place',
        name: 'Bengaluru, India',
      },
      sameAs: [
        'https://www.instagram.com/stride_runclub_bengaluru/',
        'https://www.strava.com/clubs/striderunclubbengaluru',
      ],
    },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${libreBaskerville.variable} ${figtree.variable} ${geistMono.variable} font-body antialiased`}
        suppressHydrationWarning
      >
        <AuthProvider>
          {/* Navbar always renders — internal pieces hide themselves on /admin */}
          <Navbar />
          <div className='pb-20 md:pb-0'>
            {children}
            <Footer />
          </div>
          {/* MobileBottomNav is a consumer-only nav, hidden entirely on /admin */}
          <NavbarGate>
            <MobileBottomNav />
          </NavbarGate>
        </AuthProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
