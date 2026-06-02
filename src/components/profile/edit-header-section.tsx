'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, X, Check, MapPin, Linkedin, Instagram, Activity, User } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import { RoleBadge } from '@/utils/profile'
import type { UserProfile } from '@/types/user'

type Props = {
  initialName: string
  initialLocation: string
  initialLinkedin: string
  initialInstagram: string
  initialX: string
  initialStrava: string
  username: string
  role: UserProfile['role']
  joinedLabel: string
  isOwnProfile: boolean
}

// X (Twitter) logo — lucide's Twitter is the old bird, so we inline the current mark.
function XLogo({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox='0 0 24 24' fill='currentColor' aria-hidden='true'>
      <path d='M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z' />
    </svg>
  )
}

// Name must contain at least one letter and only letters / spaces / ' . - (no digits).
const NAME_RE = /^(?=.*\p{L})[\p{L}\s'.-]+$/u

// Returns a normalised https URL, '' for empty input, or null if invalid.
function normaliseUrl(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return ''
  const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    const u = new URL(withProto)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    if (!u.hostname.includes('.')) return null
    return u.toString()
  } catch {
    return null
  }
}

const SOCIAL_BTN = 'w-9 h-9 flex items-center justify-center rounded-full bg-white/6 border border-white/12 text-white/50 transition-colors'

// Input with a leading (optionally brand-coloured) icon — used in the edit form.
function IconInput({
  icon, value, onChange, placeholder, autoFocus,
}: {
  icon: React.ReactNode
  value: string
  onChange: (v: string) => void
  placeholder: string
  autoFocus?: boolean
}) {
  return (
    <div className='flex items-center gap-2.5 bg-white/5 border border-white/15 rounded-lg px-3 focus-within:border-stride-yellow-accent/50 transition-colors'>
      <span className='shrink-0 flex items-center justify-center w-4'>{icon}</span>
      <input
        className='flex-1 min-w-0 bg-transparent py-2.5 text-white text-sm placeholder:text-white/30 focus:outline-none'
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
      />
    </div>
  )
}

