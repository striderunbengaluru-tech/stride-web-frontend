'use client'

import { useState } from 'react'
import { MapPin, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'

type Props = {
  locationName: string
  locationUrl: string | null
}

export function MapEmbed({ locationName, locationUrl }: Props) {
  const [expanded, setExpanded] = useState(false)

  const mapSrc = `https://maps.google.com/maps?q=${encodeURIComponent(locationName)}&output=embed&hl=en&z=15`
  const mapsHref = locationUrl ?? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationName)}`

  return (
    <div className='mt-2 rounded-xl overflow-hidden border border-white/10 bg-white/5'>
      {/* Header row */}
      <button
        onClick={() => setExpanded(v => !v)}
        className='w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left'
        aria-expanded={expanded}
        aria-label={expanded ? 'Hide map' : 'Show map'}
      >
        <MapPin size={15} className='text-stride-yellow-accent shrink-0' />
        <span className='flex-1 text-white/70 text-sm font-medium truncate'>{locationName}</span>
        <div className='flex items-center gap-2 shrink-0'>
          <span className='text-white/30 text-xs'>{expanded ? 'Hide map' : 'View map'}</span>
          {expanded ? (
            <ChevronUp size={14} className='text-white/30' />
          ) : (
            <ChevronDown size={14} className='text-white/30' />
          )}
        </div>
      </button>

      {/* Expandable map */}
      {expanded && (
        <div>
          <div className='relative w-full h-52 sm:h-64'>
            <iframe
              src={mapSrc}
              className='w-full h-full border-0'
              loading='lazy'
              referrerPolicy='no-referrer-when-downgrade'
              title={`Map of ${locationName}`}
              aria-label={`Google Maps showing ${locationName}`}
            />
          </div>
          <div className='px-4 py-2.5 border-t border-white/8 flex justify-end'>
            <a
              href={mapsHref}
              target='_blank'
              rel='noopener noreferrer'
              className='flex items-center gap-1.5 text-stride-yellow-accent text-xs font-medium hover:text-stride-yellow-accent/80 transition-colors'
            >
              Open in Google Maps
              <ExternalLink size={11} />
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
