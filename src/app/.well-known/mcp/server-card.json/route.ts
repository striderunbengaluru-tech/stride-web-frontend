import { serverCard } from '@/lib/mcp/discovery'
import { wellKnownJson } from '@/lib/mcp/well-known'

/** MCP server card — what a host reads before opening a transport to /mcp. */
export const dynamic = 'force-dynamic'

export function GET(request: Request): Response {
  return wellKnownJson(request, serverCard)
}
