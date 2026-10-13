import type { ReactNode } from 'react'

// Deep-link anchor for a legal-page section heading, e.g. "5. Cookie Policy" →
// "cookie-policy" (the cookie banner links to /privacy-policy#cookie-policy, the
// registration modal to /terms-of-service#assumption-of-risk). Leading numbers
// are stripped so anchors survive renumbering.
export function headingId(children: ReactNode): string | undefined {
  const text = Array.isArray(children)
    ? children.filter((c): c is string => typeof c === 'string').join(' ')
    : typeof children === 'string' ? children : ''
  if (!text) return undefined
  return text
    .toLowerCase()
    .replace(/^\d+\.?\s*/, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}
