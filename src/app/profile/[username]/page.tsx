import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import type { UserProfile, Prompt, GalleryImage } from '@/types/user'
import type { OfficialRun } from '@/types/strava'
import { adminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { RunnerTagBadge } from '@/components/ui/runner-tag-badge'
import { SignOutButton } from '@/components/profile/sign-out-button'
import { AvatarUpload } from '@/components/profile/avatar-upload'
import { AvatarImage } from '@/components/profile/avatar-image'
import { ShareButton } from '@/components/profile/share-button'
import { EditHeaderSection } from '@/components/profile/edit-header-section'
import { EditBioSection } from '@/components/profile/edit-bio-section'
import { EditSpecialtiesSection } from '@/components/profile/edit-specialties-section'
import { EditPromptsSection } from '@/components/profile/edit-prompts-section'
import { GallerySection } from '@/components/profile/gallery-section'
import { OfficialRunsSection } from '@/components/profile/official-runs-section'
import { EventsAttendedSection } from '@/components/profile/events-attended-section'
import { ChevronRight } from 'lucide-react'

type Props = { params: Promise<{ username: string }> }

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://strideclub.in'

type MilestoneTier = { label: string; threshold: number; nextAt: number | null; color: string; dot: string }
const MILESTONE_TIERS: MilestoneTier[] = [
  { label: 'Newbie',    threshold: 0,  nextAt: 6,    color: 'text-emerald-400 border-emerald-400/40 bg-emerald-400/8',   dot: 'bg-emerald-400' },
  { label: 'Regular',   threshold: 6,  nextAt: 16,   color: 'text-sky-400 border-sky-400/40 bg-sky-400/8',               dot: 'bg-sky-400' },
  { label: 'OG Member', threshold: 16, nextAt: null, color: 'text-stride-yellow-accent border-stride-yellow-accent/40 bg-stride-yellow-accent/8', dot: 'bg-stride-yellow-accent' },
]

function getMilestone(runs: number) {
  if (runs >= 16) return MILESTONE_TIERS[2]!
  if (runs >= 6)  return MILESTONE_TIERS[1]!
  return MILESTONE_TIERS[0]!
}

function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback
  try { return JSON.parse(raw) as T } catch { return fallback }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  const { data: row } = await adminClient
    .from('users')
    .select('full_name, bio, avatar_url')
    .eq('username', username)
    .single()

  if (!row) return { title: 'Profile not found — Stride Run Club' }

  const displayName = row.full_name ?? username
  const title = `${displayName} — Stride Run Club`
  const description = (row.bio ?? '').slice(0, 160) || `${displayName} is a member of Stride Run Club Bengaluru.`
  const ogImage = row.avatar_url ?? undefined

  return {
    title, description,
    openGraph: {
      title, description, type: 'profile',
      url: `${SITE_URL}/profile/${username}`,
      ...(ogImage ? { images: [{ url: ogImage, width: 400, height: 400, alt: displayName }] } : {}),
    },
  }
}

