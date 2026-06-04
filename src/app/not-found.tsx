import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Calendar } from 'lucide-react'

const DUCKY_URL =
  'https://ienotcjldormdxrzukpk.supabase.co/storage/v1/object/public/stride-assets/images/web-assets/ducky-3.webp'

export const metadata = {
  title: 'Off-route — Stride Run Club',
  description: 'This page took a wrong turn. Head back to the start line.',
}

export default function NotFound() {
  return (
    <main className='relative min-h-screen bg-stride-purple-primary overflow-hidden flex items-center justify-center px-6 py-24'>

      {/* Ambient orbs — same drift system as the rest of the site */}
      <div className='pointer-events-none absolute inset-0 overflow-hidden'>
        <div className='orb orb-yellow animate-orb-drift top-[-15%] left-[-10%] w-[44rem] h-[44rem]' />
        <div className='orb orb-white  animate-orb-drift-reverse bottom-[-15%] right-[-10%] w-[40rem] h-[40rem]' style={{ animationDelay: '4s' }} />
      </div>

      <div className='relative z-10 max-w-md w-full flex flex-col items-center text-center'>

        {/* Eyebrow */}
        <span className='inline-flex items-center gap-2 text-stride-yellow-accent text-[10px] font-bold tracking-[0.25em] font-mono uppercase mb-6'>
          <span className='w-1.5 h-1.5 rounded-full bg-stride-yellow-accent animate-pulse' />
          Error 404
        </span>

        {/* Ducky mascot */}
        <div className='relative mb-2'>
          {/* Soft glow behind ducky */}
          <div className='absolute inset-0 rounded-full bg-stride-yellow-accent/15 blur-2xl scale-90' aria-hidden='true' />
          <Image
            src={DUCKY_URL}
            alt='Ducky the Stride mascot, looking confused'
            width={220}
            height={220}
            priority
            className='relative w-44 h-44 sm:w-52 sm:h-52 object-contain drop-shadow-[0_24px_48px_rgba(0,0,0,0.5)]'
          />
        </div>

        {/* Headline */}
        <h1 className='text-5xl sm:text-6xl font-bold text-white leading-[0.95] tracking-tight'>
          You took a<br />
          <span className='text-stride-yellow-accent'>wrong turn.</span>
        </h1>

        {/* Description */}
        <p className='text-white/55 text-base sm:text-lg leading-relaxed mt-5 max-w-sm'>
          This page doesn&apos;t exist — but the road back is wide open. Ducky&apos;s pointing you to a few good places to land.
        </p>

        {/* CTAs */}
        <div className='flex flex-col sm:flex-row gap-3 mt-8 w-full max-w-sm'>
          <Link
            href='/'
            className='flex-1 inline-flex items-center justify-center gap-2 bg-stride-yellow-accent text-copy-black font-bold px-6 py-3 rounded-md hover:bg-stride-yellow-accent/90 transition-colors text-sm min-h-11'
          >
            <ArrowLeft size={15} />
            Back to Home
          </Link>
          <Link
            href='/events'
            className='flex-1 inline-flex items-center justify-center gap-2 bg-white/8 border border-white/15 text-white/80 font-semibold px-6 py-3 rounded-md hover:bg-white/12 hover:border-white/25 transition-colors text-sm min-h-11'
          >
            <Calendar size={15} />
            Browse Events
          </Link>
        </div>

        {/* Subtle footer link */}
        <p className='mt-8 text-white/35 text-xs'>
          Think this is a broken link? <a href='/contact-us' className='text-stride-yellow-accent/70 hover:text-stride-yellow-accent transition-colors underline-offset-2 hover:underline'>Let us know</a>.
        </p>
      </div>
    </main>
  )
}
