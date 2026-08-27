import {
  ALL_SERVERS,
  DOCS_SERVER,
  MCP_SERVER_VERSION,
  PRODUCT_SERVER,
  REPRESENTATIVE_QUERIES,
  type ToolDescriptor,
} from './registry'

/**
 * The bodies of every agent-discovery document Stride publishes.
 *
 * Kept in one module, built from the tool registry, for one reason: an agent
 * that reads a well-known file and finds a tool that no longer exists — or a
 * URI that 404s — learns to distrust the whole set. Generating them means the
 * only way to advertise a tool is to have registered it.
 *
 * Each function takes the request's own origin, so a preview deployment
 * describes itself rather than production.
 */

export const PROTECTED_RESOURCE_METADATA_PATH = '/.well-known/oauth-protected-resource'

const CONTACT_EMAIL = 'striderunclubbengaluru@gmail.com'
const REPO_URL = 'https://github.com/striderunbengaluru-tech/stride-web-frontend'

function toolEntry(tool: ToolDescriptor) {
  return {
    name: tool.name,
    title: tool.title,
    description: tool.description,
    inputs: tool.inputSummary,
    readOnly: tool.readOnly,
    ...(tool.uiResourceUri ? { uiResourceUri: tool.uiResourceUri } : {}),
  }
}

// ---------------------------------------------------------------------------
// MCP server card — /.well-known/mcp/server-card.json and /.well-known/mcp
// ---------------------------------------------------------------------------

export function serverCard(origin: string) {
  return {
    name: PRODUCT_SERVER.name,
    title: PRODUCT_SERVER.title,
    description: PRODUCT_SERVER.description,
    version: MCP_SERVER_VERSION,
    serverUrl: `${origin}${PRODUCT_SERVER.path}`,
    transport: 'streamable-http',
    authentication: {
      required: false,
      type: 'none',
      note: 'Every tool is read-only over data this site already publishes. No credential is issued or accepted.',
      documentation: `${origin}/auth.md`,
      protectedResourceMetadata: `${origin}${PROTECTED_RESOURCE_METADATA_PATH}`,
    },
    // MCP Apps: the views these tools render, so a host can decide whether it
    // can display them before it opens a transport.
    extensions: {
      'io.modelcontextprotocol/ui': {
        resources: PRODUCT_SERVER.tools
          .filter(tool => tool.uiResourceUri)
          .map(tool => ({ uri: tool.uiResourceUri, mimeType: 'text/html;profile=mcp-app', tool: tool.name })),
      },
    },
    sandbox: {
      supported: true,
      usage: `${origin}${PRODUCT_SERVER.path}?sandbox=1`,
      note: 'Returns synthetic fixtures instead of live data. Every tool is read-only either way, so the sandbox exists to let you learn the response shapes, not to protect production from writes.',
    },
    tools: PRODUCT_SERVER.tools.map(toolEntry),
    relatedServers: [
      {
        name: DOCS_SERVER.name,
        title: DOCS_SERVER.title,
        description: DOCS_SERVER.description,
        serverUrl: `${origin}${DOCS_SERVER.path}`,
        tools: DOCS_SERVER.tools.map(tool => tool.name),
      },
    ],
    provider: { name: 'Stride Run Club', url: origin, email: CONTACT_EMAIL },
    documentation: `${origin}/llms.txt`,
    sourceCode: REPO_URL,
  }
}

// ---------------------------------------------------------------------------
// A2A agent card — /.well-known/agent-card.json
// ---------------------------------------------------------------------------

export function agentCard(origin: string) {
  const skills = ALL_SERVERS.flatMap(server =>
    server.tools.map(tool => ({
      id: `${server.name}.${tool.name}`,
      name: tool.title,
      description: tool.description,
      tags: server === PRODUCT_SERVER ? ['events', 'running', 'bengaluru'] : ['documentation', 'faq'],
      examples: REPRESENTATIVE_QUERIES[server.name] ?? [],
      inputModes: ['text/plain', 'application/json'],
      outputModes: ['application/json', 'text/markdown'],
    })),
  )

  return {
    protocolVersion: '0.3.0',
    id: 'stride-run-club',
    name: 'Stride Run Club',
    description:
      "Answers questions about Stride Run Club's running events, pricing, milestone tiers and leaderboard in Bengaluru, India. Read-only: it can tell you what is happening and what it costs, and it cannot register anyone, take a payment or change any member's data.",
    version: MCP_SERVER_VERSION,
    url: `${origin}${PRODUCT_SERVER.path}`,
    documentationUrl: `${origin}/llms.txt`,
    provider: {
      organization: 'Stride Run Club',
      name: 'Stride Run Club',
      url: origin,
      email: CONTACT_EMAIL,
    },
    interfaces: [
      { type: 'mcp/streamable-http', url: `${origin}${PRODUCT_SERVER.path}` },
      { type: 'mcp/streamable-http', url: `${origin}${DOCS_SERVER.path}` },
      { type: 'http+json/rest', url: `${origin}/ask` },
    ],
    capabilities: {
      streaming: true,
      pushNotifications: false,
      stateTransitionHistory: false,
      extendedAgentCard: false,
    },
    securitySchemes: {},
    security: [],
    defaultInputModes: ['text/plain', 'application/json'],
    defaultOutputModes: ['application/json', 'text/markdown'],
    skills,
  }
}

