'use client';

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Star } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { SPOTLIGHT_SLIDES } from '@/content/spotlights';
import { SpotlightVideo } from '@/components/home/spotlight-video';

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

function OriginalsBadge() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: -6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.85, y: -6 }}
      transition={{ duration: 0.35, ease: EASE }}
      className='relative inline-flex items-center gap-2 overflow-hidden rounded-full border border-stride-yellow-accent/50 bg-stride-yellow-accent/10 px-3 py-1 w-fit'
    >
      {/* Shine sweep */}
      <motion.span
        className='absolute inset-y-0 w-1/2 bg-linear-to-r from-transparent via-white/25 to-transparent -skew-x-12 pointer-events-none'
        animate={{ x: ['-120%', '220%'] }}
        transition={{
          repeat: Infinity,
          duration: 2.2,
          ease: 'easeInOut',
          repeatDelay: 3,
        }}
      />
      {/* Twinkling star */}
      <motion.span
        className='flex items-center shrink-0 text-stride-yellow-accent'
        animate={{ opacity: [1, 0.4, 1], scale: [1, 0.85, 1] }}
        transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
      >
        <Star size={10} fill='currentColor' strokeWidth={0} aria-hidden='true' />
      </motion.span>
      <span className='text-[10px] font-semibold font-mono uppercase tracking-widest text-stride-yellow-accent leading-none'>
        Stride Originals
      </span>
    </motion.div>
  );
}

