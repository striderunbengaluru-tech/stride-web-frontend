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
 *
 * Deliberately absent: `api-catalog` and `service-doc`. Stride has no public
 * API — /api/* is internal and `Disallow`ed in robots.txt — and advertising a
 * catalog that doesn't exist would send agents at authenticated endpoints.
 */
const HOMEPAGE_LINK_HEADER = [
  '</llms.txt>; rel="describedby"; type="text/plain"',
  '</>; rel="canonical"',
  '</sitemap.xml>; rel="sitemap"; type="application/xml"',
  '</sitemap.txt>; rel="sitemap"; type="text/plain"',
  '</privacy-policy>; rel="privacy-policy"',
  '</terms-of-service>; rel="terms-of-service"',
].join(', ')

/**
 * The paths that answer `Accept: text/markdown` with markdown instead of HTML.
 *
 * Kept in lockstep with `isNegotiablePath()` in @/lib/markdown-negotiation —
 * that function is still the authority, because `/md/[[...slug]]` re-checks it
 * on every request. This list only decides which paths the routing layer even
 * bothers to look at.
 *
 * Sources use a single `:slug` segment on purpose: `/events/:slug` must match
 * `/events/summer-10k` and not `/events/summer-10k/confirmation/abc`.
 */
const MARKDOWN_NEGOTIABLE_PATHS = [
  { source: '/', destination: '/md' },
  { source: '/blog', destination: '/md/blog' },
  { source: '/events', destination: '/md/events' },
  { source: '/privacy-policy', destination: '/md/privacy-policy' },
  { source: '/terms-of-service', destination: '/md/terms-of-service' },
  { source: '/blog/:slug', destination: '/md/blog/:slug' },
  { source: '/events/:slug', destination: '/md/events/:slug' },
]

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
      beforeFiles: MARKDOWN_NEGOTIABLE_PATHS.map(({ source, destination }) => ({
        source,
        destination,
        has: ACCEPTS_MARKDOWN,
      })),
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
      // The /md route sets its own Vary on the markdown side.
      ...MARKDOWN_NEGOTIABLE_PATHS.map(({ source }) => ({
        source,
        headers: [{ key: 'Vary', value: 'Accept' }],
      })),
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
