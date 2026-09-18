'use client'

import { useState } from 'react'
import Image from 'next/image'
import ReactMarkdown from 'react-markdown'
import { MapPin, Monitor, Smartphone, Lock, Ticket, Gauge, Building2, ExternalLink, Copy } from 'lucide-react'
import {
  istLocalToUtcIso, formatDateLongIST, formatTimeIST, formatDateTimeIST,
  formatMonthIST, formatDayIST,
} from '@/lib/utils/ist'
import { distanceLabel, sortDistances } from '@/types/race'

export type RacePreviewProps = {
  name: string
  description: string
  /** 'YYYY-MM-DD' IST day. */
  raceDate: string
  /** 'HH:mm' IST, or '' when the organiser has not announced one. */
  startTime: string
  /** datetime-local IST wall clock, or ''. */
  registrationDeadline: string
  city: string
  venue: string
  organizer: string
  distances: string[]
  registrationUrl: string
  couponCode: string
  discountPercent: string
  posterImages: string[]
  slug?: string
}

type ViewMode = 'mobile' | 'desktop'

/** sessionStorage key the race form uses to hand its state to the mobile preview route. */
export const RACE_PREVIEW_STORAGE_KEY = 'race_form_preview'

const MIDNIGHT = '00:00'

// The form holds an IST wall clock; the public page formats an instant. Convert
// first so the preview cannot disagree with what a runner will see.
function raceInstant(raceDate: string, startTime: string): string | null {
  if (!raceDate) return null
  return istLocalToUtcIso(`${raceDate}T${startTime || MIDNIGHT}`)
}

