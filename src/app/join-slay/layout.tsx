import localFont from 'next/font/local'
import './slay.css'

// Slay's own display face. Loaded here, not in the root layout, so no other
// page downloads it. Self-hosted like the root layout's fonts, so the build
// never depends on Google Fonts answering.
const anton = localFont({
  variable: '--font-anton',
  src: './fonts/anton-latin.woff2',
  weight: '400',
  display: 'swap',
})

export default function JoinSlayLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${anton.variable} slay-page min-h-svh overflow-x-clip bg-slay-ink text-copy-white`}>
      {children}
    </div>
  )
}
