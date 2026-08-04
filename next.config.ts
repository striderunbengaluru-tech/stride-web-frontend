import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
