import Link from 'next/link'
import { Clock, ArrowLeft } from 'lucide-react'

type Props = {
  /** Short feature label shown as the eyebrow, e.g. "Events" or "Membership". */
  label: string
  /** One-line reassurance that the feature is on its way. */
  description?: string
}

// Friendly placeholder shown on the production site for features that are built
// but still gated to staging — so live visitors know the feature is coming
// rather than hitting a bare 404.
export function ComingSoon({ label, description }: Props) {
  return (
    <main className='relative min-h-screen bg-stride-purple-primary overflow-hidden flex items-center justify-center px-6'>
      {/* Ambient orbs */}
      <div aria-hidden='true' className='pointer-events-none absolute inset-0 overflow-hidden'>
        <div className='absolute top-[-15%] left-[-8%] w-[36rem] h-[36rem] rounded-full bg-stride-yellow-accent/10 blur-[120px]' />
        <div className='absolute bottom-[-20%] right-[-10%] w-[42rem] h-[42rem] rounded-full bg-white/5 blur-[120px]' />
      </div>

      <div className='relative z-10 max-w-md text-center flex flex-col items-center'>
        <span className='inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-stride-yellow-accent/10 border border-stride-yellow-accent/25 text-stride-yellow-accent mb-6'>
          <Clock size={28} aria-hidden='true' />
        </span>
        <p className='text-stride-yellow-accent text-xs font-bold font-mono uppercase tracking-[0.25em] mb-4'>
          {label}
        </p>
        <h1 className='text-4xl sm:text-5xl font-bold text-white leading-tight mb-4'>
          Coming soon
        </h1>
        <p className='text-white/55 text-base leading-relaxed mb-8 font-figtree'>
          {description ?? "We're putting the finishing touches on this. Check back soon."}
        </p>
        <Link
          href='/'
          className='inline-flex items-center gap-2 bg-stride-yellow-accent text-copy-black font-bold px-5 py-3 rounded-md hover:scale-[1.03] active:scale-[0.97] transition-transform'
        >
          <ArrowLeft size={16} aria-hidden='true' />
          Back to home
        </Link>
      </div>
    </main>
  )
}
