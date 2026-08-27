import type { NextConfig } from "next";

/**
 * RFC 8288 `Link` header for the homepage — machine-readable discovery for
 * agents and crawlers that read headers before they parse HTML.
 *
 * Emitted as ONE header with a comma-separated list rather than several `Link`
 * headers: RFC 8288 defines the field as a list, and a single value sidesteps
 * any question of how duplicate keys in `headers()` are merged.
 *
 * Targets are relative URI-references, resolved by the client against the
 * request URL (RFC 8288 §3). That keeps staging pointing at staging rather than
 * hardcoding the production origin into both deployments.
 *
 * Relation types are IANA-registered wherever one fits:
 *   describedby      RFC 8288 — /llms.txt is the prose description of this site
 *   canonical        RFC 6596
 *   privacy-policy   RFC 6903
 *   terms-of-service RFC 6903
 *   sitemap          NOT registered, but the de-facto token; robots.txt already
 *                    declares the same two files by the standard mechanism
 *   api-catalog      RFC 9727
 *   service-desc     RFC 8631 — the OpenAPI description of /ask
 *   alternate        RFC 8288, with type=text/markdown for the markdown twin
 *
 * `api-catalog` and `service-desc` used to be deliberately absent, on the
 * grounds that Stride had no public API and pointing agents at /api/* would
 * send them at authenticated endpoints. Both are now real: the read-only MCP
 * servers at /mcp and /mcp/docs and the NLWeb endpoint at /ask are public, are
 * outside /api, and are described by the catalog.
 */
const HOMEPAGE_LINK_HEADER = [
  '</llms.txt>; rel="describedby"; type="text/plain"',
  '</>; rel="canonical"',
  '</index.md>; rel="alternate"; type="text/markdown"',
  '</sitemap.xml>; rel="sitemap"; type="application/xml"',
  '</sitemap.txt>; rel="sitemap"; type="text/plain"',
  '</.well-known/api-catalog>; rel="api-catalog"',
  '</openapi.json>; rel="service-desc"; type="application/json"',
  '</privacy-policy>; rel="privacy-policy"',
  '</terms-of-service>; rel="terms-of-service"',
].join(', ')

/**
 * The paths that have a markdown representation.
 *
 * Kept in lockstep with `isNegotiablePath()` in @/lib/markdown-negotiation —
 * that function is still the authority, because `/md/[[...slug]]` re-checks it
 * on every request. This list only decides which paths the routing layer even
 * bothers to look at.
 *
 * Child paths use a single `:slug` segment on purpose: `/events/:slug` must
 * match `/events/summer-10k` and not `/events/summer-10k/confirmation/abc`.
 *
 * Absent by design: `/profile/:username`, `/my-runs`, event confirmations, and
 * everything under `/admin` and `/api`. Those are authenticated or per-person,
 * and a second representation is a second surface to get authorization wrong on.
 */
const MARKDOWN_PAGES = [
  '/',
  '/become-a-member',
  '/blog',
  '/contact-us',
  '/developers',
  '/events',
  '/leaderboard',
  '/milestones',
  '/partnerships',
  '/pricing',
  '/privacy-policy',
  '/shop',
  '/team',
  '/terms-of-service',
  '/blog/:slug',
  '/events/:slug',
]

/** `/pricing` → `{ source: '/pricing', destination: '/md/pricing' }`; `/` → `/md`. */
const MARKDOWN_NEGOTIABLE_PATHS = MARKDOWN_PAGES.map(source => ({
  source,
  destination: source === '/' ? '/md' : `/md${source}`,
}))

/**
 * Matches an Accept header that *names* markdown.
 *
 * A literal substring test is deliberate. Browsers send
 * `text/html,...,*​/*;q=0.8` — a wildcard that would match text/markdown under
 * real content negotiation but contains no such literal, so humans keep getting
 * HTML. Only a client that asked for markdown by name is rewritten.
 */
const ACCEPTS_MARKDOWN = [
  { type: 'header' as const, key: 'accept', value: '.*text/markdown.*' },
]

/**
 * AI crawlers and agent fetchers that get markdown even when they ask for HTML.
 *
 * These clients send `Accept: text/html` because that is what an HTTP client
 * defaults to, not because HTML is what serves them best — the markdown
 * representation of a page is the same content without the nav, the footer, the
 * animation wrappers or the 300KB of framework payload.
 *
 * Googlebot and Bingbot are deliberately NOT here. Search indexing keeps
 * receiving the HTML with its JSON-LD; only answer-engine and agent traffic is
 * switched. `Google-Extended` and `Applebot-Extended` ARE here — they gate
 * grounding in Gemini and Apple Intelligence, not classic search indexing.
 *
 * This list must stay in step with the Allow group in public/robots.txt.
 * `CCBot` and `Bytespider` are absent on purpose: robots.txt disallows them
 * outright, and serving a representation to a crawler you told not to fetch is
 * incoherent whichever representation it is.
 */
const AI_BOT_USER_AGENTS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-Web',
  'Claude-User',
  'Claude-SearchBot',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Applebot-Extended',
  'DeepSeekBot',
  'ora-agent',
  'MistralAI-User',
]

const IS_AI_BOT = [
  {
    type: 'header' as const,
    key: 'user-agent',
    value: `.*(${AI_BOT_USER_AGENTS.join('|')}).*`,
  },
]

