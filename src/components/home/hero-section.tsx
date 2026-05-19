import HeroContent from './hero-content'
import { HeroBgSlideshow } from './hero-bg-slideshow'
import heroData from '@/content/hero.json'

const HeroSection = () => {
  const { title, scrollToExpand } = heroData

  return (
    <div className='bg-stride-purple-primary'>

      {/* ── Panel 1: Full-viewport title + cycling newsroom images ── */}
      <section className='relative flex flex-col items-center justify-center min-h-dvh overflow-hidden'>
        <HeroBgSlideshow />
        <div className='absolute inset-0 bg-stride-purple-primary/70' />

        <h1
          className='relative z-10 font-bold text-stride-yellow-accent text-5xl md:text-7xl lg:text-[114px] tracking-tight font-libre text-center px-4'
          style={{ animation: 'hero-title-enter 1s cubic-bezier(0.22, 1, 0.36, 1) 0.2s both' }}
        >
          {title}
        </h1>

        {/* Scroll hint */}
        <div className='absolute bottom-10 z-10 flex flex-col items-center gap-3' style={{ animation: 'hero-scroll-hint-enter 0.8s ease-out 0.9s both' }}>
          {/* Mouse-wheel SVG — dot rises from bottom to top */}
          <svg width='22' height='36' viewBox='0 0 22 36' fill='none' aria-hidden='true'>
            <rect x='1' y='1' width='20' height='34' rx='10' stroke='rgba(225,208,63,0.45)' strokeWidth='1.5' />
            <line x1='11' y1='13' x2='11' y2='7' stroke='rgba(225,208,63,0.25)' strokeWidth='1' strokeLinecap='round' />
            <circle className='scroll-dot' cx='11' cy='26' r='2.5' fill='#E1D03F' style={{ animation: 'hero-scroll-dot 1.8s ease-in-out infinite' }} />
          </svg>
          <span className='text-[10px] text-copy-white/45 font-medium tracking-[0.22em] uppercase'>
            {scrollToExpand}
          </span>
        </div>
      </section>

      {/* ── Panel 2: Content ── */}
      <section className='px-8 py-16 md:px-16 lg:py-24'>
        <HeroContent />
      </section>

      <style>{`
        @keyframes hero-scroll-dot {
          0%   { transform: translateY(0);     opacity: 1; }
          60%  { transform: translateY(-14px); opacity: 0; }
          61%  { transform: translateY(0);     opacity: 0; }
          100% { transform: translateY(0);     opacity: 1; }
        }
        @keyframes hero-title-enter {
          from { opacity: 0; transform: translateY(40px); filter: blur(6px); }
          to   { opacity: 1; transform: translateY(0);    filter: blur(0px); }
        }
        @keyframes hero-scroll-hint-enter {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

export default HeroSection
