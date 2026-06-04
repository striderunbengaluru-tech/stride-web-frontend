'use client'

import { useState } from 'react'
import { CheckCircle, Copy, Tag } from 'lucide-react'

type Props = {
  runnerTag: string | null
  registrationId: string
  userName: string
}

// Slim runner-tag card — just the 4-letter tag the admin scans at check-in.
// Surrounding context (event info, share buttons) lives on the confirmation
// page itself, not on this component.
export function RunnerTagTicket({ runnerTag, registrationId, userName }: Props) {
  const [copied, setCopied] = useState(false)

  async function copyTag() {
    if (!runnerTag) return
    await navigator.clipboard.writeText(runnerTag)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className='bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl px-6 py-5'>
      <div className='flex items-center gap-1.5 mb-1'>
        <Tag size={13} className='text-stride-yellow-accent' strokeWidth={2.5} />
        <p className='text-white/40 text-xs font-medium font-mono uppercase tracking-widest'>Stride Tag</p>
      </div>
      <p className='text-white/40 text-xs mb-4'>Show this to the admin at check-in.</p>

      {runnerTag ? (
        <button
          type='button'
          onClick={copyTag}
          className='group w-full flex items-center justify-between bg-stride-yellow-accent/12 border border-stride-yellow-accent/35 rounded-xl px-5 py-4 hover:bg-stride-yellow-accent/20 hover:border-stride-yellow-accent/60 active:scale-[0.98] transition-all'
          aria-label='Copy Stride Tag'
        >
          <span className='text-stride-yellow-accent font-mono font-black text-4xl sm:text-5xl tracking-[0.4em]'>
            {runnerTag}
          </span>
          <span className='text-stride-yellow-accent/50 group-hover:text-stride-yellow-accent transition-colors shrink-0 ml-2'>
            {copied ? <CheckCircle size={20} /> : <Copy size={20} />}
          </span>
        </button>
      ) : (
        <div className='bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-center'>
          <p className='text-white/25 text-sm'>Tag not yet assigned</p>
        </div>
      )}

      {copied && (
        <p className='text-green-400 text-xs text-center mt-2 font-medium'>Copied to clipboard ✓</p>
      )}

      {/* Footer — user + reg id */}
      <div className='mt-4 pt-3 border-t border-white/10 flex items-center justify-between gap-3'>
        <span className='text-white/30 text-xs truncate max-w-[60%]'>{userName}</span>
        <span className='font-mono text-white/25 text-xs tracking-wider'>{registrationId.slice(0, 8).toUpperCase()}</span>
      </div>
    </div>
  )
}
