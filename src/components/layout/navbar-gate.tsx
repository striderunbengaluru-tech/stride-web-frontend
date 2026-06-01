'use client'

import { usePathname } from 'next/navigation'

// Renders children only when NOT on an /admin/* route. Used to:
//   • hide the consumer mobile bottom nav on admin pages (full wrap), and
//   • hide just the nav-links + Partner CTA inside the main navbar so the
//     logo + user menu remain visible to admins.
export function HideOnAdminRoute({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  if (pathname?.startsWith('/admin')) return null
  return <>{children}</>
}

// Backwards-compat export — old call sites still import { NavbarGate }.
export const NavbarGate = HideOnAdminRoute
