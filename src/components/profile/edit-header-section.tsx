'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, X, Check, MapPin, User } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import { RoleBadge } from '@/utils/profile'
import { InstagramIcon, StravaIcon, LinkedInIcon, XIcon } from '@/components/ui/brand-icons'
import { LocationSelect } from '@/components/profile/location-select'
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

// Each social link must live on its platform's domain — this is what catches
// people pasting just their handle ("kushagra.g", "@runner_23") instead of the
// shareable profile link.
const SOCIAL_PLATFORMS = {
  Instagram: { hosts: ['instagram.com'], example: 'https://instagram.com/your_handle' },
  Strava:    { hosts: ['strava.com', 'strava.app.link'], example: 'https://strava.com/athletes/1234567' },
  LinkedIn:  { hosts: ['linkedin.com'], example: 'https://linkedin.com/in/your-name' },
  X:         { hosts: ['x.com', 'twitter.com'], example: 'https://x.com/your_handle' },
} as const

type SocialLabel = keyof typeof SOCIAL_PLATFORMS

// Returns the normalised URL, '' for empty input, or an error message.
function validateSocialUrl(label: SocialLabel, raw: string): { url: string } | { error: string } {
  const trimmed = raw.trim()
  if (!trimmed) return { url: '' }

  const { hosts, example } = SOCIAL_PLATFORMS[label]
  const normalised = normaliseUrl(trimmed)
  if (normalised === null) {
    return { error: `“${trimmed}” looks like an ID, not a link. Paste your shareable ${label} profile link instead (e.g. ${example}).` }
  }
  const hostname = new URL(normalised).hostname.toLowerCase()
  const onPlatform = hosts.some(h => hostname === h || hostname.endsWith(`.${h}`))
  if (!onPlatform) {
    return { error: `That doesn’t look like a ${label} link. Paste your shareable ${label} profile link (e.g. ${example}), not just your ID.` }
  }
  return { url: normalised }
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

    // Social links: normalise (add https:// if missing) and validate that each
    // one is a real link on its platform's domain — not just a pasted ID.
    const fields: { label: SocialLabel; value: string }[] = [
      { label: 'LinkedIn', value: linkedin },
      { label: 'Instagram', value: instagram },
      { label: 'X', value: x },
      { label: 'Strava', value: strava },
    ]
    const normalised: Record<string, string> = {}
    for (const { label, value } of fields) {
      const result = validateSocialUrl(label, value)
      if ('error' in result) return setError(result.error)
      normalised[label] = result.url
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
          <p className='text-white/30 text-[10px] font-semibold font-mono uppercase tracking-widest'>Details</p>
          <div className='flex flex-col gap-2.5'>
            <IconInput icon={<User size={15} className='text-white/40' />} placeholder='Display name' value={name} onChange={setName} autoFocus />
            <LocationSelect icon={<MapPin size={15} className='text-white/40' />} value={location} onChange={setLocation} />
          </div>
        </div>

        {/* Social links — stacked full-width so long URLs stay readable.
            Order: Instagram · Strava · LinkedIn · X. */}
        <div className='space-y-2.5'>
          <p className='text-white/30 text-[10px] font-semibold font-mono uppercase tracking-widest'>Social links</p>
          <div className='flex flex-col gap-2.5'>
            <IconInput icon={<InstagramIcon className='w-[15px] h-[15px] text-[#E1306C]' />} placeholder='Instagram URL' value={instagram} onChange={setInstagram} />
            <IconInput icon={<StravaIcon className='w-[15px] h-[15px] text-[#FC4C02]' />} placeholder='Strava URL' value={strava} onChange={setStrava} />
            <IconInput icon={<LinkedInIcon className='w-[15px] h-[15px] text-[#0A66C2]' />} placeholder='LinkedIn URL' value={linkedin} onChange={setLinkedin} />
            <IconInput icon={<XIcon className='w-[14px] h-[14px] text-white' />} placeholder='X (Twitter) URL' value={x} onChange={setX} />
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
          {instagram && (
            <a href={instagram} target='_blank' rel='noopener noreferrer'
              className={`${SOCIAL_BTN} hover:text-[#E1306C] hover:border-[#E1306C]/40`} aria-label='Instagram'>
              <InstagramIcon className='w-4 h-4' />
            </a>
          )}
          {strava && (
            <a href={strava} target='_blank' rel='noopener noreferrer'
              className={`${SOCIAL_BTN} hover:text-[#FC4C02] hover:border-[#FC4C02]/40`} aria-label='Strava'>
              <StravaIcon className='w-4 h-4' />
            </a>
          )}
          {linkedin && (
            <a href={linkedin} target='_blank' rel='noopener noreferrer'
              className={`${SOCIAL_BTN} hover:text-[#0A66C2] hover:border-[#0A66C2]/40`} aria-label='LinkedIn'>
              <LinkedInIcon className='w-4 h-4' />
            </a>
          )}
          {x && (
            <a href={x} target='_blank' rel='noopener noreferrer'
              className={`${SOCIAL_BTN} hover:text-white hover:border-white/40`} aria-label='X (Twitter)'>
              <XIcon className='w-[15px] h-[15px]' />
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
