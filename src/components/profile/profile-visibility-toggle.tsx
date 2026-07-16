'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Switch } from '@/components/ui/switch'

type Props = {
  initialPublic: boolean
}

// Owner-only control (DPDP consent granularity): when off, the profile page
// returns 404 for everyone but the owner and club admins, and the athlete's
// leaderboard entry shows only name + photo without linking to the profile.
export function ProfileVisibilityToggle({ initialPublic }: Props) {
  const [isPublic, setIsPublic] = useState(initialPublic)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleToggle(next: boolean) {
    setIsPublic(next) // optimistic
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profilePublic: next }),
      })
      if (!res.ok) throw new Error('Could not save. Please try again.')
      router.refresh()
    } catch (err) {
      setIsPublic(!next) // revert
      setError(err instanceof Error ? err.message : 'Could not save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className='mt-2.5 w-full'>
      <div className='flex items-center justify-center gap-2.5'>
        <span className='text-white/50 text-xs'>Shareable profile</span>
        <Switch
          checked={isPublic}
          onCheckedChange={handleToggle}
          disabled={saving}
          label='Shareable profile'
        />
      </div>
      <p className='text-white/30 text-[11px] leading-snug mt-1'>
        {isPublic
          ? 'Anyone with your profile link can view it.'
          : "Only you can open your profile. The leaderboard still shows your name and photo, but they don't link anywhere."}
      </p>
      {error && <p className='text-red-400 text-xs mt-1' role='alert'>{error}</p>}
    </div>
  )
}
