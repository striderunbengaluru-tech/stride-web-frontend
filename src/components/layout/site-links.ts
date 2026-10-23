import { CalendarDays, Flag, Handshake, Trophy, Users } from 'lucide-react'

// Site navigation shown in the navbar's avatar menu, for members and guests
// alike. The desktop navbar carries no links of its own, so this menu is where
// visitors reach the main pages — mirroring the mobile bottom nav.
// `/team` is labelled "Team" here and in the footer, deliberately shorter than
// the "Lead Striders" wording on the page itself — a nav row reads better as a
// single word.
export const SITE_LINKS = [
  { label: 'Events',       href: '/events',        icon: CalendarDays },
  { label: 'Races',        href: '/race-calendar', icon: Flag },
  { label: 'Team',         href: '/team',          icon: Users },
  { label: 'Partnerships', href: '/partnerships',  icon: Handshake },
  { label: 'Leaderboard',  href: '/leaderboard',   icon: Trophy },
] as const