// ---------------------------------------------------------------------------
// Agent Skills index — /.well-known/agent-skills/index.json
// ---------------------------------------------------------------------------

export function agentSkillsIndex(origin: string) {
  return {
    version: '1.0',
    provider: { name: 'Stride Run Club', url: origin },
    skills: ALL_SERVERS.flatMap(server =>
      server.tools.map(tool => ({
        name: `${server.name}.${tool.name}`,
        title: tool.title,
        description: tool.description,
        inputs: tool.inputSummary,
        endpoint: `${origin}${server.path}`,
        protocol: 'mcp',
        readOnly: tool.readOnly,
      })),
    ),
    documentation: `${origin}/llms.txt`,
    authentication: `${origin}/auth.md`,
  }
}

// ---------------------------------------------------------------------------
// ARD catalog — /.well-known/ard.json and the /.well-known/ai-catalog.json alias
// ---------------------------------------------------------------------------

/**
 * The ARD spec version this catalog is written against.
 *
 * Not required by the spec: ARD v0.91 requires only `entries`, and its schema
 * marks every other top-level member "transport-defined and ignored by ARD"
 * with `additionalProperties: true`. Validators in the wild check for it
 * regardless — the predecessor `ai-catalog.json` format carried one — and
 * declaring which version of a moving spec a document conforms to is useful on
 * its own merits. Harmless to a conformant reader, informative to everything
 * else.
 */
const ARD_SPEC_VERSION = '0.91'

export function ardCatalog(origin: string) {
  const host = new URL(origin).host

  return {
    specVersion: ARD_SPEC_VERSION,
    entries: [
      ...ALL_SERVERS.map(server => ({
        identifier: `urn:air:${host}:server:${server.name}`,
        displayName: server.title,
        description: server.description,
        type: 'application/mcp-server-card+json',
        url: `${origin}/.well-known/mcp/server-card.json`,
        version: MCP_SERVER_VERSION,
        tags: ['running', 'events', 'bengaluru', 'community', 'read-only'],
        representativeQueries: REPRESENTATIVE_QUERIES[server.name] ?? [],
        capabilities: { readOnly: true, authentication: 'none' },
      })),
      {
        identifier: `urn:air:${host}:agent:stride-run-club`,
        displayName: 'Stride Run Club agent card',
        description:
          'A2A agent card describing what the Stride Run Club agent can answer and where to reach it.',
        type: 'application/a2a-agent-card+json',
        url: `${origin}/.well-known/agent-card.json`,
        tags: ['a2a', 'running', 'events'],
        representativeQueries: [
          'what can the Stride Run Club agent do',
          'which running events can I ask Stride about',
        ],
      },
      {
        identifier: `urn:air:${host}:doc:llms-txt`,
        displayName: 'Stride Run Club site manual',
        description:
          'Structured index of every public Stride page, when to use Stride, and how to call its endpoints.',
        type: 'text/plain',
        url: `${origin}/llms.txt`,
        tags: ['llms-txt', 'documentation'],
        representativeQueries: [
          'what does Stride Run Club publish',
          'how do I fetch Stride pages as markdown',
        ],
      },
      {
        identifier: `urn:air:${host}:api:ask`,
        displayName: 'Stride NLWeb /ask endpoint',
        description:
          'Natural-language query endpoint returning schema.org items for Stride events, blog posts and FAQ answers. Supports SSE streaming.',
        type: 'application/json',
        url: `${origin}/openapi.json`,
        tags: ['nlweb', 'search', 'events'],
        representativeQueries: [
          'upcoming 10k runs in Bengaluru',
          'is there a membership fee for Stride Run Club',
        ],
      },
    ],
  }
}

// ---------------------------------------------------------------------------
// RFC 9728 protected-resource metadata — /.well-known/oauth-protected-resource
// ---------------------------------------------------------------------------

