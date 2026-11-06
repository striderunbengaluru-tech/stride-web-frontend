'use client'

import { useWebMcpTools } from '@/hooks/use-web-mcp-tools'
import { toolJson } from '@/lib/webmcp'
import { SLAY_EXPERIENCES, SLAY_INTRO, SLAY_TAGLINE, SLAY_TEAM, SLAY_UMBRELLA_LINE } from '@/content/slay'

// Its own module, not page-tools.tsx: other pages import that file, and this
// one pulls in the Slay content and photo manifest they have no use for.
/**
 * `/join-slay` only. Page-scoped rather than site-wide so the Slay content and
 * photo manifest stay out of the bundle every page loads; from any other page,
 * the site-wide `open_stride_page` tool opens it (`slay`).
 */
export function SlayTools() {
  useWebMcpTools([
    {
      name: 'get_slay_run_club',
      description:
        "What Slay Run Club is: Stride Run Club's women-only sister community in Bengaluru. Returns who it is for, the three kinds of experiences it runs, how often, what they cost, the people who lead it and how to apply. Read-only; applying happens through the form on this page.",
      execute: () =>
        toolJson({
          name: 'Slay Run Club',
          tagline: SLAY_TAGLINE,
          summary: SLAY_INTRO,
          audience: 'Women only, all fitness levels, complete beginners welcome. Coming alone is encouraged.',
          city: 'Bengaluru, India — venues vary and are shared before each event.',
          frequency: '2–3 experiences every month.',
          cost: 'Some community runs are free; fitness experiences and workshops may carry a fee, announced with each event.',
          experiences: SLAY_EXPERIENCES.map(({ title, description }) => ({ title, description })),
          leads: SLAY_TEAM.map(({ name, role }) => ({ name, role })),
          howToJoin:
            'Apply with the form on this page (name, email, WhatsApp number, Instagram ID, why you want to join). Approved applicants are emailed a link to the Slay WhatsApp community.',
          relationship: SLAY_UMBRELLA_LINE,
        }),
    },
  ])
  return null
}
