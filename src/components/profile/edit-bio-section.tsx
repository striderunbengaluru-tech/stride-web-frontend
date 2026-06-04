'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, X, Check } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'

type Props = {
  bio: string | null
  isOwnProfile: boolean
}

export function EditBioSection({ bio, isOwnProfile }: Props) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(bio ?? '')
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  const tooLong = value.length > 300

  async function save() {
    if (tooLong) return
    setSaving(true)
    await fetch('/api/profile/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bio: value || undefined }),
    })
    setSaving(false)
    setEditing(false)
    router.refresh()
  }

  return (
    <div className='h-full bg-white/8 border border-white/10 rounded-2xl p-5 flex flex-col gap-3 hover:border-white/15 transition-colors'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <div className='h-4 w-1 bg-stride-yellow-accent rounded-full' aria-hidden='true' />
          <h2 className='text-white font-semibold text-sm tracking-wide'>About</h2>
        </div>
        {isOwnProfile && !editing && (
          <button
            onClick={() => setEditing(true)}
            className='w-7 h-7 flex items-center justify-center rounded-full bg-white/5 border border-white/12 text-white/30 hover:text-white hover:border-white/25 transition-colors'
            aria-label='Edit bio'
          >
            <Pencil size={12} />
          </button>
        )}
      </div>

      {editing ? (
        <div className='flex flex-col gap-3 flex-1'>
          <textarea
            className='flex-1 min-h-28 w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-stride-yellow-accent/50 resize-none transition-colors'
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder='Tell the community about your running journey...'
            autoFocus
          />
          <div className='flex items-center justify-between'>
            <div className='flex gap-2'>
              <button onClick={save} disabled={saving || tooLong}
                className='flex items-center gap-1.5 bg-stride-yellow-accent text-copy-black text-xs font-semibold px-3 py-2 rounded-lg hover:bg-stride-yellow-accent/90 disabled:opacity-50 disabled:cursor-not-allowed min-h-9'>
                {saving ? <Spinner className='w-3 h-3' /> : <Check size={12} />} Save
              </button>
              <button onClick={() => { setEditing(false); setValue(bio ?? '') }}
                className='flex items-center gap-1.5 text-white/40 hover:text-white text-xs px-3 py-2 rounded-lg border border-white/15 transition-colors min-h-9'>
                <X size={12} /> Cancel
              </button>
            </div>
            <span className={`text-xs tabular-nums ${tooLong ? 'text-red-400 font-semibold' : 'text-white/20'}`}>{value.length}/300</span>
          </div>
        </div>
      ) : bio ? (
        <p className='text-white/65 text-sm leading-relaxed'>{bio}</p>
      ) : isOwnProfile ? (
        <button
          onClick={() => setEditing(true)}
          className='text-left text-white/25 text-sm italic hover:text-white/40 transition-colors'
        >
          Add a bio to tell people about your running journey...
        </button>
      ) : (
        <p className='text-white/25 text-sm italic'>No bio added yet.</p>
      )}
    </div>
  )
}
