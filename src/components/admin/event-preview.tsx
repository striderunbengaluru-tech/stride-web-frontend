'use client'

import { useState } from 'react'
import Image from 'next/image'
import ReactMarkdown from 'react-markdown'
import { Calendar, MapPin, Monitor, Smartphone } from 'lucide-react'

type Props = {
  name: string
  subtitle: string
  pricePaise: number
  eventDate: string
  location: string
  details: string
  bannerImages: string[]
}

function formatDatePreview(d: string) {
  if (!d) return null
  try {
    return new Date(d).toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return null
  }
}

function formatTimePreview(d: string) {
  if (!d) return null
  try {
    return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return null
  }
}

type ViewMode = 'mobile' | 'desktop'

export function EventPreview({ name, subtitle, pricePaise, eventDate, location, details, bannerImages }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>('mobile')

  const hasImage = bannerImages.length > 0
  const dateStr = formatDatePreview(eventDate)
  const timeStr = formatTimePreview(eventDate)

  const content = (
    <div className='bg-stride-purple-primary overflow-y-auto max-h-[65vh]'>

      {/* Image or placeholder */}
      <div className={`relative w-full overflow-hidden bg-white/5 ${viewMode === 'mobile' ? 'aspect-3/4 max-h-[56vw]' : 'aspect-16/7'}`}>
        {hasImage ? (
          <Image
            src={bannerImages[0]}
            alt={name || 'Event image'}
            fill
            className='object-cover'
            sizes='500px'
            unoptimized
          />
        ) : (
          <div className='absolute inset-0 flex flex-col items-center justify-center gap-2'>
            <div className='w-12 h-12 rounded-full bg-white/10 flex items-center justify-center'>
              <span className='text-white/30 text-xl'>🏃</span>
            </div>
            <p className='text-white/20 text-xs'>No image yet</p>
          </div>
        )}
        <div className='absolute inset-0 bg-linear-to-t from-stride-purple-primary via-transparent to-transparent' />
        {/* Price badge */}
        <div className='absolute top-3 right-3'>
          {pricePaise === 0 ? (
            <span className='bg-green-500/90 text-white text-xs font-bold px-2.5 py-1 rounded-full'>Free</span>
          ) : (
            <span className='bg-black/50 border border-white/20 text-white text-xs font-bold px-2.5 py-1 rounded-full'>
              ₹{(pricePaise / 100).toLocaleString('en-IN')}
            </span>
          )}
        </div>
      </div>

      <div className='px-4 pb-6 -mt-1'>
        {/* Title */}
        <h2 className='text-xl font-bold text-white leading-tight mt-3'>
          {name || <span className='text-white/20'>Event name</span>}
        </h2>
        {subtitle && <p className='text-white/50 text-sm mt-1'>{subtitle}</p>}

        {/* Info card */}
        <div className='mt-4 bg-white/10 border border-white/10 rounded-xl overflow-hidden'>
          <div className='flex items-center gap-3 px-4 py-3 border-b border-white/8'>
            <span className='text-stride-yellow-accent text-sm font-bold w-5 text-center shrink-0'>₹</span>
            <div>
              <p className='text-white/40 text-xs'>Event fee</p>
              <p className='text-white font-semibold text-sm'>
                {pricePaise === 0 ? 'Free' : `₹${(pricePaise / 100).toLocaleString('en-IN')}`}
              </p>
            </div>
          </div>
          {dateStr && (
            <div className='flex items-center gap-3 px-4 py-3 border-b border-white/8'>
              <Calendar size={14} className='text-white/40 shrink-0' />
              <div>
                <p className='text-white/40 text-xs'>Date</p>
                <p className='text-white font-semibold text-sm'>{dateStr}{timeStr ? ` · ${timeStr}` : ''}</p>
              </div>
            </div>
          )}
          {location && (
            <div className='flex items-center gap-3 px-4 py-3'>
              <MapPin size={14} className='text-white/40 shrink-0' />
              <div className='min-w-0'>
                <p className='text-white/40 text-xs'>Meeting point</p>
                <p className='text-white font-semibold text-sm truncate'>{location}</p>
              </div>
            </div>
          )}
        </div>

        {/* Details rendered markdown */}
        {details && (
          <div className='mt-4 bg-white/10 border border-white/10 rounded-xl p-4'>
            <p className='text-white/50 text-xs font-medium uppercase tracking-wider mb-2'>Event Details</p>
            <div className='prose prose-invert prose-sm max-w-none prose-p:text-white prose-headings:text-white prose-headings:font-bold prose-a:text-stride-yellow-accent prose-strong:text-white prose-li:text-white prose-ul:my-2 prose-ol:my-2 [&_ul>li::marker]:text-white [&_ol>li::marker]:text-white'>
              <ReactMarkdown>{details}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className='rounded-2xl overflow-hidden border border-white/15 bg-white/5'>
      {/* Header with view toggle */}
      <div className='flex items-center justify-between px-4 py-2.5 border-b border-white/10 bg-white/5'>
        <span className='text-white/40 text-xs font-medium'>Live Preview</span>
        <div className='flex items-center gap-1 bg-white/8 rounded-lg p-0.5'>
          <button
            onClick={() => setViewMode('mobile')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
              viewMode === 'mobile'
                ? 'bg-stride-yellow-accent text-copy-black'
                : 'text-white/40 hover:text-white/70'
            }`}
            aria-label='Mobile preview'
          >
            <Smartphone size={12} />
            Mobile
          </button>
          <button
            onClick={() => setViewMode('desktop')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
              viewMode === 'desktop'
                ? 'bg-stride-yellow-accent text-copy-black'
                : 'text-white/40 hover:text-white/70'
            }`}
            aria-label='Desktop preview'
          >
            <Monitor size={12} />
            Desktop
          </button>
        </div>
      </div>

      {/* Preview viewport */}
      {viewMode === 'mobile' ? (
        /* Mobile: simulate phone shell */
        <div className='bg-[#1a0a2e] p-4 flex justify-center'>
          <div className='w-full max-w-[375px] rounded-2xl overflow-hidden border border-white/20 shadow-2xl'>
            {/* Phone status bar */}
            <div className='bg-[#1a0a2e] px-4 py-2 flex items-center justify-between'>
              <span className='text-white/40 text-[10px] font-medium'>9:41</span>
              <div className='flex gap-1 items-center'>
                <div className='w-3 h-1.5 bg-white/40 rounded-sm' />
                <div className='w-1 h-1 bg-white/40 rounded-full' />
              </div>
            </div>
            {content}
          </div>
        </div>
      ) : (
        /* Desktop: full width with browser chrome hint */
        <div className='bg-[#1a0a2e]'>
          <div className='flex items-center gap-1.5 px-4 py-2 border-b border-white/8'>
            <div className='w-2.5 h-2.5 rounded-full bg-red-500/50' />
            <div className='w-2.5 h-2.5 rounded-full bg-yellow-500/50' />
            <div className='w-2.5 h-2.5 rounded-full bg-green-500/50' />
            <div className='flex-1 mx-3 bg-white/8 rounded px-3 py-0.5'>
              <span className='text-white/20 text-xs'>stride-web-frontend.vercel.app/events/…</span>
            </div>
          </div>
          {content}
        </div>
      )}
    </div>
  )
}
