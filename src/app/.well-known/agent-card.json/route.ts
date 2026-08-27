import { agentCard } from '@/lib/mcp/discovery'
import { wellKnownJson } from '@/lib/mcp/well-known'

/** A2A agent card. */
export const dynamic = 'force-dynamic'

export function GET(request: Request): Response {
  return wellKnownJson(request, agentCard)
}