export default async function ProfilePage({ params }: Props) {
  const { username } = await params

  const { data: row } = await adminClient
    .from('users')
    .select('id, username, full_name, bio, role, avatar_url, created_at, location, skills, linkedin_url, instagram_url, strava_url, prompts, gallery_images, runs_completed, runner_tag')
    .eq('username', username)
    .single()

  if (!row) notFound()

  const skills        = parseJson<string[]>    (row.skills,  [])
  const prompts       = parseJson<Prompt[]>    (row.prompts, [])
  const galleryImages = parseJson<GalleryImage[]>((row as Record<string, string | null>).gallery_images, [])

  const profile: UserProfile = {
    ...(row as unknown as UserProfile),
    skills, prompts, gallery_images: galleryImages,
    cover_url: null,
    runner_tag: row.runner_tag ?? null,
    strava_connected: false,
    strava_pbs: { mile: null, '5k': null, '10k': null, half: null, full: null },
    strava_recent_activities: [],
    strava_synced_at: null,
  }

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

  const displayName   = profile.full_name ?? profile.username ?? username
  const joinedYear    = new Date(profile.created_at).getFullYear()
  const runsCompleted = profile.runs_completed ?? 0
  const currentTier   = getMilestone(runsCompleted)
  const profileUrl    = `${SITE_URL}/profile/${username}`

  const tierIndex      = MILESTONE_TIERS.findIndex(t => t.label === currentTier.label)
  const prevThreshold  = MILESTONE_TIERS[tierIndex - 1]?.nextAt ?? 0
  const nextThreshold  = currentTier.nextAt
  const tierProgress   = nextThreshold
    ? Math.min(((runsCompleted - prevThreshold) / (nextThreshold - prevThreshold)) * 100, 100)
    : 100

  return (
    <main className='min-h-screen bg-stride-purple-primary pb-24'>
      <div className='max-w-3xl mx-auto px-3 sm:px-4 pt-24 sm:pt-28'>
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-3'>

          {/* ── Header card ── full width */}
          <div className='lg:col-span-2 animate-fade-in-up' style={{ animationDelay: '0s' }}>
            <div className='relative bg-white/8 border border-white/10 rounded-2xl px-5 py-5 hover:border-white/15 transition-colors'>
              {/* Share button — top right */}
              <div className='absolute top-4 right-4'>
                <ShareButton url={profileUrl} title={`${displayName} — Stride Run Club`} text={profile.bio ?? undefined} />
              </div>

              {/* Avatar + Info */}
              <div className='flex items-start gap-4 pr-12'>
                <div className='shrink-0'>
                  {isOwnProfile ? (
                    <AvatarUpload currentUrl={profile.avatar_url} displayName={displayName} />
                  ) : profile.avatar_url ? (
                    <AvatarImage
                      src={profile.avatar_url}
                      alt={displayName}
                      className='w-28 h-28 sm:w-32 sm:h-32 rounded-xl object-cover border-4 border-stride-purple-primary'
                    />
                  ) : (
                    <div className='w-28 h-28 sm:w-32 sm:h-32 rounded-xl bg-stride-yellow-accent/20 border-4 border-stride-purple-primary flex items-center justify-center'>
                      <span className='text-stride-yellow-accent text-4xl font-bold'>{displayName.charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                </div>

                <div className='flex-1 min-w-0 pt-1'>
                  <EditHeaderSection
                    initialName={displayName}
                    initialLocation={profile.location ?? ''}
                    initialLinkedin={profile.linkedin_url ?? ''}
                    initialInstagram={profile.instagram_url ?? ''}
                    initialStrava={profile.strava_url ?? ''}
                    username={profile.username ?? username}
                    role={profile.role}
                    joinedYear={joinedYear}
                    isOwnProfile={isOwnProfile}
                  />
                </div>
              </div>

              {/* Runner tag */}
              {isOwnProfile && profile.runner_tag && (
                <div className='mt-4 flex items-center justify-between bg-stride-yellow-accent/6 border border-stride-yellow-accent/20 rounded-xl px-4 py-3'>
                  <div className='flex flex-col gap-1.5'>
                    <span className='text-white/30 text-[9px] uppercase tracking-widest'>Your runner tag</span>
                    <RunnerTagBadge tag={profile.runner_tag} size='lg' />
                  </div>
                  <p className='text-white/20 text-xs text-right max-w-[120px] leading-snug'>
                    Show at event check-in
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ── Milestone card ── full width */}
          <div
            className='lg:col-span-2 bg-white/8 border border-white/10 rounded-2xl p-5 hover:border-white/15 transition-colors animate-fade-in-up'
            style={{ animationDelay: '0.08s' }}
          >
            <div className='flex items-center justify-between mb-5'>
              <p className='text-white/40 text-[10px] uppercase tracking-widest font-medium'>Milestone</p>
              <Link
                href='/milestones'
                className='flex items-center gap-1 text-stride-yellow-accent/60 hover:text-stride-yellow-accent text-xs transition-colors'
              >
                Explore milestones <ChevronRight size={12} />
              </Link>
            </div>

            <div className='flex items-end justify-between mb-5'>
              <div>
                <div className='flex items-baseline gap-2'>
                  <span className='text-5xl font-bold text-white tabular-nums leading-none'>{runsCompleted}</span>
                  <span className='text-white/35 text-sm'>official runs</span>
                </div>
                <p className='text-white/30 text-xs mt-2'>
                  {currentTier.nextAt
                    ? `${currentTier.nextAt - runsCompleted} more to ${MILESTONE_TIERS[tierIndex + 1]?.label ?? ''}`
                    : '🏆 Maximum tier reached'}
                </p>
              </div>
              <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${currentTier.color}`}>
                {currentTier.label}
              </span>
            </div>

            {/* Progress bar */}
            <div className='mb-5 space-y-1.5'>
              <div className='h-1.5 bg-white/8 rounded-full overflow-hidden'>
                <div
                  className='h-full bg-stride-yellow-accent rounded-full transition-all duration-700'
                  style={{ width: `${tierProgress}%` }}
                />
              </div>
              {currentTier.nextAt && (
                <div className='flex justify-between'>
                  <span className='text-white/20 text-[9px] tabular-nums'>{prevThreshold} runs</span>
                  <span className='text-white/20 text-[9px] tabular-nums'>{currentTier.nextAt} runs</span>
                </div>
              )}
            </div>

            {/* Tier chips */}
            <div className='grid grid-cols-3 gap-2'>
              {MILESTONE_TIERS.map((tier, i) => {
                const isActive = currentTier.label === tier.label
                const isPast   = tierIndex > i
                return (
                  <div
                    key={tier.label}
                    className={`flex flex-col items-center gap-2 py-3 px-2 rounded-xl border transition-all ${
                      isActive ? 'bg-stride-yellow-accent/8 border-stride-yellow-accent/30'
                        : isPast ? 'bg-white/5 border-white/10'
                        : 'bg-white/3 border-white/6'
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full ${isActive ? tier.dot : isPast ? 'bg-white/30' : 'bg-white/12'}`} />
                    <div className='text-center'>
                      <p className={`text-[10px] font-semibold leading-none ${
                        isActive ? 'text-stride-yellow-accent' : isPast ? 'text-white/45' : 'text-white/20'
                      }`}>{tier.label}</p>
                      <p className='text-white/15 text-[9px] mt-0.5'>{tier.threshold}+ runs</p>
                    </div>
                    {isPast && (
                      <svg className='w-3 h-3 text-white/30' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth={2.5}>
                        <path strokeLinecap='round' strokeLinejoin='round' d='M5 13l4 4L19 7' />
                      </svg>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── Bio + Specialties ── two cols on desktop */}
          {(!!profile.bio || isOwnProfile) && (
            <div className='animate-fade-in-up' style={{ animationDelay: '0.14s' }}>
              <EditBioSection bio={profile.bio} isOwnProfile={isOwnProfile} />
            </div>
          )}

          {(skills.length > 0 || isOwnProfile) && (
            <div
              className={`animate-fade-in-up ${!profile.bio && !isOwnProfile ? 'lg:col-span-2' : ''}`}
              style={{ animationDelay: '0.18s' }}
            >
              <EditSpecialtiesSection skills={skills} isOwnProfile={isOwnProfile} />
            </div>
          )}

          {/* ── Gallery ── full width */}
          {(galleryImages.length > 0 || isOwnProfile) && (
            <div className='lg:col-span-2 animate-fade-in-up' style={{ animationDelay: '0.22s' }}>
              <GallerySection images={galleryImages} isOwnProfile={isOwnProfile} />
            </div>
          )}

          {/* ── Prompts ── full width */}
          {(prompts.length > 0 || isOwnProfile) && (
            <div className='lg:col-span-2 animate-fade-in-up' style={{ animationDelay: '0.26s' }}>
              <EditPromptsSection prompts={prompts} isOwnProfile={isOwnProfile} />
            </div>
          )}

          {/* ── Events attended ── full width */}
          {attendedEvents.length > 0 && (
            <div className='lg:col-span-2 animate-fade-in-up' style={{ animationDelay: '0.3s' }}>
              <div className='bg-white/8 border border-white/10 rounded-2xl p-5 hover:border-white/15 transition-colors'>
                <EventsAttendedSection events={attendedEvents} />
              </div>
            </div>
          )}

          {/* ── Official races ── full width */}
          {(officialRuns.length > 0 || isOwnProfile) && (
            <div className='lg:col-span-2 animate-fade-in-up' style={{ animationDelay: '0.34s' }}>
              <div className='bg-white/8 border border-white/10 rounded-2xl p-5 hover:border-white/15 transition-colors'>
                <OfficialRunsSection initialRuns={officialRuns} isOwnProfile={isOwnProfile} />
              </div>
            </div>
          )}

        </div>

        {/* ── Sign out ── */}
        {isOwnProfile && (
          <div className='mt-8 pt-6 border-t border-white/8 flex justify-center'>
            <SignOutButton />
          </div>
        )}
      </div>
    </main>
  )
}
