import type { Metadata } from "next";
import { Libre_Baskerville, Figtree, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { CampaignArrival } from "@/components/analytics/campaign-arrival";
import { GoogleAnalytics } from "@/components/analytics/google-analytics";
import Navbar from "@/components/layout/navbar";
import { NavbarGate } from "@/components/layout/navbar-gate";
import Footer from "@/components/layout/footer";
import MobileBottomNav from "@/components/layout/mobile-bottom-nav";
import { CookieNotice } from "@/components/layout/cookie-notice";
import { AuthProvider } from "@/components/auth/auth-provider";
import { JsonLd } from "@/components/seo/json-ld";
import { graph, organizationNode, websiteNode, founderNode } from "@/lib/json-ld";
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
  // 300 dropped — no font-light usage anywhere in src/
  weight: ["400", "500", "600", "700"],
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

/**
 * The site-wide identity graph.
 *
 * Built from @/lib/json-ld rather than inline, so `#organization` and `#website`
 * mean the same thing on every page that references them by `@id` — this used
 * to be one of six hand-written copies, and two of them already disagreed about
 * `sameAs`.
 *
 * Hardcoded to the production origin on purpose. This is a static layout with
 * no request access, and a canonical entity identifier must not vary by
 * deployment: a preview emitting `@id: preview-url/#organization` would be
 * claiming a second, different organisation.
 */
const jsonLd = graph([websiteNode(SITE_URL), organizationNode(SITE_URL), founderNode(SITE_URL)])

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <JsonLd data={jsonLd} />
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
          <CookieNotice />
        </AuthProvider>
        <Analytics />
        {/* Turns ?utm_* tags into a custom event, because UTM filtering itself
            is a Web Analytics Plus feature and this team is on plain Pro. */}
        <CampaignArrival />
        {/* Production only, and a no-op until NEXT_PUBLIC_GA_MEASUREMENT_ID is
            set. Unlike the two above it, GA sets cookies — see the note in the
            component and Section 5 of the privacy policy. */}
        <GoogleAnalytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
