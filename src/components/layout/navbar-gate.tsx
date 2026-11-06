'use client'

import { usePathname } from 'next/navigation'

// Pages that bring their own header and footer instead of Stride's — currently
// only the Slay Run Club landing page, which has its own brand.
const CHROME_FREE_PREFIXES = ['/join-slay'] as const

function isChromeFreePath(pathname: string | null): boolean {
  return CHROME_FREE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname?.startsWith(`${prefix}/`)
  )
}

// Renders children only when NOT on an /admin/* route. Used to:
//   • hide the consumer mobile bottom nav on admin pages (full wrap), and
//   • hide just the signed-out corner (Partner CTA + guest menu) inside the
//     main navbar so the logo + user menu remain visible to admins.
export function HideOnAdminRoute({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  if (pathname?.startsWith('/admin')) return null
  return <>{children}</>
}

// Backwards-compat export — old call sites still import { NavbarGate }.
export const NavbarGate = HideOnAdminRoute

// Renders Stride's site chrome (navbar, footer, bottom nav) everywhere except
// the pages that bring their own.
export function HideOnChromeFreeRoute({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  if (isChromeFreePath(pathname)) return null
  return <>{children}</>
}

// The page wrapper. Its bottom padding clears the fixed mobile bottom nav, so it
// is dropped wherever that nav is not rendered.
export function ContentFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return <div className={isChromeFreePath(pathname) ? undefined : 'pb-20 md:pb-0'}>{children}</div>
}
