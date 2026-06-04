import type { BlogAuthor } from '@/content/blog/index'
import { User } from 'lucide-react'

type Props = {
  author: BlogAuthor
  publishedAt: string
  readingTimeMin: number
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(dateStr))
}

export function AuthorCard({ author, publishedAt, readingTimeMin }: Props) {
  const inner = (
    <div className='flex items-center gap-4'>
      <div className='shrink-0 flex items-center justify-center w-16 h-16 rounded-full bg-stride-yellow-accent/15 border border-stride-yellow-accent/20 overflow-hidden'>
        {author.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={author.avatarUrl}
            alt={author.name}
            className='w-full h-full rounded-full object-cover'
            loading='lazy'
          />
        ) : (
          <User className='w-6 h-6 text-stride-yellow-accent' />
        )}
      </div>

      <div className='flex flex-col gap-0.5'>
        <div className='flex items-center gap-2 flex-wrap'>
          <span className='text-sm font-semibold text-white font-figtree'>{author.name}</span>
          <span className='text-white/25 text-xs'>·</span>
          <span className='text-xs text-white/45 font-figtree'>{author.role}</span>
        </div>
        <div className='flex items-center gap-2 text-xs text-white/35 font-figtree'>
          <span>{formatDate(publishedAt)}</span>
          <span className='text-white/20'>·</span>
          <span>{readingTimeMin} min read</span>
        </div>
      </div>
    </div>
  )

  if (author.instagramUrl) {
    return (
      <a
        href={author.instagramUrl}
        target='_blank'
        rel='noopener noreferrer'
        className='inline-block cursor-pointer hover:opacity-80 transition-opacity duration-150'
      >
        {inner}
      </a>
    )
  }

  return inner
}
