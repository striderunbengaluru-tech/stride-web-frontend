import { StravaIcon } from '@/components/ui/brand-icons'
import { PoweredByStrava } from '@/components/ui/powered-by-strava'
import { StravaActivityCard } from '@/components/profile/strava-activity-card'
import { DisconnectStravaButton } from '@/components/profile/disconnect-strava-button'
import { getStravaProfile } from '@/lib/strava/data'
import { STRAVA_PUBLIC_DISPLAY, STRAVA_RECENT_RUNS } from '@/lib/strava/config'

// The profile's Strava card: a connect prompt for the owner, or year-to-date
// kilometres plus the latest runs once connected. Server component, streamed
// in under <Suspense> like the attended-runs section.

/** Keyed by the `strava_error` values /api/strava/callback redirects with. */
const STRAVA_ERROR_MESSAGES: Record<string, string> = {
  denied: 'Strava connection was cancelled. You can connect any time.',
  invalid_state: 'That Strava sign-in link expired. Please try connecting again.',
  scope: 'Stride needs permission to read your activities. Please connect again and keep "View data about your activities" ticked.',
  capacity: 'Strava spots are full for now — we’re working with Strava to open more. Please try again later.',
  already_linked: 'That Strava account is already connected to another Stride profile.',
  failed: 'Something went wrong connecting Strava. Please try again.',
}

const kmFormatter = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const METRES_PER_KM = 1000

type Props = {
  userId: string
  isOwnProfile: boolean
  /** From the callback redirect's query string. */
  errorCode?: string
}

function SectionHeader() {
  return (
    <div className='mb-4 flex items-center justify-between gap-3'>
      <div className='flex items-center gap-2'>
        <div className='h-4 w-1 rounded-full bg-stride-yellow-accent' aria-hidden='true' />
        <h2 id='strava-heading' className='text-sm font-semibold tracking-wide text-white'>Strava</h2>
      </div>
      <PoweredByStrava />
    </div>
  )
}

function ConnectPrompt() {
  return (
    <div className='flex flex-col gap-4 rounded-xl border border-white/15 bg-white/10 p-5 backdrop-blur-md sm:flex-row sm:items-center'>
      <StravaIcon size={28} className='shrink-0 text-strava-orange' />
      <div className='min-w-0 flex-1'>
        <p className='text-sm font-semibold text-white'>Connect Strava</p>
        {/* Consent copy: says plainly what becomes public before they grant access */}
        <p className='mt-1 text-sm text-white/70'>
          Your running kilometres this year and your last {STRAVA_RECENT_RUNS} public runs (with route maps) will be
          shown on your Stride profile and on the leaderboard. You can disconnect any time, and your Strava data is
          deleted when you do.
        </p>
      </div>
      {/* A GET form, not <Link>: this is a full-page redirect into Strava's OAuth flow. */}
      <form action='/api/strava/connect' method='get' className='shrink-0'>
        <button
          type='submit'
          className='inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-stride-yellow-accent px-5 text-sm font-semibold text-copy-black transition-opacity hover:opacity-90'
        >
          <StravaIcon size={15} />
          Connect with Strava
        </button>
      </form>
    </div>
  )
}

export async function StravaSection({ userId, isOwnProfile, errorCode }: Props) {
  // Strava data is shown to others only when the club has chosen to display it
  // publicly (see STRAVA_PUBLIC_DISPLAY).
  if (!isOwnProfile && !STRAVA_PUBLIC_DISPLAY) return null

  const strava = await getStravaProfile(userId)
  if (!strava.connected && !isOwnProfile) return null

  const errorMessage = isOwnProfile && errorCode ? STRAVA_ERROR_MESSAGES[errorCode] : undefined

  return (
    <section
      id='strava'
      aria-labelledby='strava-heading'
      className='mt-4 scroll-mt-28 animate-fade-in-up rounded-2xl border border-white/10 bg-white/8 p-5 transition-colors hover:border-white/15'
    >
      <SectionHeader />

      {errorMessage && (
        <p role='alert' className='mb-4 rounded-lg border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100'>
          {errorMessage}
        </p>
      )}

      {!strava.connected ? (
        <ConnectPrompt />
      ) : (
        <>
          <div className='mb-4 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3'>
            <p className='flex items-baseline gap-1.5 font-mono tabular-nums'>
              <span className='text-3xl font-bold leading-none text-white'>
                {kmFormatter.format(strava.ytdDistanceM / METRES_PER_KM)}
              </span>
              <span className='text-sm font-medium text-white/60'>km this year</span>
            </p>
            <p className='text-xs text-white/50'>
              {strava.ytdRunCount} {strava.ytdRunCount === 1 ? 'run' : 'runs'} logged on Strava
            </p>
          </div>

          {strava.activities.length > 0 ? (
            <div className='grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3'>
              {strava.activities.map(activity => (
                <StravaActivityCard key={activity.id} activity={activity} />
              ))}
            </div>
          ) : (
            <p className='rounded-xl border border-white/15 bg-white/10 px-4 py-6 text-center text-sm text-white/60 backdrop-blur-md'>
              No public runs yet. Runs shared with &ldquo;Everyone&rdquo; on Strava show up here.
            </p>
          )}

          {isOwnProfile && (
            <div className='mt-4 flex justify-end'>
              <DisconnectStravaButton />
            </div>
          )}
        </>
      )}
    </section>
  )
}
