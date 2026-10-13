import fs from 'fs'
import path from 'path'
import type { Metadata } from 'next'
import ReactMarkdown from 'react-markdown'
import type { Components } from 'react-markdown'
import { headingId } from '@/lib/utils/heading-id'

export const metadata: Metadata = {
  title: 'Privacy Policy — Stride Run Club',
  description: 'How Stride Run Club Bengaluru collects, uses, and protects your personal information.',
  alternates: { canonical: '/privacy-policy', types: { 'text/markdown': '/privacy-policy.md' } },
}

const components: Components = {
  h1: ({ children }) => (
    <h1 className='text-3xl sm:text-4xl font-bold text-white mt-10 mb-4 first:mt-0'>{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 id={headingId(children)} className='text-xl font-bold text-white mt-10 mb-3 pb-2 border-b border-white/10 scroll-mt-24'>{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className='text-base font-semibold text-white/90 mt-6 mb-2'>{children}</h3>
  ),
  p: ({ children }) => (
    <p className='text-white/65 text-sm leading-relaxed mb-4'>{children}</p>
  ),
  ul: ({ children }) => (
    <ul className='list-disc list-outside pl-5 mb-4 space-y-1.5'>{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className='list-decimal list-outside pl-5 mb-4 space-y-1.5'>{children}</ol>
  ),
  li: ({ children }) => (
    <li className='text-white/65 text-sm leading-relaxed'>{children}</li>
  ),
  strong: ({ children }) => (
    <strong className='text-white font-semibold'>{children}</strong>
  ),
  // In-page anchors (#changelog) stay in the tab; every other link opens a new one.
  a: ({ href, children }) => {
    const external = !href?.startsWith('#')
    return (
      <a
        href={href}
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
        className='text-stride-yellow-accent hover:underline underline-offset-2'
      >
        {children}
      </a>
    )
  },
  hr: () => <hr className='border-white/10 my-8' />,
  // Prevent <p> wrapping block elements — avoid hydration errors
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  blockquote: ({ node: _node, ...props }) => (
    <blockquote className='border-l-2 border-stride-yellow-accent/50 pl-4 my-4 text-white/50 italic text-sm' {...props} />
  ),
}

export default function PrivacyPolicyPage() {
  const filePath = path.join(process.cwd(), 'src/content/markdown/privacy-policy.md')
  const content = fs.readFileSync(filePath, 'utf-8')

  return (
    <main className='min-h-screen bg-stride-purple-primary pt-24 pb-20'>
      <div className='max-w-4xl mx-auto px-6'>

        {/* Markdown content */}
        <div className='pt-10 pb-16'>
          <ReactMarkdown components={components}>
            {content}
          </ReactMarkdown>
        </div>

      </div>
    </main>
  )
}
