import { serverCard } from '@/lib/mcp/discovery'
import { wellKnownJson } from '@/lib/mcp/well-known'

/**
 * `/.well-known/mcp` — the bare well-known path some clients probe before
 * trying `/.well-known/mcp/server-card.json`. Serves the same card rather than
 * redirecting, so one fetch is enough either way.
 */
export const dynamic = 'force-dynamic'

export function GET(request: Request): Response {
  return wellKnownJson(request, serverCard)
}
