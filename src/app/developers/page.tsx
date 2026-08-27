import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowRight, ExternalLink } from 'lucide-react'
import { HighlightedText } from '@/components/ui/highlighted-text'
import { JsonLd } from '@/components/seo/json-ld'
import { graph, breadcrumbNode, organizationId, websiteId } from '@/lib/json-ld'
import { PRODUCTION_SITE_URL } from '@/lib/site-url'
import { ALL_SERVERS, MCP_SERVER_VERSION } from '@/lib/mcp/registry'
import { READ_LIMIT, ASK_LIMIT } from '@/lib/rate-limit'
import { DEFAULT_OG_IMAGE, OG_IMAGE_WIDTH, OG_IMAGE_HEIGHT } from '@/lib/seo'

/**
 * The developer portal.
 *
 * Everything documented here already existed and was already reachable — the
 * MCP servers, /ask, the markdown twins, the OpenAPI spec, /auth.md. What did
 * not exist was a *page* about them: an agent-readiness scan found all the
 * machine-readable artefacts and then reported that a search for them by name
 * surfaced nothing, because there was no indexable HTML anywhere that said the
 * words "Stride Run Club API".
 *
 * So the job of this page is to be findable. The product name is in the title,
 * the H1 and the headings on purpose. It is in the sitemap, in llms.txt, and
 * linked from the footer so it is not an orphan.
 *
 * The tool tables render from `ALL_SERVERS` and the rate limits from the
 * limiter's own constants, so the page cannot document a tool that was renamed
 * or a limit that was changed.
 */

const CANONICAL = '/developers'

export const metadata: Metadata = {
  // `absolute`, so the layout's `%s | Stride Run Club` template does not append
  // a second copy of the brand. The name belongs in the title — this page exists
  // to be found by a name query, and "API" alone matches nothing — but
  // "Stride Run Club API & Developer Docs | Stride Run Club" reads as a bug.
  title: { absolute: 'Stride Run Club API & Developer Docs' },
  description:
    'Developer documentation for Stride Run Club: two read-only MCP servers, an NLWeb /ask endpoint, a markdown representation of every public page, and structured feeds. No credential required, no write API, no SDK needed.',
  keywords: [
    'Stride Run Club API',
    'Stride Run Club MCP server',
    'Stride Run Club developer docs',
    'Stride Run Club OpenAPI',
    'running club API India',
    'MCP server events',
  ],
  alternates: { canonical: CANONICAL, types: { 'text/markdown': '/developers.md' } },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    siteName: 'Stride Run Club',
    url: CANONICAL,
    title: 'Stride Run Club API & Developer Docs',
    description:
      'Two read-only MCP servers, an NLWeb /ask endpoint, and a markdown twin of every page. Anonymous, no credential required.',
    images: [{ url: DEFAULT_OG_IMAGE, width: OG_IMAGE_WIDTH, height: OG_IMAGE_HEIGHT, alt: 'Stride Run Club developer documentation' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Stride Run Club API & Developer Docs',
    description: 'Read-only MCP servers, an /ask endpoint, and markdown twins. No credential required.',
    images: [DEFAULT_OG_IMAGE],
  },
}

const jsonLd = graph([
  {
    '@type': 'WebAPI',
    '@id': `${PRODUCTION_SITE_URL}/developers#api`,
    name: 'Stride Run Club API',
    description:
      'Read-only access to Stride Run Club event, pricing, leaderboard and milestone data for Bengaluru, over MCP and a natural-language endpoint. Anonymous; no credential is issued or accepted.',
    documentation: `${PRODUCTION_SITE_URL}/developers`,
    termsOfService: `${PRODUCTION_SITE_URL}/terms-of-service`,
    provider: { '@id': organizationId(PRODUCTION_SITE_URL) },
    // The OpenAPI description, in the property schema.org defines for it.
    potentialAction: {
      '@type': 'ConsumeAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${PRODUCTION_SITE_URL}/ask`,
        httpMethod: 'POST',
        contentType: 'application/json',
        description: 'Natural-language query returning schema.org items.',
      },
    },
  },
  {
    '@type': 'TechArticle',
    '@id': `${PRODUCTION_SITE_URL}/developers#webpage`,
    url: `${PRODUCTION_SITE_URL}/developers`,
    name: 'Stride Run Club API & Developer Docs',
    headline: 'Stride Run Club API & Developer Docs',
    description:
      'How to read Stride Run Club data programmatically: MCP servers, the /ask endpoint, markdown twins and structured feeds.',
    inLanguage: 'en-IN',
    isPartOf: { '@id': websiteId(PRODUCTION_SITE_URL) },
    about: { '@id': `${PRODUCTION_SITE_URL}/developers#api` },
    publisher: { '@id': organizationId(PRODUCTION_SITE_URL) },
    breadcrumb: { '@id': `${PRODUCTION_SITE_URL}/developers#breadcrumb` },
    proficiencyLevel: 'Beginner',
  },
  breadcrumbNode(PRODUCTION_SITE_URL, [{ name: 'Developers', path: CANONICAL }]),
])

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className='font-mono text-sm text-stride-yellow-accent break-words'>{children}</code>
  )
}

