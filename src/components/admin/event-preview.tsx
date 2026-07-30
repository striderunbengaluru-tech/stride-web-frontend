'use client'

import { useState } from 'react'
import Image from 'next/image'
import ReactMarkdown from 'react-markdown'
import { Calendar, MapPin, Monitor, Smartphone, Lock, Ticket, Gauge, Activity } from 'lucide-react'
import {
  istLocalToUtcIso, formatDateLongIST, formatTimeIST,
  formatMonthIST, formatDayIST,
} from '@/lib/utils/ist'
import { eventPriceLabel, priceLabel as priceOf } from '@/lib/utils/money'
import type { EventPackage } from '@/types/event'

type Props = {
  name: string
  subtitle: string
  pricePaise: number
  eventDate: string
  location: string
  details: string
  bannerImages: string[]
  slug?: string
  distanceKm?: string | number | null
  difficulty?: string | null
  /** Empty when the event is priced with a single fixed amount. */
  packages?: EventPackage[]
  packagesMultiSelect?: boolean
}

// IST-pinned like the public page, so the preview can't disagree with what a
// runner will see. The datetime-local value being previewed is IST wall clock
// already, so it's converted to an instant first.
function previewIso(d: string): string | null {
  return istLocalToUtcIso(d) ?? (Number.isNaN(new Date(d).getTime()) ? null : new Date(d).toISOString())
}
function formatDateLong(d: string) {
  const iso = d ? previewIso(d) : null
  return iso ? formatDateLongIST(iso) : null
}
function formatTime(d: string) {
  const iso = d ? previewIso(d) : null
  return iso ? formatTimeIST(iso) : null
}
function formatMonth(d: string) {
  const iso = previewIso(d)
  return iso ? formatMonthIST(iso) : '—'
}
function formatDay(d: string) {
  const iso = previewIso(d)
  return iso ? formatDayIST(iso) : '—'
}

type ViewMode = 'mobile' | 'desktop'

