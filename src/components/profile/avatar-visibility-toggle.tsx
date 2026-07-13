'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Switch } from '@/components/ui/switch'

type Props = {
  initialPublic: boolean
}

// Owner-only control (DPDP consent granularity): when off, the profile photo
// is stripped server-side from all public surfaces — public profile view,
// link previews (OG tags), and the leaderboard. The owner and club admins
// still see it.
export function AvatarVisibilityToggle({ initialPublic }: Props) {
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
        body: JSON.stringify({ avatarPublic: next }),
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
        <span className='text-white/50 text-xs'>Show my photo publicly</span>
        <Switch
          checked={isPublic}
          onCheckedChange={handleToggle}
          disabled={saving}
          label='Show my photo publicly'
        />
      </div>
      <p className='text-white/30 text-[11px] leading-snug mt-1'>
        {isPublic ? 'Visible to everyone on your profile and the leaderboard.' : 'Only you and club admins can see your photo.'}
      </p>
      {error && <p className='text-red-400 text-xs mt-1' role='alert'>{error}</p>}
    </div>
  )
}