function Block({ children }: { children: string }) {
  return (
    <div className='overflow-x-auto rounded-xl border border-white/15 bg-black/30 backdrop-blur-md'>
      <pre className='px-5 py-4 text-xs leading-relaxed text-copy-white/85 font-mono'>
        {children}
      </pre>
    </div>
  )
}

const RESOURCES = [
  { label: 'OpenAPI 3.1 description', href: '/openapi.json', note: 'Machine-readable spec for /ask and the markdown representation' },
  { label: 'Authentication guide', href: '/auth.md', note: 'Short version: there is none, and why' },
  { label: 'Site manual for agents', href: '/llms.txt', note: 'Structured index of every public page, and when to use Stride' },
  { label: 'MCP server card', href: '/.well-known/mcp/server-card.json', note: 'Tool inventory, generated from the live registry' },
  { label: 'A2A agent card', href: '/.well-known/agent-card.json', note: 'Agent-to-agent capability descriptor' },
  { label: 'API catalog (RFC 9727)', href: '/.well-known/api-catalog', note: 'Linkset pointing at every service description' },
  { label: 'Agent skills index', href: '/.well-known/agent-skills/index.json', note: 'Every capability with its endpoint' },
  { label: 'Structured agent view', href: '/?mode=agent', note: 'Endpoints, auth and capabilities as one JSON document' },
] as const

const FEEDS = [
  { label: 'Events', href: '/feeds/events.jsonl', type: 'schema.org SportsEvent, one per line' },
  { label: 'Blog', href: '/feeds/blog.jsonl', type: 'schema.org BlogPosting, full article body included' },
  { label: 'Schema map', href: '/schemamap.xml', type: 'NLWeb feed index, declared from robots.txt' },
] as const

