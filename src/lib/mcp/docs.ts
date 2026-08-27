import { BLOG_POSTS } from '@/content/blog/index'
import { ORIGINALS_LIST } from '@/content/originals'
import { LEAD_STRIDERS } from '@/content/lead-striders'
import { FAQ_ENTRIES, PAGE_INDEX, renderMarkdownPath, type Abs } from '@/lib/markdown/render'
import { isNegotiablePath } from '@/lib/markdown-negotiation'

/**
 * The retrieval layer behind the documentation MCP server and `/ask`.
 *
 * Keyword retrieval over the content the site already publishes — no model, no
 * embedding store, no inference cost. That is the right shape for this corpus:
 * a few dozen documents that change when someone edits a file, where an
 * assistant asking "what does Stride say about X" wants the passage, not a
 * paraphrase of it.
 *
 * The corpus is built at call time from the same modules the pages import, so a
 * new blog post or FAQ entry is searchable the moment it ships.
 */

export type DocKind = 'page' | 'blog' | 'original' | 'faq' | 'person'

export type DocEntry = {
  id: string
  kind: DocKind
  title: string
  /** Site-relative path the caller makes absolute. null for FAQ entries. */
  path: string | null
  /** One or two sentences — what a result list shows. */
  summary: string
  /** Everything searchable, lowercased at match time. Never returned whole. */
  text: string
}

function corpus(): DocEntry[] {
  const entries: DocEntry[] = []

  for (const { path, label, blurb } of PAGE_INDEX) {
    entries.push({
      id: `page:${path}`,
      kind: 'page',
      title: label,
      path,
      summary: blurb,
      text: `${label} ${blurb} ${path}`,
    })
  }

  for (const post of BLOG_POSTS) {
    entries.push({
      id: `blog:${post.slug}`,
      kind: 'blog',
      title: post.title,
      path: `/blog/${post.slug}`,
      summary: post.description,
      text: [post.title, post.description, post.tags.join(' '), post.tldr.join(' '), post.content].join(' '),
    })
  }

  for (const original of ORIGINALS_LIST) {
    entries.push({
      id: `original:${original.slug}`,
      kind: 'original',
      title: original.title,
      path: `/originals/${original.slug}`,
      summary: `${original.tagline} — ${original.description}`,
      text: [original.title, original.tagline, original.description, original.longDescription].join(' '),
    })
  }

  for (const faq of FAQ_ENTRIES) {
    entries.push({
      id: `faq:${faq.id}`,
      kind: 'faq',
      title: faq.question,
      path: null,
      summary: faq.answer,
      text: `${faq.question} ${faq.answer}`,
    })
  }

  for (const strider of LEAD_STRIDERS) {
    entries.push({
      id: `person:${strider.slug}`,
      kind: 'person',
      title: strider.name,
      path: '/team',
      summary: [strider.role, strider.bio].filter(Boolean).join(' — '),
      text: [strider.name, strider.role, strider.bio, 'lead strider team organiser'].join(' '),
    })
  }

  return entries
}

/** Words too common in this corpus to tell two documents apart. */
const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'but', 'by', 'can', 'do', 'does',
  'for', 'from', 'how', 'i', 'in', 'is', 'it', 'its', 'me', 'my', 'of', 'on',
  'or', 'that', 'the', 'their', 'them', 'there', 'this', 'to', 'was', 'what',
  'when', 'where', 'which', 'who', 'why', 'with', 'you', 'your',
])

function terms(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^a-z0-9₹]+/)
    .filter(t => t.length > 1 && !STOPWORDS.has(t))
}

export type DocResult = {
  id: string
  kind: DocKind
  title: string
  path: string | null
  summary: string
  /** Relative, not absolute — useful for ordering, meaningless as a number. */
  score: number
}

const DEFAULT_SEARCH_LIMIT = 8
const MAX_SEARCH_LIMIT = 25

/**
 * Ranks the corpus against a natural-language query.
 *
 * Scoring, in order of weight: a term in the title, a term in the summary, then
 * occurrences in the body (capped, so one long post cannot outrank a direct
 * title match by sheer repetition). Documents matching no term are dropped
 * entirely rather than returned with score zero — an empty result is a more
 * honest answer than a list of irrelevance.
 */
export function searchDocs(
  query: string,
  opts: { kind?: DocKind; limit?: number } = {},
): DocResult[] {
  const wanted = terms(query)
  if (wanted.length === 0) return []

  const limit = Math.min(Math.max(opts.limit ?? DEFAULT_SEARCH_LIMIT, 1), MAX_SEARCH_LIMIT)
  const pool = opts.kind ? corpus().filter(d => d.kind === opts.kind) : corpus()

  const scored = pool.map(doc => {
    const title = doc.title.toLowerCase()
    const summary = doc.summary.toLowerCase()
    const text = doc.text.toLowerCase()

    let score = 0
    for (const term of wanted) {
      if (title.includes(term)) score += 8
      if (summary.includes(term)) score += 3
      const hits = text.split(term).length - 1
      score += Math.min(hits, 5)
    }

    return { doc, score }
  })

  return scored
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ doc, score }) => ({
      id: doc.id,
      kind: doc.kind,
      title: doc.title,
      path: doc.path,
      summary: doc.summary,
      score,
    }))
}

/** The FAQ entry that best answers a question, or null when none is close. */
export function answerFaq(question: string): { question: string; answer: string } | null {
  const [best] = searchDocs(question, { kind: 'faq', limit: 1 })
  if (!best) return null
  const entry = FAQ_ENTRIES.find(f => `faq:${f.id}` === best.id)
  return entry ? { question: entry.question, answer: entry.answer } : null
}

/** Every path with a markdown twin, for `list_pages`. */
export function listDocPages(): { path: string; label: string; markdown: string }[] {
  const staticPages = PAGE_INDEX.map(({ path, label }) => ({
    path,
    label,
    markdown: path === '/' ? '/index.md' : `${path}.md`,
  }))

  const dynamic = [
    ...BLOG_POSTS.map(p => ({ path: `/blog/${p.slug}`, label: p.title, markdown: `/blog/${p.slug}.md` })),
    ...ORIGINALS_LIST.map(o => ({ path: `/originals/${o.slug}`, label: o.title, markdown: `/originals/${o.slug}.md` })),
  ]

  return [{ path: '/', label: 'Home', markdown: '/index.md' }, ...staticPages, ...dynamic]
}

/**
 * One page's markdown, by path.
 *
 * Gated on `isNegotiablePath` exactly as the HTTP route is — this tool must not
 * become a way to read something the `.md` URL refuses.
 */
export async function getPageMarkdown(
  pathname: string,
  abs: Abs,
): Promise<{ path: string; title: string; markdown: string } | null> {
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`
  const clean = path.replace(/\.md$/, '')

  if (!isNegotiablePath(clean)) return null

  const doc = await renderMarkdownPath(clean, abs)
  if (!doc) return null

  return { path: clean, title: doc.title, markdown: doc.body }
}
