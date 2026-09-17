'use client'

import { useMemo, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { RacePreview, RACE_PREVIEW_STORAGE_KEY, type RacePreviewProps } from '@/components/admin/race-preview'

// sessionStorage as an external store: null on the server, the stored string in
// the browser. Reading it this way (rather than in an effect that then sets
// state) gives one render with the right answer and no cascading update.
const noopSubscribe = () => () => {}
function readStoredPreview(): string | null {
  try { return sessionStorage.getItem(RACE_PREVIEW_STORAGE_KEY) } catch { return null }
}

// The race form hands its state over through sessionStorage for the mobile
// "Preview" button, where there is no room for the side-by-side pane.
export function RacePreviewClient() {
  const raw = useSyncExternalStore(noopSubscribe, readStoredPreview, () => null)
  const data = useMemo<RacePreviewProps | null>(() => {
    if (!raw) return null
    try { return JSON.parse(raw) as RacePreviewProps } catch { return null }
  }, [raw])

  return (
    <div className='min-h-screen bg-stride-purple-primary px-4 py-8'>
      <div className='max-w-sm mx-auto'>
        <Link
          href='/admin/race-calendar/new'
          className='inline-flex items-center gap-1.5 text-white/40 hover:text-white text-sm transition-colors mb-6 group min-h-11'
        >
          <ArrowLeft size={15} className='group-hover:-translate-x-0.5 transition-transform' />
          Back to form
        </Link>

        {data ? (
          <RacePreview {...data} />
        ) : (
          <div className='text-center py-16'>
            <p className='text-white/30 text-sm'>No preview data found.</p>
            <p className='text-white/20 text-xs mt-1'>Open this page from the race form.</p>
          </div>
        )}
      </div>
    </div>
  )
}
