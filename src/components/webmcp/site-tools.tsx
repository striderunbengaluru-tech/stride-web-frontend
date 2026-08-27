'use client'

import { useRouter } from 'next/navigation'
import { useWebMcpTools } from '@/hooks/use-web-mcp-tools'
import { toolJson, toolError } from '@/lib/webmcp'

/**
 * Site-wide WebMCP tools, registered from the root layout.
 *
 * There were already page-scoped tools (the events filter, event details, the
 * leaderboard, the tier table, the FAQ), and they stay. This adds the set that
 * should work from *any* page, for two reasons.
 *
 * The product reason: a browser agent that lands on a blog post and is asked
 * "what runs are on this weekend" should be able to answer without first
 * navigating somewhere the tool happens to be registered.
 *
 * The practical one: tools registered only inside feature components live in
 * lazily-loaded chunks. A scanner that reads the script bundles referenced by
 * the initial HTML can miss them entirely and conclude the site has no WebMCP
 * support at all. Registering from the layout puts `document.modelContext` in
 * the shared bundle every page loads.
 *
 * Every tool here is read-only and calls Stride's own public endpoints — the
 * same ones documented at /developers. None reads the session, and none can
 * register, pay, or change anything.
 */

const ASK_LIMIT = 8

/** Pages a browser agent may usefully be sent to. Anything not here is refused. */
const NAVIGABLE: Record<string, string> = {
  home: '/',
  events: '/events',
  pricing: '/pricing',
  about: '/about',
  milestones: '/milestones',
  leaderboard: '/leaderboard',
  blog: '/blog',
  team: '/team',
  partnerships: '/partnerships',
  developers: '/developers',
  contact: '/contact-us',
  'sign-up': '/become-a-member',
}

export function SiteWebMcpTools() {
  const router = useRouter()

  useWebMcpTools([
    {
      name: 'search_stride',
      description:
        "Search Stride Run Club for anything on this site: upcoming runs and races in Bengaluru, what an event costs, how the milestone tiers work, blog posts, the team, or a FAQ answer. Returns structured schema.org results with URLs. Use this from any page — it does not depend on which page is open.",
      inputSchema: {
        type: 'object',
        required: ['query'],
        properties: {
          query: {
            type: 'string',
            description: 'A natural-language question, e.g. "free beginner runs this weekend".',
          },
        },
      },
      execute: async (args) => {
        const query = String(args.query ?? '').trim()
        if (!query) return toolError('Provide a query.')

        try {
          const res = await fetch('/ask', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ query, limit: ASK_LIMIT }),
          })
          if (!res.ok) {
            return toolError(
              res.status === 429
                ? 'Rate limited. Wait a minute and try again.'
                : `Search failed with status ${res.status}.`,
            )
          }
          const data = await res.json()
          return toolJson({
            query,
            returned: data.results?.length ?? 0,
            results: data.results ?? [],
          })
        } catch {
          return toolError('Could not reach the Stride search endpoint from this page.')
        }
      },
    },
    {
      name: 'get_stride_info',
      description:
        'Facts about Stride Run Club: what it is, where and how often it runs, membership cost (free), the 2025 participation numbers, how to join, and links to every public page. Use this for "what is Stride" or "how do I join" questions.',
      execute: async () => {
        try {
          const res = await fetch('/?mode=agent', { headers: { accept: 'application/json' } })
          if (!res.ok) return toolError(`Could not load club info (status ${res.status}).`)
          const data = await res.json()
          return toolJson({
            entity: data.entity,
            whenToUse: data.whenToUse,
            capabilities: data.capabilities,
            pages: data.pages,
            contact: data.contact,
          })
        } catch {
          return toolError('Could not reach the Stride info endpoint from this page.')
        }
      },
    },
    {
      name: 'open_stride_page',
      description:
        `Navigate this browser to a Stride Run Club page. Valid names: ${Object.keys(NAVIGABLE).join(', ')}. Read-only navigation — it opens the page and nothing else.`,
      inputSchema: {
        type: 'object',
        required: ['page'],
        properties: {
          page: { type: 'string', enum: Object.keys(NAVIGABLE), description: 'Which page to open.' },
        },
      },
      execute: (args) => {
        const key = String(args.page ?? '').trim().toLowerCase()
        const path = NAVIGABLE[key]
        // An allowlist rather than accepting a path: a tool that navigates
        // wherever it is told is an open redirect with extra steps.
        if (!path) {
          return toolError(
            `"${args.page}" is not a Stride page. Valid names: ${Object.keys(NAVIGABLE).join(', ')}.`,
          )
        }
        router.push(path)
        return toolJson({ navigatedTo: path })
      },
    },
  ])

  return null
}
