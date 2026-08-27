import { ardCatalog } from '@/lib/mcp/discovery'
import { wellKnownJson } from '@/lib/mcp/well-known'

/** Agentic Resource Discovery catalog — the current spec path. */
export const dynamic = 'force-dynamic'

export function GET(request: Request): Response {
  return wellKnownJson(request, ardCatalog)
}
