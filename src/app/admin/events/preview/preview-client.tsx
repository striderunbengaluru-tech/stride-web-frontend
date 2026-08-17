'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { EventPreview } from '@/components/admin/event-preview'
import type { EventPackage } from '@/types/event'

type PreviewData = {
  name: string
  subtitle: string
  pricePaise: number
  eventDate: string
  location: string
  details: string
  bannerImages: string[]
  packages?: EventPackage[]
  packagesMultiSelect?: boolean
}

// Client half of the preview route. The payload is handed over through
// sessionStorage by the event form, so it can only be read in the browser —
// which is why this is split from the page, whose only job is the admin gate.
export function EventPreviewClient() {
  const [data, setData] = useState<PreviewData | null>(null)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('event_form_preview')
      if (raw) setData(JSON.parse(raw) as PreviewData)
    } catch {
      // ignore parse errors
    }
  }, [])

  return (
    <div className='min-h-screen bg-stride-purple-primary px-4 py-8'>
      <div className='max-w-sm mx-auto'>
        <Link
          href='/admin/events/new'
          className='inline-flex items-center gap-1.5 text-white/40 hover:text-white text-sm transition-colors mb-6 group'
        >
          <ArrowLeft size={15} className='group-hover:-translate-x-0.5 transition-transform' />
          Back to form
        </Link>

        {data ? (
          <EventPreview {...data} />
        ) : (
          <div className='text-center py-16'>
            <p className='text-white/30 text-sm'>No preview data found.</p>
            <p className='text-white/20 text-xs mt-1'>Open this page from the event form.</p>
          </div>
        )}
      </div>
    </div>
  )
}
