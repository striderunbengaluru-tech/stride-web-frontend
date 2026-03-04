import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
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
    ],
  },
};

export default nextConfig;
