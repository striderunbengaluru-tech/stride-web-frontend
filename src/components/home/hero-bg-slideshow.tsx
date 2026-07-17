'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const BG_BASE =
  'https://ienotcjldormdxrzukpk.supabase.co/storage/v1/object/public/stride-assets/images/web-assets';

// Ordered lightest-first (by file size) so the eager-loaded openers are the
// cheapest ones and the page paints fast with minimal egress. newsroom-1 is
// ~12.8 MB, so it cycles last and is the final image in the lazy preload queue.
const BG_IMAGES = [3, 2, 5, 4, 7, 6, 8, 9, 1].map(
  (n) => `${BG_BASE}/newsroom-${n}.webp`
);

const CYCLE_MS = 1000;
// Hold the first slide before cycling starts — keeps the opening viewport
// stable while the page loads (better LCP, no continuous repaint during
// startup), then the fast 1s montage kicks in.
const CYCLE_START_DELAY_MS = 3000;
// Only the first two slides load eagerly (they cover the first cycle); the
// rest are fetched in the background at low priority so they never compete
// with the page's first paint.
const EAGER_COUNT = 2;

// Blur-up placeholder: a 24px-wide copy of newsroom-3.webp (the first slide)
// inlined as a data URI (~323 bytes, renders instantly with zero network).
// Shown blurred under the slideshow so there's never a bare purple gap while
// a slide loads.
const HERO_LQIP =
  'data:image/webp;base64,UklGRtgAAABXRUJQVlA4IMwAAACwBACdASoYABAAPu1iqU2ppaQiMAgBMB2JYgC06Yu43rGPzn9F5PcIu+8BDMAAAP7sngBzZ8aq+LpGLB+A/IXo2iH7lO4+3BqPAWh26sIdYlbcseJSMDRdIxUe0I6Q86IuB2X+kaqf3H/CdbKsIw8o3/7s9lx5gmHTuWnXMmf486hjnZTReHMTj9cRxO/+khHJ9cNM8q0YsIcFiEE57iiFZb6ApX1FpMUsz8RSPGIjtVl8CRqvrwGQHDko6xE8aLJP+px9xqzlDM81AAA=';

export function HeroBgSlideshow() {
  const [index, setIndex] = React.useState(0);
  // Slides fade in only once their bytes have arrived — until then the
  // blurred placeholder (or the previous slide) stays visible underneath.
  const [loadedSrcs, setLoadedSrcs] = React.useState<Set<string>>(() => new Set());

  const markLoaded = React.useCallback((src: string) => {
    setLoadedSrcs((prev) => {
      if (prev.has(src)) return prev;
      const next = new Set(prev);
      next.add(src);
      return next;
    });
  }, []);

  React.useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    const startTimer = setTimeout(() => {
      interval = setInterval(
        () => setIndex((i) => (i + 1) % BG_IMAGES.length),
        CYCLE_MS
      );
    }, CYCLE_START_DELAY_MS);
    return () => {
      clearTimeout(startTimer);
      if (interval) clearInterval(interval);
    };
  }, []);

  // Background-preload the remaining slides after mount, marked low priority
  // so the browser schedules them behind everything the first fold needs.
  React.useEffect(() => {
    BG_IMAGES.slice(EAGER_COUNT).forEach((src) => {
      const img = new window.Image();
      img.setAttribute('fetchpriority', 'low');
      img.src = src;
    });
  }, []);

  return (
    <>
      {/* Eager preload — first two slides only */}
      {BG_IMAGES.slice(0, EAGER_COUNT).map((src) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={src} src={src} alt='' className='hidden' aria-hidden='true' fetchPriority='high' />
      ))}

      {/* Blurred placeholder base layer — instantly visible, covered as soon
          as the first real slide fades in over it */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={HERO_LQIP}
        alt=''
        aria-hidden='true'
        className='absolute inset-0 w-full h-full object-cover blur-2xl scale-110'
      />

      {/* Static first slide — always visible, no JS/hydration gate, so it
          paints the moment its bytes arrive (this is the homepage LCP). The
          animated stack below renders the same image on top once hydrated. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={BG_IMAGES[0]}
        alt=''
        aria-hidden='true'
        fetchPriority='high'
        className='absolute inset-0 w-full h-full object-cover'
      />

      <AnimatePresence>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <motion.img
          key={index}
          src={BG_IMAGES[index]}
          alt=''
          aria-hidden='true'
          ref={(img) => {
            // Cached images can complete before onLoad is attached
            if (img?.complete && img.naturalWidth > 0) markLoaded(img.src);
          }}
          onLoad={(e) => markLoaded(e.currentTarget.src)}
          className='absolute inset-0 w-full h-full object-cover'
          initial={{ opacity: 0 }}
          animate={{ opacity: loadedSrcs.has(BG_IMAGES[index]) ? 1 : 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7, ease: 'easeInOut' }}
        />
      </AnimatePresence>
    </>
  );
}
