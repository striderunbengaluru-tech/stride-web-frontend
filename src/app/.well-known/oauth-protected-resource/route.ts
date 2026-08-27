import { protectedResourceMetadata } from '@/lib/mcp/discovery'
import { wellKnownJson } from '@/lib/mcp/well-known'

/**
 * RFC 9728 protected-resource metadata for the MCP surface.
 *
 * Says, in the spec's own vocabulary, that no authorization is required and no
 * authorization server exists — see the note in @/lib/mcp/discovery for why an
 * empty `authorization_servers` is the honest value rather than a missing one.
 */
export const dynamic = 'force-dynamic'

export function GET(request: Request): Response {
  return wellKnownJson(request, protectedResourceMetadata)
}
