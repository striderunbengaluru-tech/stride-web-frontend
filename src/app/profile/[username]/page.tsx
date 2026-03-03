import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import type { UserProfile, Prompt } from '@/types/user'
import { auth } from '@/lib/auth'
import { RoleBadge } from '@/utils/profile'
import { db } from '@/lib/db'
import { user as userTable } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { SignOutButton } from '@/components/profile/sign-out-button'
import { CoverImageUpload } from '@/components/profile/cover-image-upload'
import { AvatarUpload } from '@/components/profile/avatar-upload'
import { AvatarImage } from '@/components/profile/avatar-image'
import { EditProfileSheet } from '@/components/profile/edit-profile-sheet'
import { ShareButton } from '@/components/profile/share-button'
import {
  Linkedin, Instagram, Activity,
  Flag, Mountain, Trees, Zap, Heart, Sunrise, Moon, Clock, Star, Footprints,
  ChevronRight,
} from 'lucide-react'

type Props = { params: Promise<{ username: string }> }

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://striderunclub.in'

const SKILL_ICONS: Record<string, React.ReactNode> = {
  '5K':            <Footprints size={11} aria-hidden='true' />,
  '10K':           <Footprints size={11} aria-hidden='true' />,
  'Half Marathon': <Flag size={11} aria-hidden='true' />,
  'Marathon':      <Flag size={11} aria-hidden='true' />,
  'Ultra':         <Mountain size={11} aria-hidden='true' />,
  'Trail Running': <Trees size={11} aria-hidden='true' />,
  'Speed Work':    <Zap size={11} aria-hidden='true' />,
  'Recovery Runs': <Heart size={11} aria-hidden='true' />,
  'Morning Runner':<Sunrise size={11} aria-hidden='true' />,
  'Night Owl':     <Moon size={11} aria-hidden='true' />,
  'Pacer':         <Clock size={11} aria-hidden='true' />,
  'New Runner':    <Star size={11} aria-hidden='true' />,
}

function getMemberLevel(runs: number): { label: string; classes: string } {
  if (runs >= 16) return {
    label: 'Stride OG Member',
    classes: 'text-stride-yellow-accent border-stride-yellow-accent/50 bg-stride-yellow-accent/10',
  }
  if (runs >= 6) return {
    label: 'Stride Regular',
    classes: 'text-blue-400 border-blue-400/50 bg-blue-400/10',
  }
  return {
    label: 'Stride Newbie',
    classes: 'text-green-400 border-green-400/50 bg-green-400/10',
  }
}

function parseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback
  try { return JSON.parse(raw) as T } catch { return fallback }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  const [row] = await db
    .select({ name: userTable.name, bio: userTable.bio, image: userTable.image, coverUrl: userTable.coverUrl })
    .from(userTable)
    .where(eq(userTable.username, username))
    .limit(1)

  if (!row) return { title: 'Profile not found — Stride Run Club' }

  const displayName = row.name ?? username
  const title = `${displayName} — Stride Run Club`
  const description =
    (row.bio ?? '').slice(0, 160) ||
    `${displayName} is a member of Stride Run Club Bengaluru.`
  const ogImage = row.coverUrl ?? row.image ?? undefined

  return {
    title,
    description,
    openGraph: {
      title, description,
      url: `${SITE_URL}/profile/${username}`,
      type: 'profile',
      ...(ogImage ? { images: [{ url: ogImage, width: 800, height: 400, alt: displayName }] } : {}),
    },
    twitter: {
      card: ogImage ? 'summary_large_image' : 'summary',
      title, description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  }
}