export default function SpotlightSection() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');
  const [isMuted, setIsMuted] = useState(true);
  const touchStartX = useRef<number | null>(null);
  const count = SPOTLIGHT_SLIDES.length;

  const goToSlide = useCallback(
    (index: number, dir?: 'next' | 'prev') => {
      if (index === currentIndex) return;
      setDirection(dir ?? (index > currentIndex ? 'next' : 'prev'));
      setCurrentIndex(index);
    },
    [currentIndex]
  );

  const goNext = useCallback(
    () => goToSlide((currentIndex + 1) % count, 'next'),
    [currentIndex, count, goToSlide]
  );

  const goPrev = useCallback(
    () => goToSlide((currentIndex - 1 + count) % count, 'prev'),
    [currentIndex, count, goToSlide]
  );

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) goNext(); else goPrev();
    }
    touchStartX.current = null;
  };

  const slide = SPOTLIGHT_SLIDES[currentIndex];

  return (
    <section
      className='pt-8 pb-5 md:pt-24 md:pb-10 px-4 md:px-6'
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className='mx-auto max-w-6xl'>

        {/* Main layout:
            DOM order — text first, video second.
            Mobile (flex-col-reverse): video on top, text below.
            Desktop (md:flex-row): text left, video right. */}
        <div className='flex flex-col-reverse md:flex-row md:items-center md:gap-12 lg:gap-16'>

          {/* ── Text panel ── */}
          <div className='mt-5 md:mt-0 md:flex-1 flex flex-col justify-center'>

            {/* Slide counter */}
            <div className='flex items-center gap-3 mb-5'>
              <span className='h-px w-8 bg-copy-white/20 shrink-0' />
              <span className='text-copy-white/70 text-xs font-figtree tabular-nums'>
                {String(currentIndex + 1).padStart(2, '0')} /{' '}
                {String(count).padStart(2, '0')}
              </span>
            </div>

            {/* Animated content block. The slide sits in normal flow so the
                block is only ever as tall as its own content — slides differ by
                ~90px (the handle button, extra wrapped lines), and a reserve
                sized for the tallest one left a large hole under the shorter
                ones. Safe because nothing auto-advances: the height only changes
                on a click/swipe the visitor initiated. `min-h` is just a floor
                so the box doesn't collapse mid-transition, while
                AnimatePresence `mode='wait'` briefly has no child. */}
            <div className='relative min-h-48 md:min-h-50'>
              <AnimatePresence mode='wait'>
                <motion.div
                  key={currentIndex}
                  initial={{ opacity: 0, y: direction === 'next' ? 20 : -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: direction === 'next' ? -20 : 20 }}
                  transition={{ duration: 0.4, ease: EASE }}
                  className='flex flex-col gap-3'
                >
                  {/* Stride Originals badge */}
                  {slide.badge === 'Stride Originals' && <OriginalsBadge />}

                  <h2 className='font-libre text-3xl md:text-4xl font-bold text-copy-white leading-snug'>
                    {slide.title}
                  </h2>
                  <p className='text-stride-yellow-accent text-xs font-medium font-mono uppercase tracking-widest'>
                    {slide.subtitle}
                  </p>
                  <p className='text-copy-white/60 text-sm md:text-base font-figtree leading-relaxed line-clamp-4'>
                    {slide.description}
                  </p>
                  {slide.handle && (
                    <Link
                      href={slide.handleUrl!}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='group inline-flex items-center gap-2 w-fit mt-1 rounded-md bg-white/8 border border-white/12 px-3.5 py-2 text-sm font-medium text-copy-white/80 transition-all duration-200 hover:bg-pink-500/12 hover:border-pink-500/35 hover:text-pink-300 active:scale-95 cursor-pointer'
                    >
                      <svg viewBox='0 0 24 24' fill='currentColor' className='h-4 w-4 shrink-0 text-pink-400' aria-hidden='true'>
                        <path d='M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z'/>
                      </svg>
                      {slide.handle}
                    </Link>
                  )}

                  {/* Partnership hook — slide-specific copy, links to /partnerships */}
                  <Link
                    href='/partnerships'
                    target='_blank'
                    rel='noopener noreferrer'
                    className='group/cta inline-flex items-start gap-1.5 w-fit mt-1 text-sm font-medium text-stride-yellow-accent hover:underline underline-offset-4 decoration-stride-yellow-accent/50'
                  >
                    <span>{slide.partnerCta}</span>
                    <ArrowRight className='h-4 w-4 shrink-0 mt-0.5 group-hover/cta:translate-x-0.5 transition-transform' />
                  </Link>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Nav arrows + dot indicators.
                Arrows live here on desktop; on mobile they flank the video instead. */}
            <div className='flex items-center gap-5 mt-4 md:mt-5'>
              <div className='hidden md:flex gap-3'>
                <button
                  onClick={goPrev}
                  className='flex items-center justify-center h-10 w-10 rounded-lg bg-white/10 border border-white/15 text-copy-white/60 hover:text-copy-white hover:border-stride-yellow-accent/40 hover:bg-white/15 transition-all active:scale-90 cursor-pointer'
                  aria-label='Previous spotlight'
                >
                  <ArrowLeft className='h-4 w-4' />
                </button>
                <button
                  onClick={goNext}
                  className='flex items-center justify-center h-10 w-10 rounded-lg bg-white/10 border border-white/15 text-copy-white/60 hover:text-copy-white hover:border-stride-yellow-accent/40 hover:bg-white/15 transition-all active:scale-90 cursor-pointer'
                  aria-label='Next spotlight'
                >
                  <ArrowRight className='h-4 w-4' />
                </button>
              </div>

              {/* Dot indicators — the visual dot sits inside a 44px-tall,
                  ≥24px-wide hit area so touch targets pass without changing
                  the look */}
              <div className='flex gap-1 items-center'>
                {SPOTLIGHT_SLIDES.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => goToSlide(i)}
                    className='flex items-center justify-center min-w-6 min-h-11 cursor-pointer'
                    aria-label={`Go to slide ${i + 1}`}
                  >
                    <span
                      className={cn(
                        'h-1.5 rounded-full transition-all duration-300',
                        i === currentIndex
                          ? 'w-6 bg-stride-yellow-accent'
                          : 'w-1.5 bg-white/45 hover:bg-white/65'
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Portrait video panel ── */}
          <div className='relative flex items-center justify-center md:justify-end md:shrink-0'>
            {/* Mobile nav arrows — flank the video (desktop arrows live in the text panel) */}
            <button
              onClick={goPrev}
              className='md:hidden absolute left-0 top-1/2 -translate-y-1/2 z-30 flex items-center justify-center h-10 w-10 rounded-lg bg-white/10 border border-white/15 text-copy-white/60 hover:text-copy-white hover:border-stride-yellow-accent/40 hover:bg-white/15 transition-all active:scale-90 cursor-pointer'
              aria-label='Previous spotlight'
            >
              <ArrowLeft className='h-4 w-4' />
            </button>
            <button
              onClick={goNext}
              className='md:hidden absolute right-0 top-1/2 -translate-y-1/2 z-30 flex items-center justify-center h-10 w-10 rounded-lg bg-white/10 border border-white/15 text-copy-white/60 hover:text-copy-white hover:border-stride-yellow-accent/40 hover:bg-white/15 transition-all active:scale-90 cursor-pointer'
              aria-label='Next spotlight'
            >
              <ArrowRight className='h-4 w-4' />
            </button>
            <AnimatePresence mode='wait'>
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, x: direction === 'next' ? 30 : -30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction === 'next' ? -30 : 30 }}
                transition={{ duration: 0.5, ease: EASE }}
                className='relative w-[260px] sm:w-[300px] md:w-[320px] aspect-9/16 rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-white/5'
              >
                {slide.videoUrl ? (
                  <SpotlightVideo
                    src={slide.videoUrl}
                    poster={slide.poster}
                    isMuted={isMuted}
                    onMuteChange={setIsMuted}
                  />
                ) : (
                  // Image-only spotlight (no video). The image isn't 9:16, so
                  // `object-contain` shows it whole over a blurred fill instead
                  // of cropping it to the frame.
                  <>
                    <Image
                      src={slide.poster}
                      alt=''
                      aria-hidden='true'
                      fill
                      sizes='(max-width: 768px) 300px, 320px'
                      className='object-cover blur-xl scale-110 opacity-60'
                    />
                    <Image
                      src={slide.poster}
                      alt={slide.title}
                      fill
                      sizes='(max-width: 768px) 300px, 320px'
                      className='object-contain'
                    />
                    <div className='absolute inset-0 bg-linear-to-t from-black/60 via-black/10 to-transparent pointer-events-none' />
                  </>
                )}
                {/* Accent corner — top left */}
                <div className='absolute top-4 left-4 w-6 h-6 border-l-2 border-t-2 border-stride-yellow-accent/50 rounded-tl-sm pointer-events-none z-20' />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

      </div>
    </section>
  );
}
