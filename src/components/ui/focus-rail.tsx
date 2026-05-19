'use client';

import * as React from 'react';
import { motion, AnimatePresence, type PanInfo, useMotionValue, useTransform, animate } from 'framer-motion';
import { ChevronLeft, ChevronRight, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export type FocusRailItem = {
  id: string | number;
  title: string;
  subtitle?: string;
  imageSrc: string;
  href?: string;
  publication?: string;
  publicationLogo?: string;
  date?: string;
};

interface FocusRailProps {
  items: FocusRailItem[];
  initialIndex?: number;
  loop?: boolean;
  autoPlay?: boolean;
  interval?: number;
  className?: string;
}

function ArticleCardImage({ src, alt }: { src: string; alt: string }) {
  const [loaded, setLoaded] = React.useState(false);
  return (
    <>
      <div
        className={cn(
          'absolute inset-0 bg-white/8 animate-pulse transition-opacity duration-500',
          loaded ? 'opacity-0 pointer-events-none' : 'opacity-100'
        )}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className={cn(
          'h-full w-full object-cover pointer-events-none transition-opacity duration-500',
          loaded ? 'opacity-100' : 'opacity-0'
        )}
        loading='lazy'
        fetchPriority='low'
        onLoad={() => setLoaded(true)}
      />
    </>
  );
}

function wrap(min: number, max: number, v: number) {
  const rangeSize = max - min;
  return ((((v - min) % rangeSize) + rangeSize) % rangeSize) + min;
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(dateStr));
}

const BASE_SPRING = {
  type: 'spring',
  stiffness: 300,
  damping: 30,
  mass: 1,
} as const;

const TAP_SPRING = {
  type: 'spring',
  stiffness: 450,
  damping: 18,
  mass: 1,
} as const;

