import { Anton } from 'next/font/google'
import './slay.css'

// Slay's own display face. Loaded here, not in the root layout, so no other
// page downloads it.
const anton = Anton({
  variable: '--font-anton',
  subsets: ['latin'],
  weight: '400',
})

export default function JoinSlayLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${anton.variable} slay-page min-h-svh overflow-x-clip bg-slay-ink text-copy-white`}>
      {children}
    </div>
  )
}