/**
 * Stride's protected-resource metadata, published honestly.
 *
 * `authorization_servers` is empty, and that is the finding, not an omission:
 * there is no authorization server an agent can use, because Stride issues no
 * agent credentials at all. Every read is anonymous and every write is a human
 * completing Google OAuth in their own browser.
 *
 * The alternative — naming the Supabase issuer here — would tell an agent to go
 * and get a token it has no way to obtain and that no Stride endpoint would
 * accept from it. An empty list plus prose that says why is the true answer.
 */
export function protectedResourceMetadata(origin: string) {
  return {
    resource: `${origin}${PRODUCT_SERVER.path}`,
    authorization_servers: [],
    bearer_methods_supported: [],
    scopes_supported: [],
    resource_documentation: `${origin}/auth.md`,
    resource_policy_uri: `${origin}/privacy-policy`,
    resource_tos_uri: `${origin}/terms-of-service`,
    resource_name: PRODUCT_SERVER.title,
    resource_signing_alg_values_supported: [],
    authorization_required: false,
    resource_notes:
      'This resource requires no authorization. Every tool is read-only over data the website already publishes to anyone. Stride operates no agent authorization server: there is no client registration endpoint, no credential to claim, and no revocation endpoint, because no credential is ever issued. Human sign-in is Google OAuth via Supabase and grants access only to that person\'s own data in their own browser session; it is not delegable to an agent. See /auth.md.',
  }
}

// ---------------------------------------------------------------------------
// RFC 9727 API catalog — /.well-known/api-catalog
// ---------------------------------------------------------------------------

/**
 * RFC 9727 API catalog.
 *
 * The RFC allows two shapes, and this document uses both, in the order a reader
 * needs them.
 *
 * The FIRST member is anchored at the catalog itself and carries `item` links —
 * the relation the RFC defines as "identifies a target resource that represents
 * an API that is a member of the catalog". That is the index: one place that
 * lists what APIs exist, without a consumer having to infer the set from the
 * anchors of everything below. It was missing, and a catalog whose membership
 * has to be reverse-engineered from later members is a catalog that only a
 * lenient parser can read.
 *
 * The members AFTER it are the per-API descriptions from the RFC's main example,
 * anchored at each API with `service-desc` and `service-doc` attached.
 */
export function apiCatalog(origin: string) {
  const catalogUrl = `${origin}/.well-known/api-catalog`

  return {
    linkset: [
      {
        anchor: catalogUrl,
        item: [
          {
            href: `${origin}/ask`,
            type: 'application/json',
            title: 'Stride Run Club NLWeb query endpoint',
          },
          {
            href: `${origin}${PRODUCT_SERVER.path}`,
            type: 'application/json',
            title: PRODUCT_SERVER.title,
          },
          {
            href: `${origin}${DOCS_SERVER.path}`,
            type: 'application/json',
            title: DOCS_SERVER.title,
          },
        ],
        'service-doc': [
          { href: `${origin}/developers`, type: 'text/html', title: 'Stride Run Club API & Developer Docs' },
          { href: `${origin}/llms.txt`, type: 'text/plain', title: 'Stride Run Club site manual' },
        ],
        author: [{ href: `${origin}/contact-us`, title: 'Stride Run Club' }],
      },
      {
        anchor: `${origin}/ask`,
        'service-desc': [
          { href: `${origin}/openapi.json`, type: 'application/json', title: 'OpenAPI description of the NLWeb /ask endpoint' },
        ],
        'service-doc': [
          { href: `${origin}/llms.txt`, type: 'text/plain', title: 'Stride Run Club site manual' },
        ],
        author: [{ href: `${origin}/contact-us`, title: 'Stride Run Club' }],
        'terms-of-service': [{ href: `${origin}/terms-of-service` }],
        'privacy-policy': [{ href: `${origin}/privacy-policy` }],
      },
      {
        anchor: `${origin}${PRODUCT_SERVER.path}`,
        'service-desc': [
          { href: `${origin}/.well-known/mcp/server-card.json`, type: 'application/json', title: 'MCP server card — Stride event, pricing and leaderboard tools' },
        ],
        'service-doc': [
          { href: `${origin}/llms.txt`, type: 'text/plain', title: 'Stride Run Club site manual' },
        ],
        describedby: [
          { href: `${origin}/.well-known/agent-card.json`, type: 'application/json', title: 'A2A agent card' },
        ],
      },
      {
        anchor: `${origin}${DOCS_SERVER.path}`,
        'service-desc': [
          { href: `${origin}/.well-known/mcp/server-card.json`, type: 'application/json', title: 'MCP server card — documentation tools' },
        ],
        'service-doc': [
          { href: `${origin}/blog/llms.txt`, type: 'text/plain', title: 'Blog context' },
        ],
      },
    ],
  }
}
