import type { Metadata } from "next";
import { Libre_Baskerville, Roboto } from "next/font/google";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
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
  title: "Stride Run Club Bengaluru",
  description: "Stride Run Club Bengaluru — Move as One.",
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
      >
        <Navbar />
        {children}
        <Footer />
      </body>
    </html>
  );
}
