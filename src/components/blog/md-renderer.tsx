'use client'

import ReactMarkdown from 'react-markdown'
import type { Components } from 'react-markdown'
import { SectionReveal } from '@/components/ui/section-reveal'

const components: Components = {
  h2({ children }) {
    return (
      <SectionReveal>
        <h2 className='font-libre text-2xl md:text-3xl font-bold text-white mt-14 mb-4 leading-snug'>
          {children}
        </h2>
        <div className='w-8 h-px bg-stride-yellow-accent/50 mb-8' />
      </SectionReveal>
    )
  },

  h3({ children }) {
    return (
      <SectionReveal>
        <h3 className='font-libre text-xl font-bold text-stride-yellow-accent mt-10 mb-3 leading-snug'>
          {children}
        </h3>
      </SectionReveal>
    )
  },

  p({ children, node }) {
    // react-markdown wraps standalone images in <p>. Our img renderer returns a div
    // (via SectionReveal), making <p><div/></p> — invalid HTML that causes hydration errors.
    // When the paragraph's only child is an img element, skip the <p> wrapper entirely.
    const child = node?.children[0]
    if (
      node?.children.length === 1 &&
      child?.type === 'element' &&
      child.tagName === 'img'
    ) {
      return <>{children}</>
    }
    return (
      <p className='text-white/70 font-figtree text-base md:text-lg leading-relaxed mb-6'>
        {children}
      </p>
    )
  },

  blockquote({ children }) {
    return (
      <SectionReveal>
        <blockquote className='my-10 pl-6 border-l-2 border-stride-yellow-accent bg-white/5 rounded-r-2xl py-5 pr-6'>
          <div className='text-white/85 font-libre text-lg md:text-xl italic leading-relaxed'>
            {children}
          </div>
        </blockquote>
      </SectionReveal>
    )
  },

  img({ src, alt }) {
    return (
      <SectionReveal className='my-8'>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt ?? ''}
          className='w-full h-auto md:w-auto md:max-w-full md:max-h-[400px] rounded-md shadow-xl block mx-auto'
          loading='lazy'
        />
        {alt && (
          <p className='text-center text-xs text-white/35 font-figtree mt-3 italic'>{alt}</p>
        )}
      </SectionReveal>
    )
  },

  a({ href, children }) {
    const isExternal = href?.startsWith('http')
    return (
      <a
        href={href}
        target={isExternal ? '_blank' : undefined}
        rel={isExternal ? 'noopener noreferrer' : undefined}
        className='text-stride-yellow-accent underline underline-offset-2 decoration-stride-yellow-accent/40 hover:decoration-stride-yellow-accent transition-colors'
      >
        {children}
      </a>
    )
  },

  strong({ children }) {
    return <strong className='text-white font-semibold'>{children}</strong>
  },

  ul({ children }) {
    return <ul className='my-4 flex flex-col gap-2'>{children}</ul>
  },

  li({ children }) {
    return (
      <li className='flex items-start gap-2.5 text-white/70 font-figtree text-base leading-relaxed'>
        <span className='shrink-0 mt-2 w-1.5 h-1.5 rounded-sm bg-stride-yellow-accent/60 rotate-45' />
        <span>{children}</span>
      </li>
    )
  },

  hr() {
    return <hr className='my-12 border-white/10' />
  },
}

type Props = {
  content: string
}

export function MdRenderer({ content }: Props) {
  return (
    <div>
      <ReactMarkdown components={components}>{content}</ReactMarkdown>
    </div>
  )
}
