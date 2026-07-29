import { cache as reactCache, Suspense } from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import type { UserProfile, OfficialRun, Prompt } from '@/types/user'
import { adminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { MILESTONE_TIERS, getMilestone, avatarFrameStyle } from '@/lib/milestones'
import { TierBadge } from '@/components/ui/tier-badge'
import { RunnerTagBadge } from '@/components/ui/runner-tag-badge'
import { SignOutButton } from '@/components/profile/sign-out-button'
import { DeleteAccountButton } from '@/components/profile/delete-account-button'
import { AvatarUpload } from '@/components/profile/avatar-upload'
import { ProfileVisibilityToggle } from '@/components/profile/profile-visibility-toggle'
import { AvatarImage } from '@/components/profile/avatar-image'
import { ShareButton } from '@/components/profile/share-button'
import { EditHeaderSection } from '@/components/profile/edit-header-section'
import { EditBioSection } from '@/components/profile/edit-bio-section'
import { EditSpecialtiesSection } from '@/components/profile/edit-specialties-section'
import { PromptsSection } from '@/components/profile/prompts-section'
import { OfficialRunsSection } from '@/components/profile/official-runs-section'
import { EventsAttendedSection } from '@/components/profile/events-attended-section'
import { ChevronRight, ScanLine } from 'lucide-react'

type Props = { params: Promise<{ username: string }> }

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.strideclub.in'

function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback
  try { return JSON.parse(raw) as T } catch { return fallback }
}

// Checked-in runs — streamed in via <Suspense> so the profile shell doesn't
// block on these two queries. Fetched as two queries joined in JS: a
// PostgREST `events(...)` embed used to fail with PGRST200 before the
// event_id → events FK existed, and the JS join stays FK-independent.
async function AttendedRunsSection({ userId, isOwnProfile }: { userId: string; isOwnProfile: boolean }) {
  const { data: attendedRegs } = await adminClient
    .from('event_registrations')
    .select('event_id')
    .eq('user_id', userId)
    .not('checked_in_at', 'is', null)
    .order('checked_in_at', { ascending: false })

  type AttendedEvent = { id: string; name: string; slug: string; event_date: string | null; location: string | null; banner_images: string | null }
  const attendedIds = [...new Set(
    ((attendedRegs ?? []) as { event_id: string | null }[]).map(r => r.event_id).filter(Boolean)
  )] as string[]

  const { data: attendedEventRows } = attendedIds.length
    ? await adminClient
        .from('events')
        .select('id, name, slug, event_date, location, banner_images')
        .in('id', attendedIds)
    : { data: [] as AttendedEvent[] }

  // Re-order to match the registrations (latest check-in first) — `.in()`
  // returns rows in arbitrary order.
  const attendedById = new Map(((attendedEventRows ?? []) as AttendedEvent[]).map(e => [e.id, e]))
  const attendedEvents = attendedIds
    .map(id => attendedById.get(id))
    .filter(Boolean) as AttendedEvent[]

  return (
    <EventsAttendedSection
      events={attendedEvents.slice(0, 10)}
      totalCount={attendedEvents.length}
      asList={attendedEvents.length > 10}
      isOwnProfile={isOwnProfile}
    />
  )
}

