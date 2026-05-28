'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, X, Check, MapPin, Linkedin, Instagram, Activity } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import { RoleBadge } from '@/utils/profile'
import type { UserProfile } from '@/types/user'

type Props = {
  initialName: string
  initialLocation: string
  initialLinkedin: string
  initialInstagram: string
  initialStrava: string
  username: string
  role: UserProfile['role']
  joinedYear: number
  isOwnProfile: boolean
}

export function EditHeaderSection({
  initialName, initialLocation, initialLinkedin, initialInstagram, initialStrava,
  username, role, joinedYear, isOwnProfile,
}: Props) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(initialName)
  const [location, setLocation] = useState(initialLocation)
  const [linkedin, setLinkedin] = useState(initialLinkedin)
  const [instagram, setInstagram] = useState(initialInstagram)
  const [strava, setStrava] = useState(initialStrava)
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  async function save() {
    setSaving(true)
    await fetch('/api/profile/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name || undefined,
        location: location || undefined,
        linkedinUrl: linkedin || undefined,
        instagramUrl: instagram || undefined,
        stravaUrl: strava || undefined,
      }),
    })
    setSaving(false)
    setEditing(false)
    router.refresh()
  }

  const inp = 'w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-stride-yellow-accent/50 transition-colors'

  return (
    <div>
      <div className='flex items-start justify-between gap-3'>
        <div className='min-w-0 flex-1'>
          {!editing && (
            <>
              <div className='flex items-center gap-2.5 flex-wrap'>
                <h1 className='text-2xl sm:text-3xl font-bold text-white tracking-tight truncate'>{name}</h1>
                <RoleBadge role={role} />
              </div>

              <div className='flex items-center gap-2 text-white/40 text-xs flex-wrap mt-1.5'>
                <span>@{username}</span>
                <span className='opacity-40'>·</span>
                <span>Joined {joinedYear}</span>
                {location && (
                  <>
                    <span className='opacity-40'>·</span>
                    <span className='flex items-center gap-1'>
                      <MapPin size={10} />
                      {location}
                    </span>
                  </>
                )}
              </div>

              {(linkedin || instagram || strava) && (
                <div className='flex gap-3 mt-3'>
                  {linkedin && (
                    <a href={linkedin} target='_blank' rel='noopener noreferrer'
                      className='text-white/30 hover:text-[#0A66C2] transition-colors' aria-label='LinkedIn'>
                      <Linkedin size={17} />
                    </a>
                  )}
                  {instagram && (
                    <a href={instagram} target='_blank' rel='noopener noreferrer'
                      className='text-white/30 hover:text-[#E1306C] transition-colors' aria-label='Instagram'>
                      <Instagram size={17} />
                    </a>
                  )}
                  {strava && (
                    <a href={strava} target='_blank' rel='noopener noreferrer'
                      className='text-white/30 hover:text-[#FC4C02] transition-colors' aria-label='Strava'>
                      <Activity size={17} />
                    </a>
                  )}
                </div>
              )}

              {isOwnProfile && !linkedin && !instagram && !strava && (
                <button
                  onClick={() => setEditing(true)}
                  className='mt-2 text-white/20 text-xs hover:text-white/40 transition-colors italic'
                >
                  Add social links...
                </button>
              )}
            </>
          )}
        </div>

        {isOwnProfile && !editing && (
          <button
            onClick={() => setEditing(true)}
            className='w-8 h-8 shrink-0 flex items-center justify-center rounded-full bg-white/6 border border-white/12 text-white/35 hover:text-white hover:border-white/25 transition-colors'
            aria-label='Edit profile info'
          >
            <Pencil size={13} />
          </button>
        )}
      </div>

      {editing && (
        <div className='mt-3 space-y-2.5'>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-2.5'>
            <input className={inp} placeholder='Display name' value={name} onChange={e => setName(e.target.value)} autoFocus />
            <input className={inp} placeholder='Location (e.g. Bengaluru)' value={location} onChange={e => setLocation(e.target.value)} />
          </div>
          <div className='grid grid-cols-1 sm:grid-cols-3 gap-2.5'>
            <input className={inp} placeholder='LinkedIn URL' value={linkedin} onChange={e => setLinkedin(e.target.value)} />
            <input className={inp} placeholder='Instagram URL' value={instagram} onChange={e => setInstagram(e.target.value)} />
            <input className={inp} placeholder='Strava URL' value={strava} onChange={e => setStrava(e.target.value)} />
          </div>
          <div className='flex gap-2 pt-1'>
            <button onClick={save} disabled={saving}
              className='flex items-center gap-1.5 bg-stride-yellow-accent text-copy-black text-xs font-semibold px-4 py-2 rounded-lg hover:bg-stride-yellow-accent/90 disabled:opacity-50 min-h-9'>
              {saving ? <Spinner className='w-3 h-3' /> : <Check size={13} />}
              Save
            </button>
            <button onClick={() => setEditing(false)}
              className='flex items-center gap-1.5 text-white/40 hover:text-white text-xs px-4 py-2 rounded-lg border border-white/15 transition-colors min-h-9'>
              <X size={13} /> Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
