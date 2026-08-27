import { ardCatalog } from '@/lib/mcp/discovery'
import { wellKnownJson } from '@/lib/mcp/well-known'

/**
 * The ARD catalog under its predecessor path.
 *
 * ARD moved to `/.well-known/ard.json`, and the spec says a consumer MAY still
 * consult this one. Plenty of tooling written against the earlier draft only
 * looks here, so both paths serve the identical document — a redirect would
 * break the clients that do not follow one.
 */
export const dynamic = 'force-dynamic'

export function GET(request: Request): Response {
  return wellKnownJson(request, ardCatalog)
}