// Per-request dedupe: generateMetadata and the page body share this one fetch
// instead of querying the same row twice.
const getProfileRow = reactCache(async (username: string) => {
  const { data } = await adminClient
    .from('users')
    .select('id, username, full_name, bio, role, avatar_url, profile_public, created_at, location, skills, linkedin_url, instagram_url, strava_url, x_url, prompts, official_runs, runs_completed, runner_tag')
    .eq('username', username)
    .single()
  return data
})

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  const row = await getProfileRow(username)

  if (!row) return { title: 'Profile not found - Stride Run Club' }

  // Private profile: reveal nothing to link-preview scrapers and anonymous
  // viewers — identical to a missing profile so its existence doesn't leak.
  if (!row.profile_public) return { title: 'Profile not found - Stride Run Club' }

  const displayName = row.full_name ?? username
  // Title: "<Athlete name> - Stride Run Club"
  const title = `${displayName} - Stride Run Club`
  // Description: the athlete's bio, or a generic fallback when none is set.
  const description = (row.bio?.trim().slice(0, 160))
    || `${displayName} is an athlete with Stride Run Club, Bengaluru's community for athletes. See their milestones, races and running story.`
  const ogImage = row.avatar_url ?? undefined

  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/profile/${username}` },
    openGraph: {
      title, description, type: 'profile',
      url: `${SITE_URL}/profile/${username}`,
      siteName: 'Stride Run Club',
      ...(ogImage ? { images: [{ url: ogImage, width: 400, height: 400, alt: displayName }] } : {}),
    },
    twitter: {
      card: ogImage ? 'summary_large_image' : 'summary',
      title,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  }
}

export default async function ProfilePage({ params }: Props) {
  const { username } = await params

  const row = await getProfileRow(username)

  if (!row) notFound()

  const skills       = parseJson<string[]>     (row.skills, [])
  const prompts      = parseJson<Prompt[]>     ((row as Record<string, string | null>).prompts, [])

  const profile: UserProfile = {
    ...(row as unknown as UserProfile),
    skills,
    prompts,
    cover_url: null,
    x_url: row.x_url ?? null,
    runner_tag: row.runner_tag ?? null,
    strava_connected: false,
    strava_pbs: { mile: null, '5k': null, '10k': null, half: null, full: null },
    strava_recent_activities: [],
    strava_synced_at: null,
  }

  const officialRuns = parseJson<OfficialRun[]>((row as Record<string, string | null>).official_runs, [])

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isOwnProfile = user?.id === profile.id

  // Shareability gate (DPDP consent): a private profile is reachable only by
  // its owner and club admins — everyone else gets a 404, direct URL included,
  // indistinguishable from a profile that doesn't exist.
  if (!profile.profile_public && !isOwnProfile) {
    let viewerIsAdmin = false
    if (user) {
      const { data: viewer } = await adminClient
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()
      viewerIsAdmin = viewer?.role === 'ADMIN'
    }
    if (!viewerIsAdmin) notFound()
  }

  const publicAvatarUrl = profile.avatar_url

  const displayName   = profile.full_name ?? profile.username ?? username
  const joinedLabel   = new Date(profile.created_at).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
  const runsCompleted = profile.runs_completed ?? 0
  const currentTier   = getMilestone(runsCompleted)
  const profileUrl    = `${SITE_URL}/profile/${username}`

  const tierIndex     = MILESTONE_TIERS.findIndex(t => t.key === currentTier.key)
  const nextThreshold = currentTier.nextAt
  const tierProgress  = nextThreshold
    ? Math.min(((runsCompleted - currentTier.threshold) / (nextThreshold - currentTier.threshold)) * 100, 100)
    : 100

  return (
    <main className='min-h-screen bg-stride-purple-primary pb-24'>
      <div className='max-w-6xl mx-auto px-4 pt-24 sm:pt-28'>

        {/* ── Top: identity + details ── */}
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-4'>

          {/* Identity card */}
          <div className='lg:col-span-1 animate-fade-in-up' style={{ animationDelay: '0s' }}>
            <div className='relative h-full bg-white/8 border border-white/10 rounded-2xl px-5 py-6 hover:border-white/15 transition-colors flex flex-col items-center text-center'>
              {/* Share — top right; hidden while the profile isn't shareable
                  (the link would 404 for everyone else) */}
              {profile.profile_public && (
                <div className='absolute top-4 right-4'>
                  <ShareButton url={profileUrl} title={`${displayName} — Stride Run Club`} text={profile.bio ?? undefined} />
                </div>
              )}

              {/* Avatar (tier-coloured frame) */}
              <div className='mt-2'>
                {isOwnProfile ? (
                  <>
                    <AvatarUpload currentUrl={profile.avatar_url} displayName={displayName} frameColor={currentTier.frame} frameRingColor={currentTier.frameRing} />
                    <ProfileVisibilityToggle initialPublic={profile.profile_public} />
                  </>
                ) : publicAvatarUrl ? (
                  <AvatarImage
                    src={publicAvatarUrl}
                    alt={displayName}
                    frameColor={currentTier.frame}
                    frameRingColor={currentTier.frameRing}
                    className='w-36 h-36 sm:w-44 sm:h-44 rounded-lg object-cover border-4'
                  />
                ) : (
                  <div
                    className='w-36 h-36 sm:w-44 sm:h-44 rounded-lg bg-stride-yellow-accent/20 border-4 flex items-center justify-center'
                    style={avatarFrameStyle(currentTier.frame, currentTier.frameRing)}
                  >
                    <span className='text-stride-yellow-accent text-5xl font-bold'>{displayName.charAt(0).toUpperCase()}</span>
                  </div>
                )}
              </div>

              {/* Public milestone badge */}
              <div className={`mt-4 inline-flex items-center gap-2 text-sm font-semibold pl-2 pr-4 py-1.5 rounded-full border ${currentTier.chip}`}>
                <TierBadge tier={currentTier} size='xl' />
                {currentTier.label}
              </div>

              {/* Name / joined / socials */}
              <div className='mt-3 w-full'>
                <EditHeaderSection
                  initialName={displayName}
                  initialLocation={profile.location ?? ''}
                  initialLinkedin={profile.linkedin_url ?? ''}
                  initialInstagram={profile.instagram_url ?? ''}
                  initialX={profile.x_url ?? ''}
                  initialStrava={profile.strava_url ?? ''}
                  username={profile.username ?? username}
                  role={profile.role}
                  joinedLabel={joinedLabel}
                  isOwnProfile={isOwnProfile}
                />
              </div>

              {/* Stride Tag — own profile only (stored as runner_tag in DB) */}
              {isOwnProfile && profile.runner_tag && (
                <div className='mt-5 w-full bg-stride-yellow-accent/6 border border-stride-yellow-accent/20 rounded-xl px-4 py-3.5 text-left'>
                  <div className='flex items-center gap-2 mb-2'>
                    <ScanLine size={13} className='text-stride-yellow-accent' />
                    <span className='text-stride-yellow-accent text-[10px] font-bold font-mono uppercase tracking-widest'>Your Stride Tag</span>
                  </div>
                  <RunnerTagBadge tag={profile.runner_tag} size='lg' />
                  <p className='text-white/35 text-[11px] leading-snug mt-2.5'>
                    Check in to club experiences using this code, reach milestones and earn rewards.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Details card */}
          <div className='lg:col-span-2 flex flex-col gap-4'>
            {/* Milestone progress — owner only; public viewers see just the badge + frame */}
            {isOwnProfile && (
            <div
              className='bg-white/8 border border-white/10 rounded-2xl p-5 hover:border-white/15 transition-colors animate-fade-in-up'
              style={{ animationDelay: '0.06s' }}
            >
              <div className='flex items-center justify-between mb-5'>
                <p className='text-white/40 text-[10px] font-mono uppercase tracking-widest font-medium'>Milestone</p>
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
                    <span className='text-5xl font-bold text-white tabular-nums leading-none font-mono'>{runsCompleted}</span>
                    <span className='text-white/35 text-sm'>official runs</span>
                  </div>
                  {/* Nothing shown on the top tier — there's no next one to chase */}
                  {currentTier.nextAt && (
                    <p className='text-white/30 text-xs mt-2'>
                      {currentTier.nextAt - runsCompleted} more to {MILESTONE_TIERS[tierIndex + 1]?.label ?? ''}
                    </p>
                  )}
                </div>
                {/* No tier pill here — the badge under the avatar already says it */}
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
                    <span className='text-white/20 text-[9px] tabular-nums font-mono'>{currentTier.threshold} runs</span>
                    <span className='text-white/20 text-[9px] tabular-nums font-mono'>{currentTier.nextAt} runs</span>
                  </div>
                )}
              </div>

              {/* Tier chips — 5 tiers */}
              <div className='grid grid-cols-5 gap-1.5'>
                {MILESTONE_TIERS.map((tier, i) => {
                  const isActive = currentTier.key === tier.key
                  const isPast   = tierIndex > i
                  return (
                    <div
                      key={tier.key}
                      className={`flex flex-col items-center gap-1.5 py-2.5 px-1 rounded-xl border transition-all ${
                        isActive ? 'bg-stride-yellow-accent/8 border-stride-yellow-accent/30'
                          : isPast ? 'bg-white/5 border-white/10'
                          : 'bg-white/3 border-white/6'
                      }`}
                    >
                      <TierBadge tier={tier} size='lg' locked={!isActive && !isPast} />
                      <p className={`text-[9px] font-semibold leading-none text-center ${
                        isActive ? 'text-stride-yellow-accent' : isPast ? 'text-white/45' : 'text-white/20'
                      }`}>{tier.label}</p>
                    </div>
                  )
                })}
              </div>
            </div>
            )}

            {/* About + Specialties — always shown (empty state for public viewers) */}
            <div className='animate-fade-in-up' style={{ animationDelay: '0.12s' }}>
              <EditBioSection bio={profile.bio} isOwnProfile={isOwnProfile} />
            </div>
            <div className='animate-fade-in-up' style={{ animationDelay: '0.16s' }}>
              <EditSpecialtiesSection skills={skills} isOwnProfile={isOwnProfile} />
            </div>
          </div>
        </div>

        {/* ── Prompts ── always shown (empty state for public viewers) */}
        <div className='mt-4 animate-fade-in-up' style={{ animationDelay: '0.2s' }}>
          <div className='bg-white/8 border border-white/10 rounded-2xl p-5 hover:border-white/15 transition-colors'>
            <PromptsSection initialPrompts={prompts} isOwnProfile={isOwnProfile} />
          </div>
        </div>

        {/* ── Runs attended with Stride ── past 10; list when >10, mini cards otherwise */}
        <div className='mt-4 animate-fade-in-up' style={{ animationDelay: '0.24s' }}>
          <div className='bg-white/8 border border-white/10 rounded-2xl p-5 hover:border-white/15 transition-colors'>
            <Suspense fallback={<div className='h-40 rounded-xl bg-white/5 animate-pulse' aria-hidden='true' />}>
              <AttendedRunsSection userId={row.id} isOwnProfile={isOwnProfile} />
            </Suspense>
          </div>
        </div>

        {/* ── Official races ── always shown (empty state for public viewers) */}
        <div className='mt-4 animate-fade-in-up' style={{ animationDelay: '0.28s' }}>
          <div className='bg-white/8 border border-white/10 rounded-2xl p-5 hover:border-white/15 transition-colors'>
            <OfficialRunsSection initialRuns={officialRuns} isOwnProfile={isOwnProfile} />
          </div>
        </div>

        {/* ── Account settings ── */}
        {isOwnProfile && (
          <div className='mt-8 animate-fade-in-up' style={{ animationDelay: '0.32s' }}>
            <div className='bg-white/8 border border-white/10 rounded-2xl p-5 hover:border-white/15 transition-colors'>
              <div className='flex items-center gap-2 mb-1'>
                <div className='h-4 w-1 bg-stride-yellow-accent rounded-full' aria-hidden='true' />
                <h2 className='text-white font-semibold text-sm tracking-wide'>Account settings</h2>
              </div>
              <p className='text-white/40 text-xs mb-4 pl-3'>Manage your session, or permanently remove your account and data.</p>
              <div className='flex flex-col sm:flex-row gap-2.5'>
                <SignOutButton />
                <DeleteAccountButton />
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
