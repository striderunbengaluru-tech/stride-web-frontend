'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Switch } from '@/components/ui/switch'

type Props = {
  initialOptIn: boolean
}

// Owner-only control for marketing email (other Stride runs, partner events).
// Off unless the member switched it on here or ticked the opt-in box when
// registering — consent to promotional mail is never a default (DPDP s.6).
// Transactional mail (confirmations, run-day logistics) is not affected: that
// is part of the service the member signed up for, not marketing.
//
// Turning it off here is the same revocation as the one-click unsubscribe link
// in every promo email; both clear the flag and its timestamp server-side.
export function MarketingEmailToggle({ initialOptIn }: Props) {
  const [optedIn, setOptedIn] = useState(initialOptIn)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleToggle(next: boolean) {
    setOptedIn(next) // optimistic
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marketingOptIn: next }),
      })
      if (!res.ok) throw new Error('Could not save. Please try again.')
      router.refresh()
    } catch (err) {
      setOptedIn(!next) // revert
      setError(err instanceof Error ? err.message : 'Could not save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className='mt-2.5 w-full'>
      <div className='flex items-center justify-center gap-2.5'>
        <span className='text-white/50 text-xs'>Event emails</span>
        <Switch
          checked={optedIn}
          onCheckedChange={handleToggle}
          disabled={saving}
          label='Email me about other Stride runs and partner events'
        />
      </div>
      <p className='text-white/30 text-[11px] leading-snug mt-1'>
        {optedIn
          ? "We'll email you about other Stride runs and partner events. Unsubscribe anytime."
          : "We'll only email you about runs you've registered for."}
      </p>
      {error && <p className='text-red-400 text-xs mt-1' role='alert'>{error}</p>}
    </div>
  )
}