export default async function ProfilePage({ params }: Props) {
  const { username } = await params

  const [row] = await db
    .select({
      id: userTable.id,
      username: userTable.username,
      full_name: userTable.name,
      bio: userTable.bio,
      role: userTable.role,
      avatar_url: userTable.image,
      created_at: userTable.createdAt,
      cover_url: userTable.coverUrl,
      location: userTable.location,
      skills: userTable.skills,
      linkedin_url: userTable.linkedinUrl,
      instagram_url: userTable.instagramUrl,
      strava_url: userTable.stravaUrl,
      prompts: userTable.prompts,
      runs_completed: userTable.runsCompleted,
    })
    .from(userTable)
    .where(eq(userTable.username, username))
    .limit(1)

  if (!row) notFound()

  const skills = parseJson<string[]>(row.skills, [])
  const prompts = parseJson<Prompt[]>(row.prompts, [])
  const profile: UserProfile = { ...(row as unknown as UserProfile), skills, prompts }

  // Profiles are public — session only controls edit visibility
  const session = await auth.api.getSession({ headers: await headers() })
  const isOwnProfile = session?.user?.id === profile.id

  const displayName = profile.full_name ?? profile.username ?? username
  const joinedYear = new Date(profile.created_at).getFullYear()
  const runsCompleted = profile.runs_completed ?? 0
  const memberLevel = getMemberLevel(runsCompleted)
  const profileUrl = `${SITE_URL}/profile/${username}`

  return (
    <main className='min-h-screen bg-stride-purple-primary pb-16'>

      {/* Cover image */}
      <div className='relative w-full h-52 sm:h-72 mt-16 overflow-hidden bg-gradient-to-br from-stride-purple-primary to-stride-yellow-accent/20'>
        {profile.cover_url && (
          <>
            {/* Blurred fill for letterbox areas */}
            <div
              className='absolute inset-0 scale-110'
              style={{
                backgroundImage: `url(${profile.cover_url})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'blur(28px)',
              }}
              aria-hidden='true'
            />
            <div className='absolute inset-0 bg-black/25' aria-hidden='true' />
            {/* object-contain so nothing is ever cropped */}
            <Image
              src={profile.cover_url}
              alt='Cover'
              fill
              className='object-contain z-10'
              priority
              sizes='100vw'
            />
          </>
        )}
        {isOwnProfile && <CoverImageUpload currentUrl={profile.cover_url} />}
      </div>

      <div className='max-w-2xl mx-auto px-4'>

        {/* Avatar + action buttons */}
        <div className='flex items-end justify-between -mt-16 mb-4'>
          <div className='relative z-10'>
            {isOwnProfile ? (
              <AvatarUpload currentUrl={profile.avatar_url} displayName={displayName} />
            ) : profile.avatar_url ? (
              <AvatarImage
                src={profile.avatar_url}
                alt={displayName}
                className='w-32 h-32 rounded-full object-cover border-4 border-stride-purple-primary'
              />
            ) : (
              <div className='w-32 h-32 rounded-full bg-stride-yellow-accent/20 border-4 border-stride-purple-primary border-stride-yellow-accent/40 flex items-center justify-center'>
                <span className='text-stride-yellow-accent text-4xl font-bold'>
                  {displayName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>

          <div className='flex items-center gap-2 pb-1'>
            <ShareButton
              url={profileUrl}
              title={`${displayName} — Stride Run Club`}
              text={profile.bio ?? undefined}
            />
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
              />
            )}
          </div>
        </div>

        {/* Name + role badge + member level */}
        <div className='flex flex-wrap items-center gap-2 mb-1'>
          <h1 className='text-2xl font-bold text-white'>{displayName}</h1>
          <RoleBadge role={profile.role} />
          {memberLevel && (
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${memberLevel.classes}`}>
              {memberLevel.label}
            </span>
          )}
        </div>

        {/* Handle + join date + location */}
        <p className='text-white/50 text-sm'>@{profile.username ?? username}</p>
        <div className='flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-white/40 text-xs'>
          <span>Member since {joinedYear}</span>
          {profile.location && <span>📍 {profile.location}</span>}
        </div>

        {/* Social icons */}
        {(profile.linkedin_url || profile.instagram_url || profile.strava_url) && (
          <div className='flex gap-4 mt-3'>
            {profile.linkedin_url && (
              <a href={profile.linkedin_url} target='_blank' rel='noopener noreferrer'
                className='text-white/40 hover:text-stride-yellow-accent transition-colors' aria-label='LinkedIn'>
                <Linkedin size={18} />
              </a>
            )}
            {profile.instagram_url && (
              <a href={profile.instagram_url} target='_blank' rel='noopener noreferrer'
                className='text-white/40 hover:text-stride-yellow-accent transition-colors' aria-label='Instagram'>
                <Instagram size={18} />
              </a>
            )}
            {profile.strava_url && (
              <a href={profile.strava_url} target='_blank' rel='noopener noreferrer'
                className='text-white/40 hover:text-stride-yellow-accent transition-colors' aria-label='Strava'>
                <Activity size={18} />
              </a>
            )}
          </div>
        )}

        {/* Milestone progress card — links to /milestones */}
        <Link href='/milestones'>
          <div className='mt-5 bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 hover:border-stride-yellow-accent/30 hover:bg-white/[0.07] transition-colors cursor-pointer'>
            {/* Header row */}
            <div className='flex items-center justify-between mb-2.5'>
              <div className='flex items-center gap-2'>
                <span className='text-white/50 text-xs font-medium uppercase tracking-wider'>Milestone Progress</span>
                {/* Level badge — always visible */}
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${memberLevel.classes}`}>
                  {memberLevel.label}
                </span>
              </div>
              <div className='flex items-center gap-1 text-white/30'>
                <span className='text-white/70 text-sm font-semibold tabular-nums'>
                  {runsCompleted}<span className='text-white/30 font-normal text-xs'>/10</span>
                </span>
                <ChevronRight size={14} />
              </div>
            </div>

            {/* Bar */}
            <div className='w-full bg-white/10 rounded-full h-2.5 overflow-hidden'>
              <div
                className='bg-stride-yellow-accent h-2.5 rounded-full transition-all duration-500'
                style={{ width: `${Math.min((runsCompleted / 10) * 100, 100)}%` }}
              />
            </div>

            {/* Next milestone hint */}
            <p className='text-white/25 text-xs mt-2'>
              {memberLevel.label === 'Stride Newbie' && 'Stride Regular badge unlocks at 6 runs'}
              {memberLevel.label === 'Stride Regular' && 'Stride OG Member badge unlocks at 16 runs'}
              {memberLevel.label === 'Stride OG Member' && "You've reached the highest milestone 🏆"}
            </p>
          </div>
        </Link>

        {/* Bio */}
        {profile.bio ? (
          <p className='mt-5 text-white/70 text-sm leading-relaxed italic line-clamp-4'>{profile.bio}</p>
        ) : isOwnProfile ? (
          <p className='mt-5 text-white/30 text-sm italic'>No bio yet — edit your profile to add one.</p>
        ) : null}

        {/* Skills with icons */}
        {profile.skills.length > 0 ? (
          <div className='mt-6'>
            <p className='text-white/40 text-xs uppercase tracking-widest mb-3'>Specialties</p>
            <div className='flex flex-wrap gap-2'>
              {profile.skills.map((skill) => (
                <span
                  key={skill}
                  className='inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-stride-yellow-accent/15 border border-stride-yellow-accent/30 text-stride-yellow-accent'
                >
                  {SKILL_ICONS[skill] ?? null}
                  {skill}
                </span>
              ))}
            </div>
          </div>
        ) : isOwnProfile ? (
          <div className='mt-6'>
            <p className='text-white/30 text-xs italic'>No skills added yet — edit your profile to showcase your running specialties.</p>
          </div>
        ) : null}

        {/* Prompts */}
        {profile.prompts.length > 0 ? (
          <div className='mt-8 space-y-4'>
            {profile.prompts.map((p, i) => (
              <div key={i} className='bg-white/10 backdrop-blur-md border border-white/15 rounded-xl p-5 hover:border-stride-yellow-accent/30 transition-colors'>
                <p className='text-stride-yellow-accent text-xs font-semibold uppercase tracking-wider mb-2'>{p.question}</p>
                <p className='text-white text-sm leading-relaxed'>{p.answer}</p>
              </div>
            ))}
          </div>
        ) : isOwnProfile ? (
          <div className='mt-8'>
            <div className='bg-white/5 border border-dashed border-white/15 rounded-xl p-6 text-center'>
              <p className='text-white/30 text-sm'>Add prompts to let people know who you are as a runner.</p>
            </div>
          </div>
        ) : null}

        {/* Log out — own profile only, right-aligned */}
        {isOwnProfile && (
          <div className='mt-10 pt-6 border-t border-white/10 flex justify-end'>
            <SignOutButton />
          </div>
        )}
      </div>
    </main>
  )
}
