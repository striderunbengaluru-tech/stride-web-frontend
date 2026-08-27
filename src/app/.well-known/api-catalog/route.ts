import { apiCatalog } from '@/lib/mcp/discovery'
import { wellKnownJson } from '@/lib/mcp/well-known'

/** RFC 9727 API catalog, in the linkset media type the RFC specifies. */
export const dynamic = 'force-dynamic'

export function GET(request: Request): Response {
  return wellKnownJson(
    request,
    apiCatalog,
    'application/linkset+json;profile="https://www.rfc-editor.org/info/rfc9727"',
  )
}
