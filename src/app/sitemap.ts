import type { MetadataRoute } from 'next'
import { buildSitemapEntries } from '@/lib/sitemap-entries'

export default function sitemap(): Promise<MetadataRoute.Sitemap> {
  return buildSitemapEntries()
}