// Renders the same Luma-style layout as the public event page:
// - Mobile: image on top, content stacked below
// - Desktop: image left (~44%), content right
function PreviewContent({ name, subtitle, pricePaise, eventDate, location, details, bannerImages, distanceKm, difficulty, packages = [], packagesMultiSelect = false, layout }: Omit<Props, 'slug'> & { layout: ViewMode }) {
  const hasImage = bannerImages.length > 0
  const dateLong = formatDateLong(eventDate)
  const startTime = formatTime(eventDate)
  const hasPackages = packages.length > 0
  const priceLabel = eventPriceLabel(pricePaise, packages, hasPackages)
  // With packages the CTA can't name one amount — the runner builds the total.
  const ctaLabel = hasPackages
    ? 'Register — choose a package'
    : pricePaise === 0 ? 'RSVP Free' : `Register — ${priceLabel}`
  const distance = distanceKm !== undefined && distanceKm !== null && distanceKm !== '' ? distanceKm : null

  const imageBlock = (
    <div className={`relative w-full overflow-hidden bg-stride-purple-primary ${layout === 'mobile' ? 'aspect-square max-h-[88vw]' : 'aspect-square'}`}>
      {hasImage ? (
        <Image src={bannerImages[0]} alt={name || 'Event'} fill className='object-contain' sizes='500px' unoptimized />
      ) : (
        <div className='absolute inset-0 flex items-center justify-center'>
          <span className='text-white/10 text-6xl select-none'>🏃</span>
        </div>
      )}
    </div>
  )

  const contentBlock = (
    <div className='px-4 sm:px-5 pt-5 pb-6'>
      {/* Title */}
      <h2 className='text-2xl font-bold text-white leading-tight tracking-tight'>
        {name || <span className='text-white/20'>Your event name</span>}
      </h2>
      {subtitle && <p className='text-white/55 text-sm mt-2 leading-snug'>{subtitle}</p>}

      {/* Distance + difficulty pills */}
      {(distance || difficulty) && (
        <div className='flex flex-wrap gap-1.5 mt-3'>
          {distance && (
            <span className='inline-flex items-center gap-1.5 bg-white/8 border border-white/15 rounded-full px-2.5 py-1 text-white/80 text-[10px] font-semibold'>
              <Gauge size={10} />
              {distance} km
            </span>
          )}
          {difficulty && (
            <span className='inline-flex items-center gap-1.5 bg-white/8 border border-white/15 rounded-full px-2.5 py-1 text-white/80 text-[10px] font-semibold'>
              <Activity size={10} />
              {difficulty}
            </span>
          )}
        </div>
      )}

      {/* When & Where card */}
      <div className='mt-5 rounded-xl border border-white/10 bg-white/4 overflow-hidden'>
        {dateLong && (
          <div className='flex items-start gap-3 px-3.5 py-3 border-b border-white/8'>
            <div className='w-9 h-9 rounded-lg bg-white/8 border border-white/12 flex flex-col items-center justify-center shrink-0 leading-none gap-0.5'>
              <span className='text-stride-yellow-accent text-[7px] font-black font-mono uppercase tracking-widest'>{formatMonth(eventDate)}</span>
              <span className='text-white font-bold text-xs leading-none'>{formatDay(eventDate)}</span>
            </div>
            <div className='flex-1 min-w-0'>
              <p className='text-white/40 text-[9px] font-bold font-mono uppercase tracking-widest mb-0.5'>When</p>
              <p className='text-white font-semibold text-[13px] truncate'>{dateLong}</p>
              {startTime && <p className='text-white/50 text-[11px] mt-0.5'>{startTime}</p>}
            </div>
          </div>
        )}
        {location && (
          <div className='flex items-start gap-3 px-3.5 py-3'>
            <div className='w-9 h-9 rounded-lg bg-white/8 border border-white/12 flex items-center justify-center shrink-0'>
              <MapPin size={13} className='text-white/50' />
            </div>
            <div className='flex-1 min-w-0'>
              <p className='text-white/40 text-[9px] font-bold font-mono uppercase tracking-widest mb-0.5'>Where</p>
              <p className='text-white font-semibold text-[13px] truncate'>{location}</p>
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
        <div className='px-3.5 py-3.5'>
          <div className='flex items-center justify-between mb-2.5'>
            <p className='text-white/55 text-xs'>Sign up and lace up.</p>
            <p className='text-lg font-bold text-white'>{priceLabel}</p>
          </div>

          {hasPackages && (
            <div className='mb-2.5 space-y-1.5'>
              <p className='text-white/40 text-[10px] font-bold font-mono uppercase tracking-widest'>
                {packagesMultiSelect ? 'Pick any' : 'Pick one'}
              </p>
              {packages.map(pkg => (
                <div key={pkg.id} className='flex items-start justify-between gap-2 rounded-lg border border-white/10 bg-white/3 px-2.5 py-1.5'>
                  <span className='text-white/75 text-[11px] line-clamp-2'>{pkg.name.trim() || 'Untitled package'}</span>
                  <span className='text-white text-[11px] font-semibold shrink-0'>{priceOf(pkg.amountPaise)}</span>
                </div>
              ))}
            </div>
          )}

          <button disabled className='w-full py-2 rounded-md bg-stride-yellow-accent text-copy-black font-bold text-xs opacity-70 cursor-default'>
            {ctaLabel}
          </button>
        </div>
      </div>

      {/* About */}
      {details && (
        <div className='mt-5'>
          <p className='text-white/40 text-[10px] font-bold font-mono uppercase tracking-widest mb-2'>About Event</p>
          <div className='prose prose-invert prose-sm max-w-none prose-p:text-white/75 prose-p:leading-relaxed prose-p:text-[12px] prose-headings:text-white prose-headings:font-bold prose-headings:text-sm prose-a:text-stride-yellow-accent prose-strong:text-white prose-li:text-white prose-li:text-[12px] prose-ul:my-1.5 prose-ol:my-1.5 [&_ul>li::marker]:text-stride-yellow-accent [&_ol>li::marker]:text-stride-yellow-accent'>
            <ReactMarkdown>{details}</ReactMarkdown>
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

  // Desktop: two-column
  return (
    <div className='bg-stride-purple-primary flex'>
      <div className='w-[44%] shrink-0'>{imageBlock}</div>
      <div className='flex-1 min-w-0 pt-2'>{contentBlock}</div>
    </div>
  )
}

export function EventPreview({ name, subtitle, pricePaise, eventDate, location, details, bannerImages, slug, distanceKm, difficulty, packages, packagesMultiSelect }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>('mobile')

  const urlSlug = slug || 'your-event-name'
  const fullUrl = `strideclub.in/events/${urlSlug}`

  return (
    <div className='rounded-2xl overflow-hidden border border-white/15 bg-white/5'>
      {/* Header with view toggle */}
      <div className='flex items-center justify-between px-4 py-2.5 border-b border-white/10 bg-white/5'>
        <span className='text-white/40 text-xs font-medium'>Live Preview</span>
        <div className='flex items-center gap-1 bg-white/8 rounded-lg p-0.5'>
          <button
            onClick={() => setViewMode('mobile')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
              viewMode === 'mobile' ? 'bg-stride-yellow-accent text-copy-black' : 'text-white/40 hover:text-white/70'
            }`}
            aria-label='Mobile preview'
          >
            <Smartphone size={12} />
            Mobile
          </button>
          <button
            onClick={() => setViewMode('desktop')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
              viewMode === 'desktop' ? 'bg-stride-yellow-accent text-copy-black' : 'text-white/40 hover:text-white/70'
            }`}
            aria-label='Desktop preview'
          >
            <Monitor size={12} />
            Desktop
          </button>
        </div>
      </div>

      {/* Viewport */}
      {viewMode === 'mobile' ? (
        /* Mobile — phone shell with browser bar showing the real URL */
        <div className='bg-[#0e0518] p-4 flex justify-center'>
          <div className='w-full max-w-[360px] rounded-[2rem] overflow-hidden border border-white/20 shadow-2xl bg-stride-purple-primary'>
            {/* Phone status bar */}
            <div className='bg-black/60 px-5 py-1.5 flex items-center justify-between'>
              <span className='text-white/70 text-[10px] font-semibold tabular-nums'>9:41</span>
              <div className='flex gap-1 items-center'>
                <span className='inline-block w-2.5 h-2.5 rounded-full bg-white/30' />
                <span className='inline-block w-3 h-1.5 bg-white/40 rounded-[1px]' />
                <span className='inline-block w-4 h-1.5 bg-white/40 rounded-[1px]' />
              </div>
            </div>
            {/* Tiny browser URL bar */}
            <div className='bg-white/5 border-b border-white/10 px-3 py-1.5 flex items-center gap-1.5'>
              <Lock size={10} className='text-white/30 shrink-0' />
              <span className='text-white/55 text-[10px] font-medium truncate'>{fullUrl}</span>
            </div>
            <PreviewContent
              name={name} subtitle={subtitle} pricePaise={pricePaise} eventDate={eventDate}
              location={location} details={details} bannerImages={bannerImages}
              distanceKm={distanceKm} difficulty={difficulty}
              packages={packages} packagesMultiSelect={packagesMultiSelect}
              layout='mobile'
            />
          </div>
        </div>
      ) : (
        /* Desktop — browser chrome with the real URL */
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
          <PreviewContent
            name={name} subtitle={subtitle} pricePaise={pricePaise} eventDate={eventDate}
            location={location} details={details} bannerImages={bannerImages}
            distanceKm={distanceKm} difficulty={difficulty}
            packages={packages} packagesMultiSelect={packagesMultiSelect}
            layout='desktop'
          />
        </div>
      )}
    </div>
  )
}
