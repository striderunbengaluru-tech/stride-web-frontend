import fs from 'fs'
import path from 'path'
import type { Metadata } from 'next'
import ReactMarkdown from 'react-markdown'
import type { Components } from 'react-markdown'

export const metadata: Metadata = {
  title: 'Privacy Policy — Stride Run Club',
  description: 'How Stride Run Club Bengaluru collects, uses, and protects your personal information.',
}

const components: Components = {
  h1: ({ children }) => (
    <h1 className='text-3xl sm:text-4xl font-bold text-white mt-10 mb-4 first:mt-0'>{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className='text-xl font-bold text-white mt-10 mb-3 pb-2 border-b border-white/10'>{children}</h2>
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
  a: ({ href, children }) => (
    <a
      href={href}
      target='_blank'
      rel='noopener noreferrer'
      className='text-stride-yellow-accent hover:underline underline-offset-2'
    >
      {children}
    </a>
  ),
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

        {/* Header badge */}
        <div className='pt-10 pb-8'>
          <p className='text-stride-yellow-accent text-xs font-bold uppercase tracking-[0.2em] mb-3'>
            Stride Run Club
          </p>
          <div className='h-px w-12 bg-stride-yellow-accent/40' />
        </div>

        {/* Markdown content */}
        <div className='pb-16'>
          <ReactMarkdown components={components}>
            {content}
          </ReactMarkdown>
        </div>

      </div>
    </main>
  )
}
