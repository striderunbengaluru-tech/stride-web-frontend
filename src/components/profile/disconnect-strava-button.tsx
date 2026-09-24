'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Unlink } from 'lucide-react'
import { toast } from 'sonner'
import { Spinner } from '@/components/ui/spinner'

export function DisconnectStravaButton() {
  const [pending, setPending] = useState(false)
  const router = useRouter()

  async function handleDisconnect() {
    if (!window.confirm('Disconnect Strava? Your synced runs and kilometres will be removed from Stride.')) return

    setPending(true)
    try {
      const res = await fetch('/api/strava/disconnect', { method: 'POST' })
      if (!res.ok) throw new Error(`disconnect returned ${res.status}`)
      toast.success('Strava disconnected. Your Strava data has been removed.')
      router.refresh()
    } catch {
      toast.error('Couldn’t disconnect Strava. Please try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <button
      type='button'
      onClick={handleDisconnect}
      disabled={pending}
      className='inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-white/15 px-4 text-sm font-medium text-white/70 transition-colors hover:border-white/30 hover:bg-white/5 hover:text-white disabled:opacity-50'
    >
      {pending ? <Spinner /> : <Unlink size={15} aria-hidden='true' />}
      Disconnect Strava
    </button>
  )
}