function PreviewContent(props: Omit<RacePreviewProps, 'slug'> & { layout: ViewMode }) {
  const {
    name, description, raceDate, startTime, registrationDeadline, city, venue, organizer,
    distances, registrationUrl, couponCode, discountPercent, posterImages, layout,
  } = props

  const instant = raceInstant(raceDate, startTime)
  const dateLong = instant ? formatDateLongIST(instant) : null
  const timeLabel = instant && startTime ? formatTimeIST(instant) : null
  const deadlineInstant = istLocalToUtcIso(registrationDeadline)
  const where = [venue.trim(), city.trim()].filter(Boolean).join(', ')
  const hasImage = posterImages.length > 0

  const imageBlock = (
    <div className={`relative w-full overflow-hidden bg-stride-purple-primary ${layout === 'mobile' ? 'aspect-[3/4] max-h-[110vw]' : 'aspect-[3/4]'}`}>
      {hasImage ? (
        <Image src={posterImages[0]} alt={name || 'Race poster'} fill className='object-contain' sizes='500px' unoptimized />
      ) : (
        <div className='absolute inset-0 flex items-center justify-center'>
          <span className='text-white/10 text-6xl select-none'>🏁</span>
        </div>
      )}
    </div>
  )

  const contentBlock = (
    <div className='px-4 sm:px-5 pt-5 pb-6'>
      <span className='inline-flex items-center gap-1 rounded-full bg-white/8 border border-white/15 px-2 py-0.5 text-[9px] font-bold font-mono uppercase tracking-widest text-white/60'>
        Third-party race
      </span>
      <h2 className='text-2xl font-bold text-white leading-tight tracking-tight mt-2'>
        {name || <span className='text-white/20'>Your race name</span>}
      </h2>
      {organizer.trim() && (
        <p className='text-white/55 text-sm mt-1.5 flex items-center gap-1.5'>
          <Building2 size={12} className='shrink-0' /> Organised by {organizer.trim()}
        </p>
      )}

      {distances.length > 0 && (
        <div className='flex flex-wrap gap-1.5 mt-3'>
          {sortDistances(distances).map(d => (
            <span key={d} className='inline-flex items-center gap-1.5 bg-white/8 border border-white/15 rounded-full px-2.5 py-1 text-white/80 text-[10px] font-semibold'>
              <Gauge size={10} />
              {distanceLabel(d)}
            </span>
          ))}
        </div>
      )}

      {/* When & Where */}
      <div className='mt-5 rounded-xl border border-white/10 bg-white/4 overflow-hidden'>
        {instant && (
          <div className='flex items-start gap-3 px-3.5 py-3 border-b border-white/8'>
            <div className='w-9 h-9 rounded-lg bg-white/8 border border-white/12 flex flex-col items-center justify-center shrink-0 leading-none gap-0.5'>
              <span className='text-stride-yellow-accent text-[7px] font-black font-mono uppercase tracking-widest'>{formatMonthIST(instant)}</span>
              <span className='text-white font-bold text-xs leading-none'>{formatDayIST(instant)}</span>
            </div>
            <div className='flex-1 min-w-0'>
              <p className='text-white/40 text-[9px] font-bold font-mono uppercase tracking-widest mb-0.5'>When</p>
              <p className='text-white font-semibold text-[13px] truncate'>{dateLong}</p>
              <p className='text-white/50 text-[11px] mt-0.5'>{timeLabel ?? 'Start time to be announced'}</p>
            </div>
          </div>
        )}
        {where && (
          <div className='flex items-start gap-3 px-3.5 py-3'>
            <div className='w-9 h-9 rounded-lg bg-white/8 border border-white/12 flex items-center justify-center shrink-0'>
              <MapPin size={13} className='text-white/50' />
            </div>
            <div className='flex-1 min-w-0'>
              <p className='text-white/40 text-[9px] font-bold font-mono uppercase tracking-widest mb-0.5'>Where</p>
              <p className='text-white font-semibold text-[13px] truncate'>{where}</p>
            </div>
          </div>
        )}
      </div>

      {/* Registration mock */}
      <div className='mt-3 rounded-xl border border-white/15 bg-white/3 overflow-hidden'>
        <div className='px-3.5 py-2 border-b border-white/8 flex items-center justify-between'>
          <span className='inline-flex items-center gap-1.5 text-white/50 text-[10px] font-bold font-mono uppercase tracking-widest'>
            <Ticket size={11} /> Registration
          </span>
          <span className='text-white/30 text-[10px]'>Preview</span>
        </div>
        <div className='px-3.5 py-3.5 space-y-2.5'>
          {deadlineInstant && (
            <p className='text-white/55 text-xs'>Registrations close {formatDateTimeIST(deadlineInstant)} IST</p>
          )}
          {registrationUrl.trim() && (
            <button disabled className='w-full py-2 rounded-md bg-stride-yellow-accent text-copy-black font-bold text-xs opacity-70 cursor-default inline-flex items-center justify-center gap-1.5'>
              Register on organiser&apos;s site <ExternalLink size={11} />
            </button>
          )}
          {couponCode.trim() && (
            <div className='flex items-center gap-2 rounded-lg border border-white/12 bg-white/5 px-3 py-2'>
              <div className='flex-1 min-w-0'>
                <p className='text-white/40 text-[9px] font-bold font-mono uppercase tracking-widest'>Stride coupon</p>
                <p className='text-white font-mono font-bold text-sm truncate'>
                  {couponCode.trim()}
                  {discountPercent.trim() && <span className='ml-2 text-stride-yellow-accent text-[10px] font-sans'>{discountPercent.trim()}% off</span>}
                </p>
              </div>
              <span className='inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-1 text-[10px] font-semibold text-white/80'>
                <Copy size={10} /> Copy
              </span>
            </div>
          )}
          {!registrationUrl.trim() && !couponCode.trim() && (
            <p className='text-white/30 text-xs italic'>Add a registration link or a coupon code.</p>
          )}
        </div>
      </div>

      {description && (
        <div className='mt-5'>
          <p className='text-white/40 text-[10px] font-bold font-mono uppercase tracking-widest mb-2'>About the race</p>
          <div className='prose prose-invert prose-sm max-w-none prose-p:text-white/75 prose-p:leading-relaxed prose-p:text-[12px] prose-headings:text-white prose-headings:font-bold prose-headings:text-sm prose-a:text-stride-yellow-accent prose-strong:text-white prose-li:text-white prose-li:text-[12px] prose-ul:my-1.5 prose-ol:my-1.5 [&_ul>li::marker]:text-stride-yellow-accent [&_ol>li::marker]:text-stride-yellow-accent'>
            <ReactMarkdown>{description}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  )

  if (layout === 'mobile') {
    return (
      <div className='bg-stride-purple-primary'>
        {imageBlock}
        {contentBlock}
      </div>
    )
  }

  return (
    <div className='bg-stride-purple-primary flex'>
      <div className='w-[40%] shrink-0'>{imageBlock}</div>
      <div className='flex-1 min-w-0 pt-2'>{contentBlock}</div>
    </div>
  )
}

export function RacePreview(props: RacePreviewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('mobile')
  const { slug, ...content } = props
  const fullUrl = `strideclub.in/race-calendar/${slug || 'your-race-name'}`

  const toggleClass = (active: boolean) =>
    `flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
      active ? 'bg-stride-yellow-accent text-copy-black' : 'text-white/40 hover:text-white/70'
    }`

  return (
    <div className='rounded-2xl overflow-hidden border border-white/15 bg-white/5'>
      <div className='flex items-center justify-between px-4 py-2.5 border-b border-white/10 bg-white/5'>
        <span className='text-white/40 text-xs font-medium'>Live Preview</span>
        <div className='flex items-center gap-1 bg-white/8 rounded-lg p-0.5'>
          <button type='button' onClick={() => setViewMode('mobile')} className={toggleClass(viewMode === 'mobile')} aria-label='Mobile preview'>
            <Smartphone size={12} /> Mobile
          </button>
          <button type='button' onClick={() => setViewMode('desktop')} className={toggleClass(viewMode === 'desktop')} aria-label='Desktop preview'>
            <Monitor size={12} /> Desktop
          </button>
        </div>
      </div>

      {viewMode === 'mobile' ? (
        <div className='bg-[#0e0518] p-4 flex justify-center'>
          <div className='w-full max-w-[360px] rounded-[2rem] overflow-hidden border border-white/20 shadow-2xl bg-stride-purple-primary'>
            <div className='bg-black/60 px-5 py-1.5 flex items-center justify-between'>
              <span className='text-white/70 text-[10px] font-semibold tabular-nums'>9:41</span>
              <div className='flex gap-1 items-center'>
                <span className='inline-block w-2.5 h-2.5 rounded-full bg-white/30' />
                <span className='inline-block w-3 h-1.5 bg-white/40 rounded-[1px]' />
                <span className='inline-block w-4 h-1.5 bg-white/40 rounded-[1px]' />
              </div>
            </div>
            <div className='bg-white/5 border-b border-white/10 px-3 py-1.5 flex items-center gap-1.5'>
              <Lock size={10} className='text-white/30 shrink-0' />
              <span className='text-white/55 text-[10px] font-medium truncate'>{fullUrl}</span>
            </div>
            <PreviewContent {...content} layout='mobile' />
          </div>
        </div>
      ) : (
        <div className='bg-[#0e0518]'>
          <div className='flex items-center gap-2 px-4 py-2 border-b border-white/8'>
            <div className='flex items-center gap-1.5'>
              <span className='w-2.5 h-2.5 rounded-full bg-red-500/60' />
              <span className='w-2.5 h-2.5 rounded-full bg-yellow-500/60' />
              <span className='w-2.5 h-2.5 rounded-full bg-green-500/60' />
            </div>
            <div className='flex-1 flex items-center gap-1.5 bg-white/8 rounded-md px-3 py-1'>
              <Lock size={11} className='text-white/35 shrink-0' />
              <span className='text-white/65 text-[11px] font-medium truncate'>{fullUrl}</span>
            </div>
          </div>
          <PreviewContent {...content} layout='desktop' />
        </div>
      )}
    </div>
  )
}
