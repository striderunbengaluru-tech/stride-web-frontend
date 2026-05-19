'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const BG_IMAGES = Array.from(
  { length: 9 },
  (_, i) =>
    `https://ienotcjldormdxrzukpk.supabase.co/storage/v1/object/public/stride-assets/images/web-assets/newsroom-${i + 1}.webp`
);

export function HeroBgSlideshow() {
  const [index, setIndex] = React.useState(0);

  React.useEffect(() => {
    const timer = setInterval(
      () => setIndex((i) => (i + 1) % BG_IMAGES.length),
      1400
    );
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      {/* Preload all images silently */}
      {BG_IMAGES.map((src) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={src} src={src} alt='' className='hidden' aria-hidden='true' />
      ))}

      <AnimatePresence>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <motion.img
          key={index}
          src={BG_IMAGES[index]}
          alt=''
          aria-hidden='true'
          className='absolute inset-0 w-full h-full object-cover'
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7, ease: 'easeInOut' }}
        />
      </AnimatePresence>
    </>
  );
}
