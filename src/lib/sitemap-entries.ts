import type { MetadataRoute } from 'next'
import { adminClient } from '@/lib/supabase/admin'
import { BLOG_POSTS } from '@/content/blog/index'
import { PREVIEW_FEATURES_ENABLED, isGatedRoute } from '@/lib/feature-flags'

export const SITE_URL = 'https://www.strideclub.in'

// Single source of truth for the sitemap, shared by the XML route
// (`app/sitemap.ts`) and the plain-text route (`app/sitemap.txt/route.ts`) so
// the two formats never drift apart.
export async function buildSitemapEntries(): Promise<MetadataRoute.Sitemap> {
  const now = new Date().toISOString()

  // Static pages
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL,                         lastModified: now, changeFrequency: 'daily',   priority: 1.0 },
    { url: `${SITE_URL}/events`,             lastModified: now, changeFrequency: 'daily',   priority: 0.9 },
    { url: `${SITE_URL}/pricing`,            lastModified: now, changeFrequency: 'weekly',  priority: 0.8 },
    { url: `${SITE_URL}/about`,              lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/blog`,               lastModified: now, changeFrequency: 'weekly',  priority: 0.8 },
    { url: `${SITE_URL}/milestones`,         lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/leaderboard`,        lastModified: now, changeFrequency: 'daily',   priority: 0.7 },
    { url: `${SITE_URL}/shop`,               lastModified: now, changeFrequency: 'weekly',  priority: 0.7 },
    { url: `${SITE_URL}/team`,               lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/partnerships`,       lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/contact-us`,         lastModified: now, changeFrequency: 'yearly',  priority: 0.5 },
    { url: `${SITE_URL}/developers`,         lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/become-a-member`,    lastModified: now, changeFrequency: 'yearly',  priority: 0.6 },
    { url: `${SITE_URL}/terms-of-service`,   lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${SITE_URL}/privacy-policy`,     lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
  ]

  // Blog posts (static content)
  const blogRoutes: MetadataRoute.Sitemap = BLOG_POSTS.map(post => ({
    url: `${SITE_URL}/blog/${post.slug}`,
    lastModified: post.publishedAt,
    changeFrequency: 'monthly',
    priority: 0.7,
  }))

  // Published events (dynamic — from Supabase). Test events are staging-only,
  // so on production they'd be 404s: never advertise them to crawlers.
  const eventQuery = adminClient
    .from('events')
    .select('slug, updated_at')
    .eq('status', 'PUBLISHED')
  if (!PREVIEW_FEATURES_ENABLED) eventQuery.eq('is_test_event', false)

  const { data: events } = await eventQuery

  const eventRoutes: MetadataRoute.Sitemap = (events ?? []).map(event => ({
    url: `${SITE_URL}/events/${event.slug}`,
    lastModified: event.updated_at ?? now,
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  const allRoutes = [...staticRoutes, ...blogRoutes, ...eventRoutes]

  // On production, drop any route hidden by guardPreviewFeature() so the sitemap
  // only lists pages that actually resolve.
  if (PREVIEW_FEATURES_ENABLED) return allRoutes
  return allRoutes.filter(entry => {
    const path = entry.url.replace(SITE_URL, '') || '/'
    return !isGatedRoute(path)
  })
}
