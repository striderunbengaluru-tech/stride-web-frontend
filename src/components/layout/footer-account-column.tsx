'use client'

import { useAuth } from '@/components/auth/auth-provider'
import { NavLoadingLink } from './nav-loading-link'

// Client island so the footer (and the whole layout) can stay static. The
// heading always renders; only the links depend on the session:
//   signed out → Become a Member
//   signed in  → My Profile + My Runs (no point offering to join twice)
// While the session resolves we render placeholder bars rather than guessing,
// so the column never shows the wrong links and never shifts height.
// Markup mirrors the server-rendered Column in footer.tsx.
export function FooterAccountColumn() {
  const { status, navProfile } = useAuth()

  const links =
    status === 'signed-in'
      ? [
          // navProfile can lag a frame behind `status`; skip the profile link
          // until we know the username rather than linking to /profile/undefined.
          ...(navProfile?.username
            ? [{ title: 'My Profile', href: `/profile/${navProfile.username}` }]
            : []),
          { title: 'My Runs', href: '/my-runs' },
        ]
      : [{ title: 'Become a Member', href: '/become-a-member' }]

  return (
    <nav aria-label='Account links' className='flex flex-col gap-3.5'>
      <p className='text-[10px] font-mono uppercase tracking-[0.25em] text-stride-yellow-accent'>
        Account
      </p>

      {status === 'loading' ? (
        <div className='flex flex-col gap-3' aria-hidden='true'>
          <span className='h-4 w-28 rounded bg-white/10 animate-pulse' />
          <span className='h-4 w-20 rounded bg-white/10 animate-pulse' />
        </div>
      ) : (
        <ul className='flex flex-col gap-3'>
          {links.map(link => (
            <li key={link.href}>
              <NavLoadingLink
                href={link.href}
                className='text-white/70 text-sm hover:text-stride-yellow-accent transition-colors duration-150 font-figtree inline-block'
              >
                {link.title}
              </NavLoadingLink>
            </li>
          ))}
        </ul>
      )}
    </nav>
  )
}
