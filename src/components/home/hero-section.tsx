import HeroContent from './hero-content'
import { HeroBgSlideshow } from './hero-bg-slideshow'
import heroData from '@/content/hero.json'

const HeroSection = () => {
  const { title } = heroData

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
      </section>

      {/* ── Panel 2: Content ── */}
      <section className='px-8 py-16 md:px-16 lg:py-24'>
        <HeroContent />
      </section>

      <style>{`
        @keyframes hero-title-enter {
          from { opacity: 0; transform: translateY(40px); filter: blur(6px); }
          to   { opacity: 1; transform: translateY(0);    filter: blur(0px); }
        }
      `}</style>
    </div>
  )
}

export default HeroSection
