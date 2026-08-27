import { getRequestOrigin } from '@/lib/site-url'
import { frontmatter } from '@/lib/markdown-negotiation'
import { PROTECTED_RESOURCE_METADATA_PATH } from '@/lib/mcp/discovery'
import { ALL_SERVERS } from '@/lib/mcp/registry'

/**
 * `/auth.md` — how an agent should authenticate with Stride.
 *
 * Written to the WorkOS auth.md structure (Discover, Pick a method, Register,
 * Claim, Use the credential, Errors, Revocation) because that is the shape an
 * agent looks for. What it says under those headings is the truth rather than
 * the template: Stride issues no agent credentials at all.
 *
 * That was a deliberate choice, and the reasoning belongs in the document
 * itself rather than only in a commit message. An `agent_auth` block naming a
 * `register_uri` that 404s is worse for an agent than an honest "there is
 * nothing to register" — it sends it down a path that cannot complete, and it
 * is precisely what the spec's own reachability check exists to catch.
 *
 * If Stride ever needs agents to act as members, this file and
 * `/.well-known/oauth-protected-resource` are the two places that change first,
 * and neither should change before the endpoints exist.
 */

export const dynamic = 'force-dynamic'

export function GET(request: Request): Response {
  const origin = getRequestOrigin(request)
  const prm = `${origin}${PROTECTED_RESOURCE_METADATA_PATH}`

  const body = `# Authenticating with Stride Run Club

**Short version: you do not need to. Every machine-readable surface Stride publishes is anonymous and read-only. If you are holding a credential for Stride, something told you wrong — drop it and retry the request without an \`Authorization\` header.**

This document follows the [auth.md](https://workos.com/auth-md) structure so an agent can find the section it needs. Several of those sections say "not applicable", and that is the real answer rather than an omission: Stride operates no agent authorization server, issues no agent credentials, and exposes no write API.

## Discover

Authorization metadata for Stride's read surface:

- **Protected-resource metadata (RFC 9728):** ${prm}
- **Authorization-server metadata (RFC 8414):** none. Stride runs no authorization server for agents, so there is no \`/.well-known/oauth-authorization-server\` document to fetch. Nothing is hidden behind a redirect either — the document genuinely does not exist.
- **No \`agent_auth\` block is published**, because every URI it would carry (\`register_uri\`, \`claim_uri\`, \`revocation_uri\`) would have to point at an endpoint that does not exist.

The protected-resource metadata reports \`"authorization_servers": []\` and \`"authorization_required": false\`. Read those literally.

### What is available without any credential

${ALL_SERVERS.map(server => `- **${server.title}** — \`${origin}${server.path}\` (MCP, streamable HTTP). Tools: ${server.tools.map(tool => `\`${tool.name}\``).join(', ')}.`).join('\n')}
- **Natural-language query** — \`POST ${origin}/ask\`
- **Any public page as markdown** — append \`.md\` to its path, or send \`Accept: text/markdown\`
- **Structured feeds** — ${origin}/feeds/events.jsonl, ${origin}/feeds/blog.jsonl
- **Site manual** — ${origin}/llms.txt

## Pick a method

There is one method: **anonymous**.

| Identity type | Supported | Notes |
| --- | --- | --- |
| \`anonymous\` | Yes | The only method. Send no \`Authorization\` header. |
| \`identity_assertion\` | No | Stride accepts no assertion type, including \`urn:ietf:params:oauth:token-type:id-jag\`. There is nothing to exchange one for. |
| \`service_auth\` | No | No API keys are issued. |

Rate limits apply per IP rather than per identity, so there is no throughput benefit to identifying yourself even if you could.

## Register

**Not applicable.** There is no client registration endpoint — no \`register_uri\`, and no dynamic client registration (RFC 7591). Stride will not issue you a client id, a secret, or a token.

Start calling the endpoints above. That is registration.

## Claim

**Not applicable.** There is no credential to claim on a user's behalf, so there is no \`claim_uri\` and no user-verification step.

This is the section that matters most if you are trying to act *for* somebody, so it is worth being exact about why:

- Human sign-in is **Google OAuth via Supabase**, completed in the person's own browser. The consent screen is Google's and only the account holder can approve it.
- The resulting session is a first-party cookie scoped to this site. It is not a bearer token, it cannot be exported, and Stride will not mint one that an agent could carry.
- Nothing about that session is delegable. There is no "act as user" grant, no impersonation scope, and no service account with member privileges.

## Use the credential

**Not applicable — there is no credential.** Call the endpoints directly.

\`\`\`
curl -s ${origin}/index.md
curl -s "${origin}/ask?query=upcoming+runs+in+Bengaluru"
curl -s -X POST ${origin}/mcp \\
  -H 'Content-Type: application/json' \\
  -H 'Accept: application/json, text/event-stream' \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
\`\`\`

### Sandbox

Append \`?sandbox=1\` to \`/mcp\`, \`/mcp/docs\` or \`/ask\` to answer from synthetic fixtures instead of live data:

\`\`\`
curl -s "${origin}/ask?query=upcoming+runs&sandbox=1"
\`\`\`

Be clear about what this sandbox is for. Every tool is read-only in both modes, so it is not protecting production from writes — there are no writes. It exists so you can learn the response shapes, and so a test suite does not depend on which events happen to be scheduled this week.

It is also **not** a separate environment. Stride's staging deployment shares the production database, so staging is not a test environment either and should not be used as one. These fixtures are the only isolated data Stride offers.

## What you cannot do, and what to do instead

Read-only is a property of the whole surface, not a phase of it. There is no endpoint, credential or scope that would let an agent:

| Action | Why not | Do this instead |
| --- | --- | --- |
| Register a person for an event | Requires their session and their explicit confirmation before payment | Link them to \`${origin}/events/<slug>\` |
| Pay for a registration | Payment is captured by Razorpay in the person's browser | Link them to the event page |
| Create or edit a member profile | Requires their session | Link them to \`${origin}/become-a-member\` |
| Check in at a run | Deliberately in-person: a Stride Tag read out at the start line | Nothing — this one is meant to require a body at a start line |
| Read a member's private data | Not exposed on any machine-readable surface at all | Use \`get_leaderboard\` for public standings |

## Errors

| Status | Meaning | What to do |
| --- | --- | --- |
| \`400\` | Malformed request — bad JSON, or a query over 500 characters | Fix the request. \`/ask\` returns a \`usage\` field. |
| \`401\` | You sent an \`Authorization\` header. Stride cannot accept one. | Retry with no \`Authorization\` header. |
| \`404\` | No such page, or a path with no markdown twin | The body is markdown pointing at the sitemap. |
| \`429\` | Rate limited | Back off and retry. Limits are per IP. |

A \`401\` from \`/mcp\` carries the RFC 9728 pointer:

\`\`\`
WWW-Authenticate: Bearer resource_metadata="${prm}"
\`\`\`

Follow it and you will read that no authorization is required. That is not a redirect loop — it is the answer.

## Revocation

**Not applicable.** No credential is issued, so none can be revoked, and there is no \`revocation_uri\` or revocation event stream.

Members revoke their own access by deleting their account, which hard-deletes their data. See the [privacy policy](${origin}/privacy-policy).

## Contact

- Email: striderunclubbengaluru@gmail.com
- Source: https://github.com/striderunbengaluru-tech/stride-web-frontend

If you are building something that needs a capability Stride does not expose, email rather than probing for it. Nothing is hidden — the list above is the whole surface.
`

  const withFrontmatter = frontmatter({
    title: 'Authenticating with Stride Run Club',
    description:
      'How agents authenticate with Stride Run Club: they do not. Every machine-readable surface is anonymous and read-only, and no agent credentials are issued.',
    canonical: `${origin}/auth.md`,
  }) + body

  return new Response(withFrontmatter, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Link': `<${origin}/auth.md>; rel="canonical"`,
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
