'use client'

import { useRouter } from 'next/navigation'
import { useWebMcpTools } from '@/hooks/use-web-mcp-tools'
import { toolJson, toolError } from '@/lib/webmcp'
import type { PublicMilestoneTier, PublicAthlete, PublicEventDetail } from '@/lib/mcp/types'
import type { FaqEntry } from '@/lib/markdown/render'

/**
 * WebMCP tool registrations for pages whose data is server-rendered.
 *
 * Each of these takes the data the page already computed as props and exposes it
 * as a tool — so a browser agent reads exactly what the human is looking at,
 * with no second fetch and no chance of the two disagreeing. They render nothing.
 *
 * Every one is read-only, and none reads the session. See @/lib/webmcp for why
 * that boundary is where it is.
 */

export function MilestoneTools({ tiers }: { tiers: PublicMilestoneTier[] }) {
  useWebMcpTools([
    {
      name: 'get_milestone_tiers',
      description:
        "The five Stride Run Club membership tiers shown on this page, with the number of runs each requires and the perks it unlocks. Tiers are earned by attending runs and checking in; none of them can be bought.",
      execute: () =>
        toolJson({
          tiers,
          earnedBy: 'Attending a run and checking in with a four-character Stride Tag.',
          purchasable: false,
        }),
    },
  ])
  return null
}

export function LeaderboardTools({
  athletes,
  totalAthletes,
}: {
  athletes: PublicAthlete[]
  totalAthletes: number
}) {
  useWebMcpTools([
    {
      name: 'get_leaderboard',
      description:
        'The Stride Run Club leaderboard shown on this page — athletes ranked by community runs attended, with their milestone tier. Athletes who keep their profile private appear with a name and count only.',
      inputSchema: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'How many to return, from the top. Defaults to all shown.' },
        },
      },
      execute: (args) => {
        const limit = typeof args.limit === 'number' ? Math.max(1, Math.floor(args.limit)) : athletes.length
        return toolJson({
          totalAthletes,
          shown: Math.min(limit, athletes.length),
          ranking: 'Most community runs attended. Ties broken by who reached the count first.',
          athletes: athletes.slice(0, limit),
        })
      },
    },
  ])
  return null
}

export function FaqTools({ entries }: { entries: FaqEntry[] }) {
  useWebMcpTools([
    {
      name: 'answer_from_faq',
      description:
        "Answer a question about joining Stride Run Club from the club's own published FAQ on this page — who can join, how to join, where runs meet, whether there is a membership fee, how often the club runs, and what to expect at an event. Returns the published answer verbatim, or nothing when no entry covers the question.",
      inputSchema: {
        type: 'object',
        required: ['question'],
        properties: {
          question: { type: 'string', description: 'The question, in plain language.' },
        },
      },
      execute: (args) => {
        const question = String(args.question ?? '').toLowerCase()
        if (!question.trim()) return toolError('Provide a question.')

        const words = question.split(/[^a-z0-9]+/).filter(w => w.length > 2)
        const scored = entries
          .map(entry => {
            const haystack = `${entry.question} ${entry.answer}`.toLowerCase()
            const score = words.reduce((sum, word) => sum + (haystack.includes(word) ? 1 : 0), 0)
            return { entry, score }
          })
          .filter(({ score }) => score > 0)
          .sort((a, b) => b.score - a.score)

        if (scored.length === 0) {
          return toolJson({
            matched: false,
            note: 'No FAQ entry on this page covers that. The full FAQ is the six questions returned by list_faq_questions.',
            questions: entries.map(entry => entry.question),
          })
        }

        return toolJson({
          matched: true,
          question: scored[0].entry.question,
          answer: scored[0].entry.answer,
        })
      },
    },
    {
      name: 'list_faq_questions',
      description: 'Every question in the Stride Run Club FAQ on this page, so you can pick one before asking.',
      execute: () => toolJson({ questions: entries.map(entry => entry.question) }),
    },
  ])
  return null
}

/**
 * Event-detail tools.
 *
 * `get_event_details` is a straight read of what is on screen.
 *
 * `start_event_registration` is the deepest reach in the whole WebMCP surface,
 * and it stops on purpose: it opens the registration form, then hands control
 * back. It does not submit, does not pay, and cannot — payment is captured by
 * Razorpay in a flow the person completes themselves. An agent that could finish
 * a paid registration unattended is a refund request waiting to happen.
 *
 * It works by navigating to `?register=1`, which is the existing mechanism
 * `RegisterButton` already uses to reopen the modal after a login round-trip.
 * Reusing it means the tool inherits every guard that path already enforces —
 * signed in, not already registered, not full, not past — rather than a second
 * set of checks that could drift from the first. It also means the tool cannot
 * open a form the person is not entitled to see.
 *
 * There is no package-preselection argument. The `?register=1` path does not
 * carry one, and adding a parameter this page would silently ignore is worse
 * than not offering it.
 */
export function EventTools({ event }: { event: PublicEventDetail }) {
  const router = useRouter()

  useWebMcpTools([
    {
      name: 'get_event_details',
      description:
        'Full details of the Stride Run Club event on this page: date, venue, distance, difficulty, price, pricing packages, post-run location, and whether registration is open.',
      execute: () =>
        toolJson({
          ...event,
          registrationNote:
            'Registration requires a signed-in Stride account and is completed by the athlete in this browser.',
        }),
    },
    {
      name: 'start_event_registration',
      description:
        "Open the registration form for this event so the person can fill it in. This does NOT register anyone and does NOT take payment — it opens the form and stops. Use it to save them a click, never to act on their behalf. If they are not signed in, the page will send them to sign in first.",
      execute: () => {
        if (event.registrationsClosed) {
          return toolError('Registration is closed for this event.')
        }

        router.push(`${event.url}?register=1`)

        return toolJson({
          opened: true,
          nextStep:
            'The registration form is opening on screen. The person must review and confirm it themselves; payment, where applicable, is taken by Razorpay after they do. Do not attempt to submit it for them. If they are not signed in they will be sent to sign in first.',
        })
      },
    },
  ])
  return null
}
