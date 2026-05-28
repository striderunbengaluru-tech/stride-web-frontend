'use client'

import { useState } from 'react'
import { CheckCircle, Copy, MapPin, Calendar } from 'lucide-react'

type Props = {
  runnerTag: string | null
  registrationId: string
  eventName: string
  eventDate: string | null
  eventLocation: string | null
  userName: string
}

export function RunnerTagTicket({
  runnerTag,
  registrationId,
  eventName,
  eventDate,
  eventLocation,
  userName,
}: Props) {
  const [copied, setCopied] = useState(false)

  async function copyTag() {
    if (!runnerTag) return
    await navigator.clipboard.writeText(runnerTag)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className='w-full max-w-sm'>

      {/* Confirmation header */}
      <div className='text-center mb-8'>
        <div className='inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/15 border border-green-500/30 mb-4'>
          <CheckCircle className='text-green-400' size={32} />
        </div>
        <h1 className='text-2xl font-bold text-white'>You&apos;re in!</h1>
        <p className='text-white/50 text-sm mt-1'>Registration confirmed</p>
      </div>

      {/* Ticket card */}
      <div className='bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl overflow-hidden'>

        {/* Top section */}
        <div className='p-6 pb-5'>
          <p className='text-white/40 text-xs uppercase tracking-widest mb-1'>Event</p>
          <h2 className='text-white font-bold text-lg leading-tight'>{eventName}</h2>

          <div className='mt-4 space-y-2'>
            {eventDate && (
              <div className='flex items-center gap-2 text-white/60 text-sm'>
                <Calendar size={14} className='shrink-0' />
                <span>{eventDate}</span>
              </div>
            )}
            {eventLocation && (
              <div className='flex items-center gap-2 text-white/60 text-sm'>
                <MapPin size={14} className='shrink-0' />
                <span>{eventLocation}</span>
              </div>
            )}
          </div>
        </div>

        {/* Perforated divider */}
        <div className='relative flex items-center px-5 py-0 h-6'>
          <div className='absolute -left-3 w-6 h-6 rounded-full bg-stride-purple-primary' aria-hidden='true' />
          <div className='flex-1 border-t border-dashed border-white/20' />
          <div className='absolute -right-3 w-6 h-6 rounded-full bg-stride-purple-primary' aria-hidden='true' />
        </div>

        {/* Runner Tag section */}
        <div className='p-6 pt-5'>
          <p className='text-white/40 text-xs uppercase tracking-widest mb-1'>Runner Tag</p>
          <p className='text-white/50 text-xs mb-4'>
            Share this tag with the admin at check-in
          </p>

          {runnerTag ? (
            <button
              onClick={copyTag}
              className='group w-full flex items-center justify-between bg-stride-yellow-accent/10 border border-stride-yellow-accent/30 rounded-xl px-5 py-4 hover:border-stride-yellow-accent/60 hover:bg-stride-yellow-accent/15 transition-all'
              aria-label='Copy Runner Tag'
            >
              <span className='text-stride-yellow-accent font-mono font-bold text-4xl tracking-[0.3em]'>
                {runnerTag}
              </span>
              <span className='text-stride-yellow-accent/60 group-hover:text-stride-yellow-accent transition-colors'>
                {copied ? <CheckCircle size={20} /> : <Copy size={20} />}
              </span>
            </button>
          ) : (
            <div className='bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-center'>
              <p className='text-white/30 text-sm'>Tag not yet assigned — contact support</p>
            </div>
          )}

          {copied && (
            <p className='text-green-400 text-xs text-center mt-2'>Copied to clipboard!</p>
          )}

          <div className='mt-5 pt-4 border-t border-white/10'>
            <div className='flex items-center justify-between text-xs text-white/30'>
              <span>{userName}</span>
              <span className='font-mono'>{registrationId.slice(0, 8).toUpperCase()}</span>
            </div>
          </div>
        </div>
      </div>

      <p className='text-white/25 text-xs text-center mt-6 leading-relaxed'>
        This tag is yours permanently — it will work for all future Stride events too.
      </p>
    </div>
  )
}
