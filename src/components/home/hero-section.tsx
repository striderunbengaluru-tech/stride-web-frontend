import ScrollExpandMedia from '@/components/blocks/scroll-expansion-hero';
import { HighlightedText } from '@/components/ui/highlighted-text';
import heroData from '@/content/hero.json';

// Background video — cheerful running footage via Pexels (Pressmaster)
const BG_VIDEO_SRC =
  'https://videos.pexels.com/video-files/3191289/3191289-uhd_2732_1440_25fps.mp4';

const HeroSection = () => {
  const { title, scrollToExpand } = heroData;
  return (
    <ScrollExpandMedia
      mediaType='image'
      mediaSrc='/assets/images/hero-main-featured.webp'
      bgVideoSrc={BG_VIDEO_SRC}
      title={title}
      scrollToExpand={scrollToExpand}
      headingAs='h1'
      titleLayout='single'
      titleClassName='font-bold !text-stride-yellow-accent text-5xl md:text-7xl lg:text-[114px] tracking-tight transition-none'
      paneOverlay={<RunRegistrationOverlay />}
    >
      <HeroContent />
    </ScrollExpandMedia>
  );
};

const RunRegistrationOverlay = () => {
  const { pretitle, eventName, eventDate, eventLocation, ctaLabel, ctaHref } = heroData.overlay;
  return (
    <div className='flex flex-col items-center text-center px-6'>
      <p className='text-copy-white/80 text-xs uppercase tracking-widest mb-3 font-medium'>
        {pretitle}
      </p>
      <h2 className='font-bold text-stride-yellow-accent text-4xl md:text-5xl mb-4 leading-tight'>
        {eventName}
      </h2>
      <div className='flex items-center gap-3 text-copy-white text-lg mb-8'>
        <span>{eventDate}</span>
        <span aria-hidden>·</span>
        <span>{eventLocation}</span>
      </div>
      <a
        href={ctaHref}
        className='bg-stride-yellow-accent text-copy-black font-bold px-10 py-3.5 rounded-md hover:opacity-90 transition-opacity text-lg'
      >
        {ctaLabel}
      </a>
    </div>
  );
};

const HeroContent = () => {
  const { heading, subheading, ctas, stats } = heroData.content;
  return (
    <div className='max-w-6xl mx-auto text-center'>
      <h2 className='text-4xl lg:text-5xl font-bold text-white mb-4'>
        <HighlightedText text={heading} />
      </h2>

      <p className='text-base md:text-lg text-copy-white/75 mb-10 max-w-2xl mx-auto leading-relaxed'>
        {subheading}
      </p>

      <div className='flex flex-col sm:flex-row items-center justify-center gap-4'>
        {ctas.map((cta) =>
          cta.variant === 'primary' ? (
            <a
              key={cta.label}
              href={cta.href}
              className='bg-stride-yellow-accent text-copy-black font-bold px-10 py-3.5 rounded-md hover:opacity-90 transition-opacity'
            >
              {cta.label}
            </a>
          ) : (
            <a
              key={cta.label}
              href={cta.href}
              className='border border-copy-white/60 text-copy-white font-semibold px-10 py-3.5 rounded-md hover:bg-copy-white/10 transition-colors'
            >
              {cta.label}
            </a>
          )
        )}
      </div>

      <div className='grid grid-cols-3 gap-8 mt-16 border-t border-copy-white/20 pt-12'>
        {stats.map((stat) => (
          <div key={stat.label}>
            <p className='text-4xl lg:text-5xl font-bold text-stride-yellow-accent font-libre'>{stat.value}</p>
            <p className='text-copy-white/60 mt-1 text-sm uppercase tracking-wide'>{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HeroSection;
