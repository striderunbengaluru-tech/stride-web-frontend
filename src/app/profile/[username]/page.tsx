import { notFound } from 'next/navigation'
import Image from 'next/image'
import type { Metadata } from 'next'
import type { UserProfile, Prompt } from '@/types/user'
import type { OfficialRun } from '@/types/strava'
import { adminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { RoleBadge } from '@/utils/profile'
import { RunnerTagBadge } from '@/components/ui/runner-tag-badge'
import { SignOutButton } from '@/components/profile/sign-out-button'
import { CoverImageUpload } from '@/components/profile/cover-image-upload'
import { AvatarUpload } from '@/components/profile/avatar-upload'
import { AvatarImage } from '@/components/profile/avatar-image'
import { EditProfileSheet } from '@/components/profile/edit-profile-sheet'
import { ShareButton } from '@/components/profile/share-button'
import { OfficialRunsSection } from '@/components/profile/official-runs-section'
import { EventsAttendedSection } from '@/components/profile/events-attended-section'
import {
  Linkedin, Instagram, Pencil,
  Flag, Mountain, Trees, Zap, Heart, Sunrise, Moon, Clock, Star, Footprints,
  MapPin,
} from 'lucide-react'

type Props = { params: Promise<{ username: string }> }

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://striderunclub.in'

const SKILL_ICONS: Record<string, React.ReactNode> = {
  '5K':             <Footprints size={11} aria-hidden='true' />,
  '10K':            <Footprints size={11} aria-hidden='true' />,
  'Half Marathon':  <Flag size={11} aria-hidden='true' />,
  'Marathon':       <Flag size={11} aria-hidden='true' />,
  'Ultra':          <Mountain size={11} aria-hidden='true' />,
  'Trail Running':  <Trees size={11} aria-hidden='true' />,
  'Speed Work':     <Zap size={11} aria-hidden='true' />,
  'Recovery Runs':  <Heart size={11} aria-hidden='true' />,
  'Morning Runner': <Sunrise size={11} aria-hidden='true' />,
  'Night Owl':      <Moon size={11} aria-hidden='true' />,
  'Pacer':          <Clock size={11} aria-hidden='true' />,
  'New Runner':     <Star size={11} aria-hidden='true' />,
}

type MilestoneTier = { label: string; threshold: number; nextAt: number | null; color: string }
const MILESTONE_TIERS: MilestoneTier[] = [
  { label: 'Newbie',     threshold: 0,  nextAt: 6,    color: 'text-green-400 border-green-400/40 bg-green-400/10' },
  { label: 'Regular',    threshold: 6,  nextAt: 16,   color: 'text-blue-400 border-blue-400/40 bg-blue-400/10' },
  { label: 'OG Member',  threshold: 16, nextAt: null, color: 'text-stride-yellow-accent border-stride-yellow-accent/40 bg-stride-yellow-accent/10' },
]

function getMilestone(runs: number) {
  if (runs >= 16) return MILESTONE_TIERS[2]!
  if (runs >= 6)  return MILESTONE_TIERS[1]!
  return MILESTONE_TIERS[0]!
}

function parseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback
  try { return JSON.parse(raw) as T } catch { return fallback }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  const { data: row } = await adminClient
    .from('users')
    .select('full_name, bio, avatar_url, cover_url')
    .eq('username', username)
    .single()

  if (!row) return { title: 'Profile not found — Stride Run Club' }

  const displayName = row.full_name ?? username
  const title = `${displayName} — Stride Run Club`
  const description = (row.bio ?? '').slice(0, 160) || `${displayName} is a member of Stride Run Club Bengaluru.`
  const ogImage = row.cover_url ?? row.avatar_url ?? undefined

  return {
    title, description,
    openGraph: {
      title, description, type: 'profile',
      url: `${SITE_URL}/profile/${username}`,
      ...(ogImage ? { images: [{ url: ogImage, width: 800, height: 400, alt: displayName }] } : {}),
    },
  }
}