/**
 * `.md` URL suffixes — `/events/summer-10k.md`, and `/index.md` for the root.
 *
 * Unconditional: no `has` clause, so a plain `curl` gets markdown from these
 * URLs without having to know about content negotiation at all. That matters
 * because a `.md` URL is the one form an agent can put in a citation and have
 * resolve the same way twice.
 *
 * `:path*` handles every depth in one rule; `/md/[[...slug]]` then applies the
 * same allowlist it applies to everything else, so `/admin/foo.md` 404s.
 */
const MARKDOWN_SUFFIX_PATHS = [
  // Ahead of the wildcard, and it has to stay ahead: `/auth.md` is not a page
  // twin, it is a document of its own, and `/:path*.md` would otherwise send it
  // to `/md/auth` — a path with no renderer, i.e. a 404 on the one file an
  // agent reads to learn how to authenticate.
  { source: '/auth.md', destination: '/auth-md' },
  { source: '/index.md', destination: '/md' },
  { source: '/:path*.md', destination: '/md/:path*' },
]

const nextConfig: NextConfig = {
  /**
   * Content negotiation without a function invocation.
   *
   * This used to live in middleware, which is why the middleware matcher had to
   * cover every public page — and therefore why anonymous traffic was paying
   * for a JWT verification it never needed. Handled here it runs in the routing
   * layer instead: no middleware, no function, no compute.
   */
  async rewrites() {
    // `beforeFiles`, not the bare-array shorthand. The shorthand means
    // `afterFiles`, which is only consulted once the filesystem has failed to
    // answer — and `/`, `/blog`, `/events` and the legal pages are all real
    // pages, so a negotiated request would have been served HTML and the
    // rewrite would never have fired.
    return {
      beforeFiles: [
        // Suffix rules first: `/index.md` is more specific than `/:path*.md`,
        // and both are unconditional, so neither can be shadowed by a `has`
        // rule that happens to match the same request.
        ...MARKDOWN_SUFFIX_PATHS,
        ...MARKDOWN_NEGOTIABLE_PATHS.map(({ source, destination }) => ({
          source,
          destination,
          has: ACCEPTS_MARKDOWN,
        })),
        ...MARKDOWN_NEGOTIABLE_PATHS.map(({ source, destination }) => ({
          source,
          destination,
          has: IS_AI_BOT,
        })),
        // A structured, machine-readable view of the site root. Not a second
        // markdown twin — this one answers "what can I do here", with endpoints
        // and auth, rather than "what does this page say".
        {
          source: '/',
          destination: '/agent-view',
          has: [{ type: 'query' as const, key: 'mode', value: 'agent' }],
        },
      ],
    }
  },
  async headers() {
    return [
      {
        source: '/',
        headers: [{ key: 'Link', value: HOMEPAGE_LINK_HEADER }],
      },
      // `Vary` must ride on the HTML representation too, not just the markdown
      // one: a shared cache that stored this HTML without it would keep
      // answering an agent's `Accept: text/markdown` request with HTML.
      // `User-Agent` is in there for the same reason now that AI-bot UAs get a
      // different representation — at the cost of some edge cache fragmentation,
      // which is why only these paths carry it and not the whole site.
      // The /md route sets its own Vary on the markdown side.
      ...MARKDOWN_NEGOTIABLE_PATHS.map(({ source }) => ({
        source,
        headers: [{ key: 'Vary', value: 'Accept, User-Agent' }],
      })),
      // RFC 9727 wants its own media type, and `.well-known` documents should
      // not be cached for longer than it takes to fix a mistake in one.
      {
        source: '/.well-known/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600' }],
      },
    ]
  },
  experimental: {
    // Per-icon code splitting for the 60+ files importing lucide-react
    optimizePackageImports: ['lucide-react'],
  },
  images: {
    // WebP only, deliberately.
    //
    // Every image this site serves has already been through `sharp` at quality
    // 85 on upload (see the /api/profile/avatar, /api/profile/cover and
    // /api/admin/upload-event-cover handlers), so it reaches the optimizer
    // already compressed. Asking for AVIF as well bought a marginal size win on
    // an already-compressed source in exchange for a second transformation of
    // every image at every breakpoint — and transformations are metered.
    // Image conversions were on course to breach the plan allowance from this
    // alone. Format negotiation means the second format is billed whenever the
    // visitor mix spans browsers that accept AVIF and browsers that do not.
    formats: ['image/webp'],
    // Optimized copies are immutable per source URL — cache for 31 days
    minimumCacheTTL: 2678400,
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
      {
        protocol: 'https',
        hostname: 'cdn.instagram.com',
      },
      {
        protocol: 'https',
        hostname: '**.cdninstagram.com',
      },
      // Supabase Storage — app-managed assets (avatars, covers, event images)
      {
        protocol: 'https',
        hostname: 'ienotcjldormdxrzukpk.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      // Vercel Blob — legacy URLs from pre-migration data
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
      },
      // Simple Icons — the one partner logo we don't self-host (Garmin).
      // Serves genuine vector SVG; the sandbox CSP above still applies to it.
      {
        protocol: 'https',
        hostname: 'cdn.simpleicons.org',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
