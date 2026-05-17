import type { Metadata } from "next";
import { Libre_Baskerville, Roboto } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Navbar from "@/components/layout/navbar";
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

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://strideclub.in'),
  title: {
    default: 'Stride Run Club Bengaluru — Move as One',
    template: '%s | Stride Run Club',
  },
  description:
    "Bengaluru's most engaged running community. 52,000+ followers, 6,894 runners, 97+ events a year. Join Stride Run Club.",
  icons: {
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
    icon: [
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
  },
  manifest: '/site.webmanifest',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${libreBaskerville.variable} ${roboto.variable} font-body antialiased`}
        suppressHydrationWarning
      >
        <AuthProvider>
          <Navbar />
          <div className='pb-20 md:pb-0'>
            {children}
            <Footer />
          </div>
          <MobileBottomNav />
        </AuthProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