export default async function ProfilePage({ params }: Props) {
  const { username } = await params

  const { data: row } = await adminClient
    .from('users')
    .select('id, username, full_name, bio, role, avatar_url, created_at, cover_url, location, skills, linkedin_url, instagram_url, strava_url, prompts, runs_completed, runner_tag')
    .eq('username', username)
    .single()

  if (!row) notFound()

  const skills = parseJson<string[]>(row.skills, [])
  const prompts = parseJson<Prompt[]>(row.prompts, [])
  const profile: UserProfile = {
    ...(row as unknown as UserProfile),
    skills, prompts,
    runner_tag: row.runner_tag ?? null,
    strava_connected: false,
    strava_pbs: { mile: null, '5k': null, '10k': null, half: null, full: null },
    strava_recent_activities: [],
    strava_synced_at: null,
  }

  // Fetch official runs and events attended in parallel with auth
  const [{ data: officialRunsRows }, { data: attendedRegs }, supabase] = await Promise.all([
    adminClient
      .from('official_runs')
      .select('id, user_id, race_name, distance_category, race_date, finish_time, strava_activity_url, is_upcoming, created_at')
      .eq('user_id', row.id)
      .order('race_date', { ascending: false, nullsFirst: false }),
    adminClient
      .from('event_registrations')
      .select('events(id, name, slug, event_date, location, banner_images)')
      .eq('user_id', row.id)
      .not('checked_in_at', 'is', null)
      .order('checked_in_at', { ascending: false }),
    createClient(),
  ])

  const officialRuns: OfficialRun[] = officialRunsRows ?? []

  type AttendedReg = { events: { id: string; name: string; slug: string; event_date: string | null; location: string | null; banner_images: string | null } | null }
  const attendedEvents = (attendedRegs ?? [] as unknown as AttendedReg[])
    .map(r => (r as unknown as AttendedReg).events)
    .filter(Boolean) as NonNullable<AttendedReg['events']>[]

  const { data: { user } } = await supabase.auth.getUser()
  const isOwnProfile = user?.id === profile.id

  const displayName = profile.full_name ?? profile.username ?? username
  const joinedYear = new Date(profile.created_at).getFullYear()
  const runsCompleted = profile.runs_completed ?? 0
  const currentTier = getMilestone(runsCompleted)
  const profileUrl = `${SITE_URL}/profile/${username}`

  // Milestone progress within the current tier
  const tierIndex = MILESTONE_TIERS.findIndex(t => t.label === currentTier.label)
  const prevThreshold = MILESTONE_TIERS[tierIndex - 1]?.nextAt ?? 0
  const nextThreshold = currentTier.nextAt
  const tierProgress = nextThreshold
    ? Math.min(((runsCompleted - prevThreshold) / (nextThreshold - prevThreshold)) * 100, 100)
    : 100

  return (
    <main className='min-h-screen bg-stride-purple-primary pb-20'>

      {/* ── Cover ── */}
      <div className='relative w-full h-56 sm:h-72 mt-16 overflow-hidden bg-linear-to-br from-stride-purple-primary to-stride-yellow-accent/15'>
        {profile.cover_url && (
          <>
            <div
              className='absolute inset-0 scale-110'
              style={{ backgroundImage: `url(${profile.cover_url})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(24px)' }}
              aria-hidden='true'
            />
            <div className='absolute inset-0 bg-black/20' aria-hidden='true' />
            <Image src={profile.cover_url} alt='Cover' fill className='object-contain z-10' priority sizes='100vw' />
          </>
        )}
        {/* Gradient fade at bottom */}
        <div className='absolute bottom-0 left-0 right-0 h-24 bg-linear-to-t from-stride-purple-primary to-transparent z-20' />
        {isOwnProfile && <CoverImageUpload currentUrl={profile.cover_url} />}
      </div>

      <div className='max-w-2xl mx-auto px-4'>

        {/* ── Avatar + actions row ── */}
        <div className='flex items-end justify-between -mt-14 mb-5 relative z-10'>
          <div>
            {isOwnProfile ? (
              <AvatarUpload currentUrl={profile.avatar_url} displayName={displayName} />
            ) : profile.avatar_url ? (
              <AvatarImage
                src={profile.avatar_url}
                alt={displayName}
                className='w-28 h-28 sm:w-32 sm:h-32 rounded-full object-cover border-4 border-stride-purple-primary'
              />
            ) : (
              <div className='w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-stride-yellow-accent/20 border-4 border-stride-purple-primary flex items-center justify-center'>
                <span className='text-stride-yellow-accent text-4xl font-bold'>{displayName.charAt(0).toUpperCase()}</span>
              </div>
            )}
          </div>

          {/* Share + edit */}
          <div className='flex items-center gap-2 pb-1'>
            <ShareButton url={profileUrl} title={`${displayName} — Stride Run Club`} text={profile.bio ?? undefined} />
            {isOwnProfile && (
              <EditProfileSheet
                initial={{
                  name: profile.full_name ?? '',
                  bio: profile.bio ?? '',
                  location: profile.location ?? '',
                  skills: profile.skills,
                  linkedinUrl: profile.linkedin_url ?? '',
                  instagramUrl: profile.instagram_url ?? '',
                  stravaUrl: profile.strava_url ?? '',
                  prompts: profile.prompts,
                }}
                triggerContent={<Pencil size={15} />}
                triggerClassName='w-9 h-9 flex items-center justify-center rounded-full bg-white/8 border border-white/15 text-white/50 hover:text-white hover:border-white/30 transition-colors'
              />
            )}
          </div>
        </div>

        {/* ── Name + role + level ── */}
        <div className='space-y-1.5'>
          <div className='flex items-center gap-2.5 flex-wrap'>
            <h1 className='text-2xl sm:text-3xl font-bold text-white tracking-tight'>{displayName}</h1>
            <RoleBadge role={profile.role} />
          </div>

          <div className='flex items-center gap-3 text-white/40 text-xs flex-wrap'>
            <span>@{profile.username ?? username}</span>
            <span>·</span>
            <span>Joined {joinedYear}</span>
            {profile.location && (
              <>
                <span>·</span>
                <span className='flex items-center gap-1'>
                  <MapPin size={10} />
                  {profile.location}
                </span>
              </>
            )}
          </div>

          {/* Social links */}
          {(profile.linkedin_url || profile.instagram_url) && (
            <div className='flex gap-3 pt-1'>
              {profile.linkedin_url && (
                <a href={profile.linkedin_url} target='_blank' rel='noopener noreferrer'
                  className='text-white/30 hover:text-[#0A66C2] transition-colors' aria-label='LinkedIn'>
                  <Linkedin size={16} />
                </a>
              )}
              {profile.instagram_url && (
                <a href={profile.instagram_url} target='_blank' rel='noopener noreferrer'
                  className='text-white/30 hover:text-[#E1306C] transition-colors' aria-label='Instagram'>
                  <Instagram size={16} />
                </a>
              )}
            </div>
          )}
        </div>

        {/* ── Runner tag (own profile only) ── */}
        {isOwnProfile && profile.runner_tag && (
          <div className='mt-5 flex items-center justify-between bg-stride-yellow-accent/6 border border-stride-yellow-accent/20 rounded-2xl px-5 py-4'>
            <div className='flex flex-col gap-2'>
              <span className='text-white/35 text-[10px] uppercase tracking-widest'>Your runner tag</span>
              <RunnerTagBadge tag={profile.runner_tag} size='lg' />
            </div>
            <p className='text-white/25 text-xs leading-snug text-right max-w-[130px]'>
              Show at event check-in
            </p>
          </div>
        )}

        {/* ── Milestone progress ── */}
        <div className='mt-6 bg-white/5 border border-white/10 rounded-2xl px-5 py-5'>
          <div className='flex items-center justify-between mb-4'>
            <span className='text-white/50 text-xs font-medium uppercase tracking-wider'>Milestone</span>
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${currentTier.color}`}>
              {currentTier.label}
            </span>
          </div>

          {/* 3-tier track */}
          <div className='relative'>
            {/* Connecting line */}
            <div className='absolute top-[11px] left-[11px] right-[11px] h-0.5 bg-white/10' />
            {/* Filled portion */}
            <div
              className='absolute top-[11px] left-[11px] h-0.5 bg-stride-yellow-accent/60 transition-all duration-700'
              style={{ width: `calc(${(tierIndex / 2) * 100}% + ${(tierIndex / 2) * 0}px + ${tierProgress * (100 / 200)}%)` }}
            />

            {/* Tier nodes */}
            <div className='relative flex justify-between'>
              {MILESTONE_TIERS.map((tier, i) => {
                const isActive = currentTier.label === tier.label
                const isPast = tierIndex > i
                return (
                  <div key={tier.label} className='flex flex-col items-center gap-2 w-16'>
                    <div className={`w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center z-10 transition-all ${
                      isPast
                        ? 'bg-stride-yellow-accent border-stride-yellow-accent'
                        : isActive
                        ? 'bg-stride-purple-primary border-stride-yellow-accent shadow-[0_0_10px_rgba(225,208,63,0.4)]'
                        : 'bg-stride-purple-primary border-white/20'
                    }`}>
                      {isPast && (
                        <svg className='w-3 h-3 text-copy-black' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth={3}>
                          <path strokeLinecap='round' strokeLinejoin='round' d='M5 13l4 4L19 7' />
                        </svg>
                      )}
                      {isActive && (
                        <div className='w-2 h-2 rounded-full bg-stride-yellow-accent' />
                      )}
                    </div>
                    <div className='text-center'>
                      <p className={`text-[10px] font-semibold leading-none ${
                        isActive ? 'text-stride-yellow-accent' : isPast ? 'text-white/50' : 'text-white/25'
                      }`}>{tier.label.replace('Stride ', '')}</p>
                      <p className='text-white/20 text-[9px] mt-0.5'>{tier.threshold}+ runs</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Run count + next target */}
          <div className='mt-5 flex items-center justify-between'>
            <div className='flex items-baseline gap-1'>
              <span className='text-2xl font-bold text-white tabular-nums'>{runsCompleted}</span>
              <span className='text-white/30 text-sm'>runs</span>
            </div>
            <p className='text-white/25 text-xs text-right'>
              {currentTier.nextAt
                ? `${currentTier.nextAt - runsCompleted} more to ${MILESTONE_TIERS[tierIndex + 1]?.label ?? ''}`
                : '🏆 Maximum milestone reached'}
            </p>
          </div>

          {/* Progress bar within current tier */}
          <div className='mt-3 h-1 bg-white/8 rounded-full overflow-hidden'>
            <div
              className='h-full bg-stride-yellow-accent rounded-full transition-all duration-700'
              style={{ width: `${tierProgress}%` }}
            />
          </div>
          {currentTier.nextAt && (
            <div className='flex justify-between mt-1'>
              <span className='text-white/15 text-[9px] tabular-nums'>{prevThreshold}</span>
              <span className='text-white/15 text-[9px] tabular-nums'>{currentTier.nextAt}</span>
            </div>
          )}
        </div>

        {/* ── Bio ── */}
        {profile.bio ? (
          <div className='mt-8'>
            <div className='flex items-center gap-2 mb-2'>
              <div className='h-3 w-0.5 bg-stride-yellow-accent/50 rounded-full' />
              <p className='text-white/30 text-[10px] uppercase tracking-widest'>About</p>
            </div>
            <p className='text-white/70 text-sm leading-relaxed'>{profile.bio}</p>
          </div>
        ) : isOwnProfile ? (
          <p className='mt-8 text-white/20 text-sm italic'>Add a bio to tell people about your running journey.</p>
        ) : null}

        {/* ── Specialties ── */}
        {skills.length > 0 && (
          <div className='mt-8'>
            <div className='flex items-center gap-2 mb-3'>
              <div className='h-3 w-0.5 bg-stride-yellow-accent/50 rounded-full' />
              <p className='text-white/30 text-[10px] uppercase tracking-widest'>Specialties</p>
            </div>
            <div className='flex flex-wrap gap-2'>
              {skills.map(skill => (
                <span
                  key={skill}
                  className='inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-white/6 border border-white/12 text-white/60 hover:border-white/25 transition-colors'
                >
                  {SKILL_ICONS[skill] ?? null}
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Prompts ── */}
        {prompts.length > 0 && (
          <div className='mt-10 space-y-3'>
            {prompts.map((p, i) => (
              <div key={i} className='bg-white/5 border border-white/8 rounded-2xl p-5 hover:border-white/15 transition-colors'>
                <p className='text-stride-yellow-accent/80 text-[10px] font-semibold uppercase tracking-widest mb-2'>{p.question}</p>
                <p className='text-white/75 text-sm leading-relaxed'>{p.answer}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Events attended ── */}
        <EventsAttendedSection events={attendedEvents} />

        {/* ── Official races ── */}
        <OfficialRunsSection initialRuns={officialRuns} isOwnProfile={isOwnProfile} />

        {/* ── Sign out ── */}
        {isOwnProfile && (
          <div className='mt-12 pt-6 border-t border-white/8 flex justify-center'>
            <SignOutButton />
          </div>
        )}

      </div>
    </main>
  )
}