export function FocusRail({
  items,
  initialIndex = 0,
  loop = true,
  autoPlay = false,
  interval = 4000,
  className,
}: FocusRailProps) {
  const [active, setActive] = React.useState(initialIndex);
  const [isHovering, setIsHovering] = React.useState(false);
  const lastWheelTime = React.useRef<number>(0);
  const [xStep, setXStep] = React.useState(560);
  const [maskStyle, setMaskStyle] = React.useState<React.CSSProperties>({});

  React.useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      setXStep(w >= 1024 ? 800 : w >= 640 ? 560 : 420);
      setMaskStyle(
        w >= 640
          ? {
              maskImage:
                'linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)',
              WebkitMaskImage:
                'linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)',
            }
          : {}
      );
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const progressValue = useMotionValue(0);
  const progressWidth = useTransform(progressValue, (v) => `${v}%`);

  React.useEffect(() => {
    progressValue.set(0);
    if (!autoPlay || isHovering) return;
    const controls = animate(progressValue, 100, {
      duration: interval / 1000,
      ease: 'linear',
    });
    return () => controls.stop();
  }, [active, isHovering, autoPlay, interval, progressValue]);

  const count = items.length;
  const activeIndex = wrap(0, count, active);
  const activeItem = items[activeIndex];

  const handlePrev = React.useCallback(() => {
    if (!loop && active === 0) return;
    setActive((p) => p - 1);
  }, [loop, active]);

  const handleNext = React.useCallback(() => {
    if (!loop && active === count - 1) return;
    setActive((p) => p + 1);
  }, [loop, active, count]);

  const onWheel = React.useCallback(
    (e: React.WheelEvent) => {
      const now = Date.now();
      if (now - lastWheelTime.current < 400) return;
      const isHorizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY);
      const delta = isHorizontal ? e.deltaX : e.deltaY;
      if (Math.abs(delta) > 20) {
        delta > 0 ? handleNext() : handlePrev();
        lastWheelTime.current = now;
      }
    },
    [handleNext, handlePrev]
  );

  React.useEffect(() => {
    if (!autoPlay || isHovering) return;
    const timer = setInterval(() => handleNext(), interval);
    return () => clearInterval(timer);
  }, [autoPlay, isHovering, handleNext, interval]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') handlePrev();
    if (e.key === 'ArrowRight') handleNext();
  };

  const swipeConfidenceThreshold = 10000;
  const swipePower = (offset: number, velocity: number) =>
    Math.abs(offset) * velocity;

  const onDragEnd = (
    _e: MouseEvent | TouchEvent | PointerEvent,
    { offset, velocity }: PanInfo
  ) => {
    const swipe = swipePower(offset.x, velocity.x);
    if (swipe < -swipeConfidenceThreshold) handleNext();
    else if (swipe > swipeConfidenceThreshold) handlePrev();
  };

  const visibleIndices = [-2, -1, 0, 1, 2];

  return (
    <div
      className={cn(
        'group relative flex h-[600px] lg:h-[800px] w-full flex-col overflow-hidden text-copy-white outline-none select-none',
        className
      )}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onWheel={onWheel}
    >
      {/* Main stage */}
      <div className='relative z-10 flex flex-1 flex-col justify-center px-4 md:px-8'>
        {/* Draggable rail */}
        <motion.div
          className='relative mx-auto flex h-[220px] sm:h-[280px] md:h-[340px] lg:h-[500px] w-full max-w-6xl items-center justify-center cursor-grab active:cursor-grabbing'
          style={{ perspective: '1200px', ...maskStyle }}
          drag='x'
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={onDragEnd}
        >
          {visibleIndices.map((offset) => {
            const absIndex = active + offset;
            const index = wrap(0, count, absIndex);
            const item = items[index];

            if (!loop && (absIndex < 0 || absIndex >= count)) return null;

            const isCenter = offset === 0;
            const dist = Math.abs(offset);

            const xOffset = offset * xStep;
            const zOffset = -dist * 180;
            const scale = isCenter ? 1 : 0.85;
            const rotateY = offset * -20;
            const opacity = isCenter ? 1 : Math.max(0.1, 1 - dist * 0.5);
            const blur = isCenter ? 0 : dist * 6;
            const brightness = isCenter ? 1 : 0.5;

            return (
              <motion.div
                key={absIndex}
                className={cn(
                  'absolute aspect-video w-[380px] sm:w-[420px] md:w-[460px] lg:w-[780px] rounded-2xl border border-copy-white/15 overflow-hidden shadow-2xl',
                  isCenter ? 'z-20' : 'z-10'
                )}
                initial={false}
                animate={{
                  x: xOffset,
                  z: zOffset,
                  scale,
                  rotateY,
                  opacity,
                  filter: `blur(${blur}px) brightness(${brightness})`,
                }}
                transition={{
                  x: BASE_SPRING,
                  z: BASE_SPRING,
                  rotateY: BASE_SPRING,
                  opacity: BASE_SPRING,
                  scale: TAP_SPRING,
                  filter: { duration: 0.3, ease: 'easeOut' },
                }}
                style={{ transformStyle: 'preserve-3d' }}
                onClick={() => {
                  if (offset !== 0) setActive((p) => p + offset);
                }}
              >
                {/* Article image */}
                <ArticleCardImage src={item.imageSrc} alt={item.title} />

                {/* Bottom gradient overlay */}
                <div className='absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent pointer-events-none' />

                {/* Top sheen */}
                <div className='absolute inset-0 rounded-2xl bg-gradient-to-b from-copy-white/10 to-transparent pointer-events-none' />
              </motion.div>
            );
          })}
        </motion.div>

        {/* Info, controls & progress */}
        <div className='mx-auto mt-4 md:mt-8 w-full max-w-4xl flex flex-col gap-4 pointer-events-auto'>

          {/* Animated title block — full width, fixed height to prevent layout shift */}
          <div className='relative min-h-[160px] md:min-h-[180px]'>
          <AnimatePresence mode='wait'>
            <motion.div
              key={activeItem.id}
              initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
              transition={{ duration: 0.3 }}
              className='absolute top-0 left-0 right-0 flex flex-col gap-2'
            >
              {/* Publication logo + date */}
              <div className='flex items-center gap-3'>
                <div className='bg-white rounded-lg px-3 py-1.5 shadow-sm shrink-0'>
                  {activeItem.publicationLogo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={activeItem.publicationLogo}
                      alt={activeItem.publication ?? ''}
                      className='h-7 w-auto max-w-[140px] object-contain'
                      loading='lazy'
                      fetchPriority='low'
                    />
                  ) : (
                    <span className='text-copy-black/70 text-[10px] font-semibold whitespace-nowrap leading-none'>
                      {activeItem.publication}
                    </span>
                  )}
                </div>
                {activeItem.date && (
                  <span className='text-xs font-medium uppercase tracking-wider text-stride-yellow-accent font-roboto'>
                    {formatDate(activeItem.date)}
                  </span>
                )}
              </div>

              {/* Title — breathes full width */}
              <h3 className='font-libre text-xl md:text-3xl font-bold text-copy-white leading-snug line-clamp-2'>
                {activeItem.title}
              </h3>

              {/* Subtitle */}
              {activeItem.subtitle && (
                <p className='text-copy-white/60 text-sm font-roboto line-clamp-2'>
                  {activeItem.subtitle}
                </p>
              )}
            </motion.div>
          </AnimatePresence>
          </div>

          {/* Controls + CTA + progress — static row */}
          <div className='flex items-center gap-3'>
            {/* Nav pill — glassmorphism, progress fused at bottom */}
            <div className='flex flex-col rounded-t-xl bg-white/10 backdrop-blur-md border border-white/15 overflow-hidden'>
              <div className='flex items-center gap-0 px-1 py-1'>
                <button
                  onClick={handlePrev}
                  className='rounded-md p-2.5 text-copy-white/50 transition-all hover:bg-white/10 hover:text-copy-white active:scale-90'
                  aria-label='Previous article'
                >
                  <ChevronLeft className='h-4 w-4' />
                </button>

                <div className='flex items-center gap-1.5 px-3 select-none'>
                  <span className='text-sm font-semibold text-copy-white tabular-nums leading-none'>
                    {String(activeIndex + 1).padStart(2, '0')}
                  </span>
                  <span className='text-copy-white/25 text-[10px] leading-none'>·</span>
                  <span className='text-xs text-copy-white/40 tabular-nums leading-none'>
                    {String(count).padStart(2, '0')}
                  </span>
                </div>

                <button
                  onClick={handleNext}
                  className='rounded-md p-2.5 text-copy-white/50 transition-all hover:bg-white/10 hover:text-copy-white active:scale-90'
                  aria-label='Next article'
                >
                  <ChevronRight className='h-4 w-4' />
                </button>
              </div>

              {autoPlay && (
                <div className='h-[3px] w-full bg-white/10'>
                  <motion.div
                    style={{ width: progressWidth }}
                    className='h-full bg-stride-yellow-accent'
                  />
                </div>
              )}
            </div>

            {activeItem.href && (
              <Link
                href={activeItem.href}
                target='_blank'
                rel='noopener noreferrer'
                className='group flex items-center gap-2 rounded-md bg-stride-yellow-accent px-5 py-2.5 text-sm font-semibold text-copy-black transition-all hover:shadow-[0_0_24px_rgba(225,208,63,0.35)] hover:scale-[1.03] active:scale-95'
              >
                Read the article
                <ArrowUpRight className='h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5' />
              </Link>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
