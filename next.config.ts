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

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/',
        headers: [{ key: 'Link', value: HOMEPAGE_LINK_HEADER }],
      },
    ]
  },
  experimental: {
    // Per-icon code splitting for the 60+ files importing lucide-react
    optimizePackageImports: ['lucide-react'],
  },
  images: {
    // Serve AVIF where supported (20-40% smaller than WebP), WebP fallback
    formats: ['image/avif', 'image/webp'],
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
