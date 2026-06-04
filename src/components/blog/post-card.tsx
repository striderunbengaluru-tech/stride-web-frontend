import Link from 'next/link'
import { ArrowUpRight, Clock } from 'lucide-react'
import type { BlogPost } from '@/content/blog/index'

type Props = {
  post: BlogPost
  featured?: boolean
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(dateStr))
}

export function PostCard({ post, featured = false }: Props) {
  if (featured) {
    return (
      <Link
        href={`/blog/${post.slug}`}
        className='group block rounded-2xl overflow-hidden bg-white/5 border border-white/10 hover:border-stride-yellow-accent/30 transition-all duration-300 hover:scale-[1.01]'
      >
        <div className='relative aspect-video overflow-hidden'>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.coverUrl}
            alt={post.title}
            className='w-full h-full object-cover transition-transform duration-500 group-hover:scale-105'
            loading='lazy'
          />
          <div className='absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent' />
          <div className='absolute top-4 right-4 flex items-center gap-1.5'>
            {post.tags.map((tag) => (
              <span
                key={tag}
                className='text-xs bg-stride-yellow-accent/15 text-stride-yellow-accent rounded-full px-2.5 py-0.5 backdrop-blur-sm border border-stride-yellow-accent/20 font-figtree'
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className='p-6 md:p-8'>
          <div className='flex items-center gap-3 mb-3 text-xs text-white/40 font-figtree'>
            <span className='font-mono uppercase tracking-wider'>{formatDate(post.publishedAt)}</span>
            <span className='text-white/20'>·</span>
            <span className='flex items-center gap-1'>
              <Clock className='w-3 h-3' />
              {post.readingTimeMin} min
            </span>
          </div>
          <h2 className='font-libre text-2xl md:text-3xl font-bold text-white mb-3 leading-snug group-hover:text-stride-yellow-accent transition-colors duration-200'>
            {post.title}
          </h2>
          <p className='text-white/55 font-figtree text-sm md:text-base leading-relaxed mb-6 line-clamp-2'>
            {post.description}
          </p>
          <div className='inline-flex items-center gap-2 text-sm font-semibold text-stride-yellow-accent font-figtree'>
            Read story
            <ArrowUpRight className='w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5' />
          </div>
        </div>
      </Link>
    )
  }

  return (
    <Link
      href={`/blog/${post.slug}`}
      className='group flex flex-col rounded-2xl overflow-hidden bg-white/5 border border-white/10 hover:border-stride-yellow-accent/30 transition-all duration-300 hover:scale-[1.015]'
    >
      <div className='relative aspect-video overflow-hidden'>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={post.coverUrl}
          alt={post.title}
          className='w-full h-full object-cover transition-transform duration-500 group-hover:scale-105'
          loading='lazy'
        />
        <div className='absolute inset-0 bg-gradient-to-t from-black/40 to-transparent' />
      </div>

      <div className='flex flex-col flex-1 p-5'>
        <div className='flex items-center gap-1.5 mb-3 flex-wrap'>
          {post.tags.map((tag) => (
            <span
              key={tag}
              className='text-xs bg-stride-yellow-accent/10 text-stride-yellow-accent rounded-full px-2.5 py-0.5 font-figtree'
            >
              {tag}
            </span>
          ))}
        </div>

        <h3 className='font-libre text-lg font-bold text-white mb-2 leading-snug line-clamp-2 group-hover:text-stride-yellow-accent transition-colors duration-200'>
          {post.title}
        </h3>
        <p className='text-white/50 font-figtree text-sm leading-relaxed line-clamp-2 flex-1'>
          {post.description}
        </p>

        <div className='flex items-center justify-between mt-4 pt-4 border-t border-white/8'>
          <div className='flex items-center gap-2 text-xs text-white/35 font-figtree'>
            <Clock className='w-3 h-3' />
            <span>{post.readingTimeMin} min</span>
            <span className='text-white/20'>·</span>
            <span>{formatDate(post.publishedAt)}</span>
          </div>
          <ArrowUpRight className='w-4 h-4 text-stride-yellow-accent opacity-0 group-hover:opacity-100 transition-opacity duration-200' />
        </div>
      </div>
    </Link>
  )
}