export function EditHeaderSection({
  initialName, initialLocation, initialLinkedin, initialInstagram, initialX, initialStrava,
  username, role, joinedLabel, isOwnProfile,
}: Props) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(initialName)
  const [location, setLocation] = useState(initialLocation)
  const [linkedin, setLinkedin] = useState(initialLinkedin)
  const [instagram, setInstagram] = useState(initialInstagram)
  const [x, setX] = useState(initialX)
  const [strava, setStrava] = useState(initialStrava)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function save() {
    setError(null)

    // Name: required, letters only (no digits), max 500.
    const trimmedName = name.trim()
    if (!trimmedName) return setError('Please enter your name')
    if (trimmedName.length > 500) return setError('Name must be 500 characters or fewer')
    if (!NAME_RE.test(trimmedName)) return setError('Name can only contain letters — no numbers or symbols')

    // Social links: normalise (add https:// if missing) and validate each.
    const fields: { label: string; value: string }[] = [
      { label: 'LinkedIn', value: linkedin },
      { label: 'Instagram', value: instagram },
      { label: 'X', value: x },
      { label: 'Strava', value: strava },
    ]
    const normalised: Record<string, string> = {}
    for (const { label, value } of fields) {
      const result = normaliseUrl(value)
      if (result === null) return setError(`Enter a valid ${label} URL (e.g. https://…)`)
      normalised[label] = result
    }

    setSaving(true)
    const res = await fetch('/api/profile/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: trimmedName,
        location: location.trim() || undefined,
        linkedinUrl: normalised.LinkedIn,
        instagramUrl: normalised.Instagram,
        xUrl: normalised.X,
        stravaUrl: normalised.Strava,
      }),
    })
    setSaving(false)
    if (!res.ok) {
      setError('Couldn’t save — please check your details and try again.')
      return
    }
    // Reflect normalised links locally so the saved state shows immediately.
    setLinkedin(normalised.LinkedIn)
    setInstagram(normalised.Instagram)
    setX(normalised.X)
    setStrava(normalised.Strava)
    setEditing(false)
    router.refresh()
  }

  // Cancel discards edits — restore every field to its last-saved value.
  function cancelEdit() {
    setName(initialName)
    setLocation(initialLocation)
    setLinkedin(initialLinkedin)
    setInstagram(initialInstagram)
    setX(initialX)
    setStrava(initialStrava)
    setError(null)
    setEditing(false)
  }

  const hasSocials = linkedin || instagram || x || strava

  if (editing) {
    return (
      <div className='mt-1 space-y-4 text-left'>
        {/* Identity */}
        <div className='space-y-2.5'>
          <p className='text-white/30 text-[10px] font-semibold uppercase tracking-widest'>Details</p>
          <div className='flex flex-col gap-2.5'>
            <IconInput icon={<User size={15} className='text-white/40' />} placeholder='Display name' value={name} onChange={setName} autoFocus />
            <IconInput icon={<MapPin size={15} className='text-white/40' />} placeholder='Location (e.g. Bengaluru)' value={location} onChange={setLocation} />
          </div>
        </div>

        {/* Social links — stacked full-width so long URLs stay readable */}
        <div className='space-y-2.5'>
          <p className='text-white/30 text-[10px] font-semibold uppercase tracking-widest'>Social links</p>
          <div className='flex flex-col gap-2.5'>
            <IconInput icon={<Linkedin size={15} className='text-[#0A66C2]' />} placeholder='LinkedIn URL' value={linkedin} onChange={setLinkedin} />
            <IconInput icon={<Instagram size={15} className='text-[#E1306C]' />} placeholder='Instagram URL' value={instagram} onChange={setInstagram} />
            <IconInput icon={<XLogo size={14} />} placeholder='X (Twitter) URL' value={x} onChange={setX} />
            <IconInput icon={<Activity size={15} className='text-[#FC4C02]' />} placeholder='Strava URL' value={strava} onChange={setStrava} />
          </div>
        </div>

        {error && (
          <p className='text-red-400 text-xs bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2'>{error}</p>
        )}

        <div className='flex gap-2 pt-0.5'>
          <button onClick={save} disabled={saving}
            className='flex items-center gap-1.5 bg-stride-yellow-accent text-copy-black text-xs font-semibold px-4 py-2 rounded-lg hover:bg-stride-yellow-accent/90 disabled:opacity-50 min-h-9'>
            {saving ? <Spinner className='w-3 h-3' /> : <Check size={13} />}
            Save
          </button>
          <button onClick={cancelEdit}
            className='flex items-center gap-1.5 text-white/40 hover:text-white text-xs px-4 py-2 rounded-lg border border-white/15 transition-colors min-h-9'>
            <X size={13} /> Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className='flex flex-col items-center text-center'>
      <div className='flex items-center gap-2.5 flex-wrap justify-center'>
        <h1 className='text-2xl sm:text-3xl font-bold text-white tracking-tight'>{name}</h1>
        <RoleBadge role={role} />
      </div>

      <div className='flex items-center gap-2 text-white/40 text-xs flex-wrap justify-center mt-1.5'>
        <span>@{username}</span>
        <span className='opacity-40'>·</span>
        <span>Joined {joinedLabel}</span>
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

      {hasSocials && (
        <div className='flex gap-2.5 mt-4 justify-center'>
          {linkedin && (
            <a href={linkedin} target='_blank' rel='noopener noreferrer'
              className={`${SOCIAL_BTN} hover:text-[#0A66C2] hover:border-[#0A66C2]/40`} aria-label='LinkedIn'>
              <Linkedin size={16} />
            </a>
          )}
          {instagram && (
            <a href={instagram} target='_blank' rel='noopener noreferrer'
              className={`${SOCIAL_BTN} hover:text-[#E1306C] hover:border-[#E1306C]/40`} aria-label='Instagram'>
              <Instagram size={16} />
            </a>
          )}
          {x && (
            <a href={x} target='_blank' rel='noopener noreferrer'
              className={`${SOCIAL_BTN} hover:text-white hover:border-white/40`} aria-label='X (Twitter)'>
              <XLogo size={15} />
            </a>
          )}
          {strava && (
            <a href={strava} target='_blank' rel='noopener noreferrer'
              className={`${SOCIAL_BTN} hover:text-[#FC4C02] hover:border-[#FC4C02]/40`} aria-label='Strava'>
              <Activity size={16} />
            </a>
          )}
        </div>
      )}

      {isOwnProfile && (
        <button
          onClick={() => setEditing(true)}
          className='mt-4 inline-flex items-center gap-1.5 text-white/35 text-xs hover:text-white transition-colors rounded-full border border-white/12 px-3 py-1.5'
        >
          <Pencil size={12} />
          {hasSocials ? 'Edit profile' : 'Add details & social links'}
        </button>
      )}
    </div>
  )
}
