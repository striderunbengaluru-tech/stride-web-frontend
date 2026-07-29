import Link from 'next/link'
import { GoogleSignInButton } from '@/utils/auth'

export const metadata = {
  title: 'Become a Member | Stride Run Club',
}

const features = [
  {
    icon: (
      <svg width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
        <path d='M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' /><circle cx='9' cy='7' r='4' />
        <path d='M22 21v-2a4 4 0 0 0-3-3.87' /><path d='M16 3.13a4 4 0 0 1 0 7.75' />
      </svg>
    ),
    title: 'Find a supportive community',
    desc: 'New to the city? Want to make new friends? Eager to start your run journey? We\'ve got you covered.',
  },
  {
    icon: (
      <svg width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
        <path d='M6 9H4.5a2.5 2.5 0 0 1 0-5H6' /><path d='M18 9h1.5a2.5 2.5 0 0 0 0-5H18' />
        <path d='M4 22h16' /><path d='M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22' />
        <path d='M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22' />
        <path d='M18 2H6v7a6 6 0 0 0 12 0V2Z' />
      </svg>
    ),
    title: 'Show up and earn rewards',
    desc: 'Every run you complete builds your loyalty streak. The more you run, the more you earn.',
  },
  {
    icon: (
      <svg width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
        <polyline points='22 7 13.5 15.5 8.5 10.5 2 17' /><polyline points='16 7 22 7 22 13' />
      </svg>
    ),
    title: 'Track your run journey',
    desc: 'Share your milestones, PRs, and story in one place.',
  },
]

type PageProps = {
  searchParams: Promise<{ next?: string }>
}

export default async function BecomeAMemberPage({ searchParams }: PageProps) {
  const { next } = await searchParams
  // Only accept relative-path next values to prevent open-redirect attacks
  const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : undefined

  return (
    <main className='relative min-h-screen bg-stride-purple-primary overflow-hidden flex flex-row items-center justify-center'>
      {/* ── Background: track-lane bend sweeping in from the bottom-right —
          concentric lanes like the curve of a 400m track, with one dashed
          yellow lane as the accent ── */}
      <svg
        className='absolute -right-40 -bottom-56 w-[34rem] sm:w-[52rem] h-auto pointer-events-none'
        viewBox='0 0 800 800'
        fill='none'
        aria-hidden='true'
      >
        {[240, 306, 372, 438, 504, 570, 636, 702, 768].map((r) => (
          <circle key={r} cx='800' cy='800' r={r} stroke='white' strokeOpacity='0.07' strokeWidth='1.5' />
        ))}
        <g className='text-stride-yellow-accent'>
          <circle cx='800' cy='800' r='537' stroke='currentColor' strokeOpacity='0.3' strokeWidth='2' strokeDasharray='4 16' strokeLinecap='round' />
        </g>
      </svg>

      {/* Counter-curve in the top-left, much quieter, for balance */}
      <svg
        className='absolute -left-48 -top-52 w-[30rem] sm:w-[40rem] h-auto pointer-events-none'
        viewBox='0 0 800 800'
        fill='none'
        aria-hidden='true'
      >
        {[280, 360, 440, 520, 600].map((r) => (
          <circle key={r} cx='0' cy='0' r={r} stroke='white' strokeOpacity='0.05' strokeWidth='1.5' />
        ))}
      </svg>

      {/* Vignette — pulls focus toward the content */}
      <div className='absolute inset-0 pointer-events-none bg-[radial-gradient(120%_120%_at_50%_40%,transparent_55%,rgba(1,1,1,0.35)_100%)]' />

      <div className='relative w-full max-w-6xl mx-auto px-6 lg:px-12 pt-24 lg:pt-20 pb-16 lg:pb-12 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-x-16 lg:gap-y-10 items-center'>

        {/* ── Headline block — first in DOM so mobile shows it in the first fold,
            right above the sign-in card ── */}
        <div className='flex flex-col gap-5 lg:gap-8 lg:col-start-1'>
          {/* Hero headline */}
          <div
            className='animate-fade-in-up'
            style={{ animationDelay: '0s' }}
          >
            <h1 className='text-[1.75rem] sm:text-[2.5rem] xl:text-[2.75rem] font-bold leading-[1.15] tracking-tight'>
              Run more.<br />
              <span className='text-stride-yellow-accent'>Earn more rewards.</span><br />
              Take your first Stride.
            </h1>
          </div>

        </div>

        {/* ── Sign-in card — spans both rows on desktop, sits between headline
            and features on mobile ── */}
        <div
          className='animate-fade-in-up flex justify-center lg:justify-end lg:col-start-2 lg:row-start-1 lg:row-span-2'
          style={{ animationDelay: '0.15s' }}
        >
          <div className='relative w-full max-w-sm'>
            {/* Decorative corner accent lines */}
            <div className='absolute -top-px -left-px w-16 h-16 border-t-2 border-l-2 border-stride-yellow-accent/50 rounded-tl-2xl pointer-events-none' aria-hidden='true' />
            <div className='absolute -bottom-px -right-px w-16 h-16 border-b-2 border-r-2 border-stride-yellow-accent/50 rounded-br-2xl pointer-events-none' aria-hidden='true' />

            <div className='relative bg-white/10 backdrop-blur-xl border border-white/15 rounded-2xl p-6 sm:p-8 hover:border-stride-yellow-accent/40 transition-colors duration-500'>
              {/* Card headline */}
              <h2 className='text-2xl font-bold leading-snug mb-2'>
                Your runner era<br />starts here.
              </h2>
              <p className='text-white/50 text-sm leading-relaxed mb-8 font-figtree'>
                Become a member of Stride Run Club with just one click and take part in curated experiences.
              </p>

              <GoogleSignInButton nextUrl={safeNext} />

              {/* Divider with label */}
              <div className='flex items-center gap-3 my-6'>
                <div className='flex-1 h-px bg-white/10' />
                <span className='text-white/25 text-xs font-figtree tracking-wide'>No password needed</span>
                <div className='flex-1 h-px bg-white/10' />
              </div>

              <p className='text-white/50 text-xs text-center mt-2 leading-relaxed font-figtree'>
                By continuing, you agree to our{' '}
                <Link href='/terms-of-service' className='text-stride-yellow-accent/80 hover:text-stride-yellow-accent transition-colors'>
                  Terms
                </Link>{' '}
                and{' '}
                <Link href='/privacy-policy' className='text-stride-yellow-accent/80 hover:text-stride-yellow-accent transition-colors'>
                  Privacy Policy
                </Link>
                .
              </p>
            </div>
          </div>
        </div>

        {/* ── Feature list — below the card on mobile, second row of the left
            column on desktop ── */}
        <ul className='flex flex-col gap-5 lg:col-start-1'>
          {features.map((feature, i) => (
            <li
              key={i}
              className='animate-fade-in-up flex items-start gap-4'
              style={{ animationDelay: `${0.3 + i * 0.12}s` }}
            >
              <span className='mt-0.5 shrink-0 text-stride-yellow-accent'>
                {feature.icon}
              </span>
              <div className='border-l border-white/10 pl-4'>
                <p className='text-white font-semibold text-sm'>{feature.title}</p>
                <p className='text-white/45 text-sm leading-relaxed mt-0.5 font-figtree'>{feature.desc}</p>
              </div>
            </li>
          ))}
        </ul>

      </div>

      {/* Film-grain overlay — subtle texture over the whole composition */}
      <div
        className='absolute inset-0 pointer-events-none opacity-[0.05]'
        aria-hidden='true'
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
    </main>
  )
}
