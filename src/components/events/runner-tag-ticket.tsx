'use client'

import { useState } from 'react'
import { CheckCircle, Copy, MapPin, Calendar, Tag } from 'lucide-react'
import { StoryBannerDownload } from '@/components/events/story-banner-download'

type Props = {
  runnerTag: string | null
  registrationId: string
  eventName: string
  eventDate: string | null
  eventLocation: string | null
  userName: string
  eventBannerUrl?: string | null
}

export function RunnerTagTicket({
  runnerTag,
  registrationId,
  eventName,
  eventDate,
  eventLocation,
  userName,
  eventBannerUrl,
}: Props) {
  const [copied, setCopied] = useState(false)

  async function copyTag() {
    if (!runnerTag) return
    await navigator.clipboard.writeText(runnerTag)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className='w-full max-w-sm'>

      {/* Header */}
      <div className='text-center mb-8'>
        {/* Animated celebration ring */}
        <div className='relative inline-flex items-center justify-center mb-5'>
          <div className='absolute w-20 h-20 rounded-full bg-green-500/10 animate-ping' style={{ animationDuration: '2s' }} />
          <div className='relative w-16 h-16 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center'>
            <CheckCircle className='text-green-400' size={30} />
          </div>
        </div>
        <h1 className='text-3xl font-bold text-white tracking-tight'>You&apos;re in!</h1>
        <p className='text-white/40 text-sm mt-1.5'>Registration confirmed · See you at the run</p>
      </div>

      {/* Ticket */}
      <div className='bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl overflow-hidden shadow-2xl'>

        {/* Ticket top */}
        <div className='px-7 pt-7 pb-6'>
          <p className='text-white/35 text-xs font-medium uppercase tracking-widest mb-2'>Event</p>
          <h2 className='text-white font-bold text-xl leading-snug'>{eventName}</h2>

          <div className='mt-5 space-y-2.5'>
            {eventDate && (
              <div className='flex items-center gap-2.5 text-white/55 text-sm'>
                <Calendar size={14} className='shrink-0 text-stride-yellow-accent/70' />
                <span>{eventDate}</span>
              </div>
            )}
            {eventLocation && (
              <div className='flex items-center gap-2.5 text-white/55 text-sm'>
                <MapPin size={14} className='shrink-0 text-stride-yellow-accent/70' />
                <span>{eventLocation}</span>
              </div>
            )}
          </div>
        </div>

        {/* Perforated divider */}
        <div className='relative flex items-center h-8 mx-0'>
          <div className='absolute -left-4 w-8 h-8 rounded-full bg-stride-purple-primary border-r border-white/10' aria-hidden='true' />
          <div className='flex-1 mx-6 border-t-2 border-dashed border-white/15' />
          <div className='absolute -right-4 w-8 h-8 rounded-full bg-stride-purple-primary border-l border-white/10' aria-hidden='true' />
        </div>

        {/* Runner tag section */}
        <div className='px-7 pt-5 pb-7'>
          <div className='flex items-center gap-1.5 mb-1.5'>
            <Tag size={13} className='text-stride-yellow-accent' strokeWidth={2.5} />
            <p className='text-white/35 text-xs font-medium uppercase tracking-widest'>Runner Tag</p>
          </div>
          <p className='text-white/40 text-xs mb-5'>Show this to the admin at check-in</p>

          {runnerTag ? (
            <button
              onClick={copyTag}
              className='group w-full flex items-center justify-between bg-stride-yellow-accent/12 border border-stride-yellow-accent/35 rounded-2xl px-6 py-5 hover:bg-stride-yellow-accent/20 hover:border-stride-yellow-accent/60 active:scale-[0.98] transition-all'
              aria-label='Copy Runner Tag'
            >
              <span className='text-stride-yellow-accent font-mono font-black text-5xl tracking-[0.4em]'>
                {runnerTag}
              </span>
              <span className='text-stride-yellow-accent/50 group-hover:text-stride-yellow-accent transition-colors shrink-0 ml-2'>
                {copied ? <CheckCircle size={22} /> : <Copy size={22} />}
              </span>
            </button>
          ) : (
            <div className='bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-center'>
              <p className='text-white/25 text-sm'>Tag not yet assigned</p>
            </div>
          )}

          {copied && (
            <p className='text-green-400 text-xs text-center mt-2 font-medium'>Copied to clipboard ✓</p>
          )}

          {/* Footer */}
          <div className='mt-6 pt-5 border-t border-white/10 flex items-center justify-between'>
            <span className='text-white/25 text-xs truncate max-w-[60%]'>{userName}</span>
            <span className='font-mono text-white/20 text-xs'>{registrationId.slice(0, 8).toUpperCase()}</span>
          </div>
        </div>
      </div>

      <p className='text-white/20 text-xs text-center mt-5 leading-relaxed'>
        This tag is yours permanently and works at all future Stride events.
      </p>

      {/* Share section */}
      <div className='mt-6 grid grid-cols-2 gap-3'>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(`I just signed up for ${eventName} at Stride Run Club! 🏃`)}`}
          target='_blank'
          rel='noopener noreferrer'
          className='text-center py-3 rounded-xl border border-white/15 text-white/50 hover:border-green-500/40 hover:text-green-400 transition-colors text-sm'
        >
          WhatsApp
        </a>
        <a
          href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Just signed up for ${eventName} at @StrideRunClub 🏃‍♂️`)}`}
          target='_blank'
          rel='noopener noreferrer'
          className='text-center py-3 rounded-xl border border-white/15 text-white/50 hover:border-sky-500/40 hover:text-sky-400 transition-colors text-sm'
        >
          X / Twitter
        </a>
      </div>

      {/* Story banner download */}
      <StoryBannerDownload
        eventName={eventName}
        eventDate={eventDate}
        eventLocation={eventLocation}
        runnerTag={runnerTag}
        eventBannerUrl={eventBannerUrl ?? null}
      />
    </div>
  )
}
