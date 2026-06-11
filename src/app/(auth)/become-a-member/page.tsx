import { GoogleSignInButton } from '@/utils/auth'
import { PREVIEW_FEATURES_ENABLED } from '@/lib/feature-flags'
import { ComingSoon } from '@/components/ui/coming-soon'

export const metadata = {
  title: 'Become a Member | Stride Run Club',
}

const features = [
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
        <circle cx='12' cy='8' r='5' /><path d='M20 21a8 8 0 1 0-16 0' />
      </svg>
    ),
    title: 'A shareable athlete profile',
    desc: 'The first of its kind: a profile built for athletes. Share your milestones, PRs, and story.',
  },
  {
    icon: (
      <svg width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
        <path d='M13 2L3 14h9l-1 8 10-12h-9l1-8z' />
      </svg>
    ),
    title: 'Register for runs in seconds',
    desc: 'No long forms, no friction. Pick a Stride run, tap once, and you\'re registered.',
  },
]

type PageProps = {
  searchParams: Promise<{ next?: string }>
}

export default async function BecomeAMemberPage({ searchParams }: PageProps) {
  // On the production site, show a "Coming soon" placeholder instead of a hard
  // 404 so visitors know membership is on its way. Full sign-in renders on
  // staging / previews / local dev.
  if (!PREVIEW_FEATURES_ENABLED) {
    return (
      <ComingSoon
        label='Membership'
        description='Member profiles and sign-in are almost ready. Check back soon to join the club.'
      />
    )
  }

  const { next } = await searchParams
  // Only accept relative-path next values to prevent open-redirect attacks
  const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : undefined

  return (
    <main className='relative min-h-screen bg-stride-purple-primary overflow-hidden flex items-start'>
      {/* Ambient background orbs */}
      <div className='absolute top-[-15%] left-[-8%] w-[36rem] h-[36rem] rounded-full bg-stride-yellow-accent animate-pulse-orb blur-[100px] pointer-events-none' />
      <div className='absolute bottom-[-20%] right-[-10%] w-[42rem] h-[42rem] rounded-full bg-white/5 blur-[120px] pointer-events-none' />
      <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[50rem] h-[50rem] rounded-full bg-stride-yellow-accent/[0.04] blur-[150px] pointer-events-none' />

      <div className='relative w-full max-w-6xl mx-auto px-6 lg:px-12 pt-28 pb-16 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center'>

        {/* ── Left: Value proposition ── */}
        <div className='flex flex-col gap-8 order-2 lg:order-1'>
          {/* Eyebrow badge */}
          <div
            className='animate-fade-in-up inline-flex'
            style={{ animationDelay: '0s' }}
          >
            <span className='inline-flex items-center gap-2 border border-stride-yellow-accent/40 rounded-full px-4 py-1.5 text-stride-yellow-accent text-xs font-semibold tracking-widest font-mono uppercase'>
              <span className='w-1.5 h-1.5 rounded-full bg-stride-yellow-accent animate-pulse' />
              Become a member of Stride. It&apos;s free!
            </span>
          </div>

          {/* Hero headline */}
          <div
            className='animate-fade-in-up'
            style={{ animationDelay: '0.1s' }}
          >
            <h1 className='text-4xl sm:text-5xl xl:text-[3rem] font-bold leading-[1.1] tracking-tight'>
              Run more.<br />
              <span className='text-stride-yellow-accent'>Earn more.</span><br />
              Be part of this lifestyle.
            </h1>
          </div>

          {/* Sub-headline */}
          <p
            className='animate-fade-in-up text-white/55 text-lg leading-relaxed max-w-md font-figtree'
            style={{ animationDelay: '0.2s' }}
          >
            Become a member of Stride Run Club with just one click and take part in Stride Run Club&apos;s curated experiences.
          </p>

          {/* Feature list */}
          <ul className='flex flex-col gap-5'>
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

        {/* ── Right: Sign-in card ── */}
        <div
          className='animate-fade-in-up flex justify-center lg:justify-end order-1 lg:order-2'
          style={{ animationDelay: '0.15s' }}
        >
          <div className='relative w-full max-w-sm'>
            {/* Decorative corner accent lines */}
            <div className='absolute -top-px -left-px w-16 h-16 border-t-2 border-l-2 border-stride-yellow-accent/50 rounded-tl-2xl pointer-events-none' aria-hidden='true' />
            <div className='absolute -bottom-px -right-px w-16 h-16 border-b-2 border-r-2 border-stride-yellow-accent/50 rounded-br-2xl pointer-events-none' aria-hidden='true' />

            <div className='relative bg-white/10 backdrop-blur-xl border border-white/15 rounded-2xl p-8 hover:border-stride-yellow-accent/40 transition-colors duration-500'>
              {/* Card headline */}
              <h2 className='text-3xl font-bold leading-snug mb-2'>
                Your journey<br />starts here.
              </h2>
              <p className='text-white/50 text-sm leading-relaxed mb-8 font-figtree'>
                Become a member with just one click. Connect with Google and take part in Stride Run Club&apos;s curated experiences.
              </p>

              <GoogleSignInButton nextUrl={safeNext} />

              {/* Divider with label */}
              <div className='flex items-center gap-3 my-6'>
                <div className='flex-1 h-px bg-white/10' />
                <span className='text-white/25 text-xs font-figtree tracking-wide'>No password needed, ever</span>
                <div className='flex-1 h-px bg-white/10' />
              </div>

              {/* Trust signals */}
              <div className='flex items-center justify-center gap-6'>
                {[
                  { value: '7,000+', label: 'athletes' },
                  { value: '3 sec', label: 'to join' },
                  { value: 'Free', label: 'forever' },
                ].map((stat) => (
                  <div key={stat.label} className='text-center'>
                    <p className='text-stride-yellow-accent font-bold text-sm font-mono tabular-nums'>{stat.value}</p>
                    <p className='text-white/30 text-xs font-figtree mt-0.5'>{stat.label}</p>
                  </div>
                ))}
              </div>

              <p className='text-white/20 text-xs text-center mt-6 leading-relaxed font-figtree'>
                By continuing, you agree to our{' '}
                <a href='/terms-of-service' className='text-stride-yellow-accent/60 hover:text-stride-yellow-accent transition-colors'>
                  Terms
                </a>{' '}
                and{' '}
                <a href='/privacy-policy' className='text-stride-yellow-accent/60 hover:text-stride-yellow-accent transition-colors'>
                  Privacy Policy
                </a>
                .
              </p>
            </div>
          </div>
        </div>

      </div>
    </main>
  )
}