export default function DevelopersPage() {
  return (
    <main className='min-h-screen'>
      <JsonLd data={jsonLd} />

      <section className='px-6 pt-28 pb-12 max-w-4xl mx-auto'>
        <span className='inline-block text-xs font-mono uppercase tracking-widest text-stride-yellow-accent font-medium mb-6 px-3 py-1 rounded-full border border-stride-yellow-accent/30 bg-stride-yellow-accent/10'>
          Developers
        </span>
        <h1 className='text-4xl md:text-6xl font-bold font-libre text-copy-white mb-6 leading-tight'>
          <HighlightedText text='Stride Run Club **API.**' />
        </h1>
        <p className='text-copy-white/70 text-lg md:text-xl leading-relaxed max-w-2xl'>
          Read Stride&rsquo;s events, prices, leaderboard and milestone tiers
          programmatically. Everything here is read-only, anonymous, and covers
          the same data the website already shows anyone.
        </p>
      </section>

      {/* The three honest boundaries, up front */}
      <section className='px-6 pb-12 max-w-4xl mx-auto'>
        <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
          {[
            { title: 'No API key', body: 'Nothing to register for. Stride issues and accepts no credentials.' },
            { title: 'No write API', body: 'Registration, payment and check-in are done by the person in a browser.' },
            { title: 'No SDK needed', body: 'Plain HTTP and JSON. Use fetch, or any MCP client.' },
          ].map(({ title, body }) => (
            <div key={title} className='bg-white/10 backdrop-blur-md border border-white/15 rounded-xl px-5 py-6'>
              <h2 className='text-copy-white font-semibold mb-2'>{title}</h2>
              <p className='text-copy-white/60 text-sm leading-relaxed'>{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Quickstart */}
      <section className='px-6 py-10 max-w-4xl mx-auto'>
        <h2 className='text-3xl md:text-4xl font-bold font-libre text-copy-white mb-3'>
          Start here
        </h2>
        <p className='text-copy-white/60 mb-6 leading-relaxed'>
          The fastest useful request. No setup, no key.
        </p>
        <Block>{`# What runs are coming up?
curl -s https://www.strideclub.in/events.md

# Ask in plain language, get schema.org items back
curl -s -X POST https://www.strideclub.in/ask \\
  -H 'content-type: application/json' \\
  -d '{"query":"free beginner runs in Bengaluru"}'

# Or connect an MCP client
npx @modelcontextprotocol/inspector https://www.strideclub.in/mcp`}</Block>
      </section>

      {/* MCP */}
      <section className='px-6 py-10 max-w-4xl mx-auto'>
        <h2 className='text-3xl md:text-4xl font-bold font-libre text-copy-white mb-3'>
          MCP servers
        </h2>
        <p className='text-copy-white/60 mb-8 leading-relaxed'>
          Two streamable-HTTP servers, version {MCP_SERVER_VERSION}. One for
          doing, one for learning. Both stateless, so no session handling is
          required. Add <Code>?sandbox=1</Code> to either to work against
          synthetic fixtures instead of live data.
        </p>

        <div className='space-y-8'>
          {ALL_SERVERS.map(server => (
            <div key={server.name}>
              <h3 className='text-xl font-bold font-libre text-copy-white mb-1'>
                {server.title}
              </h3>
              <p className='mb-4'>
                <Code>https://www.strideclub.in{server.path}</Code>
              </p>
              <p className='text-copy-white/60 text-sm leading-relaxed mb-4'>
                {server.description}
              </p>
              <div className='overflow-x-auto'>
                <table className='w-full text-left border-collapse'>
                  <caption className='sr-only'>Tools exposed by {server.title}</caption>
                  <thead>
                    <tr className='border-b border-white/15'>
                      <th scope='col' className='py-2 pr-4 text-xs font-mono uppercase tracking-wide text-copy-white/40 font-medium'>Tool</th>
                      <th scope='col' className='py-2 pr-4 text-xs font-mono uppercase tracking-wide text-copy-white/40 font-medium'>Arguments</th>
                      <th scope='col' className='py-2 text-xs font-mono uppercase tracking-wide text-copy-white/40 font-medium'>UI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {server.tools.map(tool => (
                      <tr key={tool.name} className='border-b border-white/10 align-top'>
                        <td className='py-3 pr-4 whitespace-nowrap'><Code>{tool.name}</Code></td>
                        <td className='py-3 pr-4 text-copy-white/60 text-sm'>{tool.inputSummary}</td>
                        <td className='py-3 text-copy-white/40 text-sm whitespace-nowrap'>
                          {tool.uiResourceUri ? 'MCP Apps' : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* /ask */}
      <section className='px-6 py-10 max-w-4xl mx-auto'>
        <h2 className='text-3xl md:text-4xl font-bold font-libre text-copy-white mb-3'>
          Natural-language endpoint
        </h2>
        <p className='text-copy-white/60 mb-6 leading-relaxed'>
          <Code>POST /ask</Code> implements Microsoft&rsquo;s NLWeb protocol by
          retrieval, not generation — it returns the matching schema.org items
          rather than a paraphrase of them, so there is no model in the path.
          Send <Code>Accept: text/event-stream</Code> for SSE
          (<Code>start</Code>, <Code>result</Code>, <Code>complete</Code>).
        </p>
        <Block>{`POST /ask
{ "query": "upcoming 10k runs in Bengaluru", "limit": 10 }

→ { "_meta": { "response_type": "items", "version": "0.1", "total": 4 },
    "results": [ { "@type": "SportsEvent", ... } ] }`}</Block>
        <p className='text-copy-white/50 text-sm mt-4 leading-relaxed'>
          Returns <Code>SportsEvent</Code>, <Code>BlogPosting</Code>,{' '}
          <Code>Question</Code>, <Code>EventSeries</Code>, <Code>Person</Code>{' '}
          and <Code>WebPage</Code>. Max query length 500 characters, max 25
          results. Full description in the{' '}
          <a href='/openapi.json' className='text-stride-yellow-accent hover:underline'>OpenAPI spec</a>.
        </p>
      </section>

      {/* Markdown */}
      <section className='px-6 py-10 max-w-4xl mx-auto'>
        <h2 className='text-3xl md:text-4xl font-bold font-libre text-copy-white mb-3'>
          Every page as markdown
        </h2>
        <p className='text-copy-white/60 mb-6 leading-relaxed'>
          Append <Code>.md</Code> to any public path, or send{' '}
          <Code>Accept: text/markdown</Code>. Known AI-bot user agents receive
          markdown without asking. Each response opens with a{' '}
          <Code>---</Code> frontmatter block carrying title, description,
          canonical and last-updated, and a <Code>Link: rel=&quot;canonical&quot;</Code>{' '}
          header pointing back at the HTML page.
        </p>
        <Block>{`curl -s https://www.strideclub.in/index.md
curl -s https://www.strideclub.in/pricing.md
curl -s https://www.strideclub.in/events/map-fitness-rave.md`}</Block>
        <p className='text-copy-white/50 text-sm mt-4 leading-relaxed'>
          Athlete profiles are deliberately excluded — they are per-person and
          members can make them private. A path with no markdown twin returns a
          real 404 with a markdown body pointing at the sitemap.
        </p>
      </section>

      {/* Feeds */}
      <section className='px-6 py-10 max-w-4xl mx-auto'>
        <h2 className='text-3xl md:text-4xl font-bold font-libre text-copy-white mb-6'>
          Structured feeds
        </h2>
        <ul className='space-y-3'>
          {FEEDS.map(feed => (
            <li key={feed.href} className='flex flex-col sm:flex-row sm:items-baseline sm:gap-3'>
              <a href={feed.href} className='text-stride-yellow-accent hover:underline font-mono text-sm shrink-0'>
                {feed.href}
              </a>
              <span className='text-copy-white/50 text-sm'>{feed.type}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Limits */}
      <section className='px-6 py-10 max-w-4xl mx-auto'>
        <h2 className='text-3xl md:text-4xl font-bold font-libre text-copy-white mb-3'>
          Rate limits
        </h2>
        <p className='text-copy-white/60 mb-4 leading-relaxed'>
          MCP endpoints allow <strong className='text-copy-white'>{READ_LIMIT.limit} requests a minute</strong> per client;{' '}
          <Code>/ask</Code> allows <strong className='text-copy-white'>{ASK_LIMIT.limit}</strong>, because each
          call scans the whole corpus. Successful <Code>/ask</Code> responses
          carry <Code>RateLimit-Remaining</Code> so you can pace yourself, and a{' '}
          <Code>429</Code> carries <Code>Retry-After</Code>.
        </p>
        <p className='text-copy-white/50 text-sm leading-relaxed'>
          Worth knowing: this counts per serverless instance rather than
          globally, because the platform provides no shared memory between
          invocations. A caller spread across cold starts sees a higher
          effective ceiling than those numbers suggest. It is a guard against a
          runaway loop, not a defence against a distributed one — please do not
          read the absence of a 429 as permission.
        </p>
      </section>

      {/* Reference */}
      <section className='px-6 py-10 max-w-4xl mx-auto'>
        <h2 className='text-3xl md:text-4xl font-bold font-libre text-copy-white mb-6'>
          Reference
        </h2>
        <ul className='space-y-4'>
          {RESOURCES.map(resource => (
            <li key={resource.href}>
              <a
                href={resource.href}
                className='text-stride-yellow-accent hover:underline font-medium inline-flex items-center gap-1.5'
              >
                {resource.label}
                <ExternalLink className='size-3.5' aria-hidden='true' />
              </a>
              <p className='text-copy-white/50 text-sm mt-0.5'>{resource.note}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Source + CTA */}
      <section className='px-6 py-10 pb-20 max-w-4xl mx-auto'>
        <div className='bg-white/10 backdrop-blur-md border border-white/15 rounded-xl px-6 py-8 md:px-10'>
          <h2 className='text-2xl md:text-3xl font-bold font-libre text-copy-white mb-3'>
            This site is open source
          </h2>
          <p className='text-copy-white/60 leading-relaxed mb-6'>
            Everything above is implemented in the repository, including{' '}
            <Code>AGENTS.md</Code> and three agent skills. If you need a
            capability Stride does not expose, open an issue or email{' '}
            <a href='mailto:striderunclubbengaluru@gmail.com' className='text-stride-yellow-accent hover:underline'>
              striderunclubbengaluru@gmail.com
            </a>{' '}
            — nothing is hidden, so the list above is the whole surface.
          </p>
          <div className='flex flex-col sm:flex-row gap-3'>
            <a
              href='https://github.com/striderunbengaluru-tech/stride-web-frontend'
              target='_blank'
              rel='noopener noreferrer'
              className='inline-flex items-center justify-center gap-2 min-h-11 bg-stride-yellow-accent text-copy-black font-bold px-6 py-3 rounded-md hover:opacity-90 transition-opacity'
            >
              View the source
              <ArrowRight className='size-4' aria-hidden='true' />
            </a>
            <Link
              href='/events'
              className='inline-flex items-center justify-center gap-2 min-h-11 border border-white/15 bg-white/10 backdrop-blur-md text-copy-white font-semibold px-6 py-3 rounded-md hover:border-stride-yellow-accent/50 transition-colors'
            >
              Or just come for a run
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
