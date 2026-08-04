// Shared building blocks for the admin user views. Both /admin/users and the
// attendee rows under /admin/registrations show the same person in the same
// shape, so the avatar and the labelled-fact row live here rather than being
// re-written per screen.

import type { ReactNode } from 'react'

export const GENDER_LABEL: Record<string, string> = {
  MALE: 'Male',
  FEMALE: 'Female',
  OTHER: 'Other',
  PREFER_NOT_TO_SAY: 'Prefer not to say',
}

/**
 * `tel:` target for a stored number, or null when there is nothing dialable.
 * Everything but digits and a leading `+` is dropped — numbers are entered with
 * spaces, dashes and brackets, none of which belong in the URI.
 */
export function telHref(number: string | null | undefined): string | null {
  if (!number) return null
  const cleaned = number.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '')
  return cleaned.replace(/\D/g, '').length >= 6 ? `tel:${cleaned}` : null
}

/** `mailto:` target for a stored address, or null when there's nothing to mail. */
export function mailtoHref(email: string | null | undefined): string | null {
  const trimmed = email?.trim()
  return trimmed && trimmed.includes('@') ? `mailto:${trimmed}` : null
}

/**
 * Avatars are user-uploaded or Google-hosted, so the hostname isn't known at
 * build time — a plain `<img>` per the project's image rules.
 */
export function Avatar({
  url,
  name,
  size = 'md',
}: {
  url: string | null
  name: string | null
  size?: 'sm' | 'md'
}) {
  const initial = (name ?? '?').charAt(0).toUpperCase()
  const box = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm'

  return (
    <div
      className={`${box} rounded-full overflow-hidden border-2 border-white/15 bg-stride-yellow-accent/20 flex items-center justify-center shrink-0`}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={name ?? ''} className='w-full h-full object-cover' loading='lazy' fetchPriority='low' />
      ) : (
        <span className='text-stride-yellow-accent font-bold'>{initial}</span>
      )}
    </div>
  )
}

/**
 * One labelled profile fact. Pass `href` to make the value actionable — phone
 * numbers become `tel:` links so an admin can dial straight from the panel.
 */
export function Fact({
  icon,
  label,
  value,
  href,
}: {
  icon: ReactNode
  label: string
  value: string
  href?: string | null
}) {
  return (
    <div className='flex items-start gap-2.5'>
      <span className='shrink-0 mt-0.5 w-5 h-5 rounded-md bg-white/8 border border-white/10 flex items-center justify-center text-white/45'>
        {icon}
      </span>
      <div className='min-w-0 flex-1'>
        <p className='text-white/30 text-[10px] font-mono uppercase tracking-widest'>{label}</p>
        {href ? (
          // Vertical padding rather than min-h so the row keeps a 44px tap
          // target on a phone without `truncate` losing its block box.
          <a
            href={href}
            className='block truncate py-2.5 sm:py-0 text-stride-yellow-accent text-sm hover:underline underline-offset-2'
          >
            {value}
          </a>
        ) : (
          <p className='text-white/75 text-sm truncate'>{value}</p>
        )}
      </div>
    </div>
  )
}
