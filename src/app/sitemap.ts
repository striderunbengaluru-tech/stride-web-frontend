import type { MetadataRoute } from 'next'
import { adminClient } from '@/lib/supabase/admin'
import { BLOG_POSTS } from '@/content/blog/index'
import { ORIGINALS } from '@/content/originals'

const SITE_URL = 'https://strideclub.in'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date().toISOString()

  // Static pages
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL,                         lastModified: now, changeFrequency: 'daily',   priority: 1.0 },
    { url: `${SITE_URL}/events`,             lastModified: now, changeFrequency: 'daily',   priority: 0.9 },
    { url: `${SITE_URL}/blog`,               lastModified: now, changeFrequency: 'weekly',  priority: 0.8 },
    { url: `${SITE_URL}/milestones`,         lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/leaderboard`,        lastModified: now, changeFrequency: 'daily',   priority: 0.7 },
    { url: `${SITE_URL}/shop`,               lastModified: now, changeFrequency: 'weekly',  priority: 0.7 },
    { url: `${SITE_URL}/originals`,          lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/team`,               lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/partnerships`,       lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/contact-us`,         lastModified: now, changeFrequency: 'yearly',  priority: 0.5 },
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

  // Originals (static content)
  const originalsRoutes: MetadataRoute.Sitemap = Object.values(ORIGINALS).map(item => ({
    url: `${SITE_URL}/originals/${item.slug}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.5,
  }))

  // Published events (dynamic — from Supabase)
  const { data: events } = await adminClient
    .from('events')
    .select('slug, updated_at')
    .eq('status', 'PUBLISHED')

  const eventRoutes: MetadataRoute.Sitemap = (events ?? []).map(event => ({
    url: `${SITE_URL}/events/${event.slug}`,
    lastModified: event.updated_at ?? now,
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  return [...staticRoutes, ...blogRoutes, ...originalsRoutes, ...eventRoutes]
}
