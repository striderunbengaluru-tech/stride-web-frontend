import { agentSkillsIndex } from '@/lib/mcp/discovery'
import { wellKnownJson } from '@/lib/mcp/well-known'

/** Agent Skills index — every capability Stride exposes, with its endpoint. */
export const dynamic = 'force-dynamic'

export function GET(request: Request): Response {
  return wellKnownJson(request, agentSkillsIndex)
}
