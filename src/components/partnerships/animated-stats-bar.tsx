'use client'

import { motion } from 'framer-motion'
import { AnimatedCounter } from '@/components/ui/animated-counter'

const STATS = [
  { to: 55,    suffix: 'K+', formatLocale: false, label: 'Instagram Followers' },
  { to: 7,     suffix: 'K+', formatLocale: false, label: 'WhatsApp Community'  },
  { to: 10000, suffix: '+',  formatLocale: true,  label: 'Athletes Impacted'   },
  { to: 97,   suffix: '+',  formatLocale: false, label: 'Events per Year'     },
  { to: 55,   suffix: '+',  formatLocale: false, label: 'Brand Partners'      },
]

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number]

const fade = (delay = 0) => ({
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: EASE, delay },
  },
})

export default function AnimatedStatsBar() {
  return (
    <motion.div
      initial='hidden'
      whileInView='show'
      viewport={{ once: true, margin: '-60px' }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0 } } }}
      className='border-t border-white/10'
    >
      {/* Eyebrow */}
      <motion.p
        variants={fade(0)}
        className='text-xs font-mono uppercase tracking-[0.25em] text-stride-yellow-accent pt-10 mb-12 text-center'
      >
        By the numbers
      </motion.p>

      {/* Stat grid — one row from lg up. At 36px "10,000+" fits this
          page's narrower columns; 48px pushed the last stat onto a second row. */}
      <div className='flex flex-wrap lg:flex-nowrap justify-center'>
        {STATS.map(({ to, suffix, formatLocale, label }, i) => (
          <motion.div
            key={label}
            variants={fade(0.06 + i * 0.07)}
            className='flex flex-col items-center text-center py-6 px-3 basis-1/2 sm:basis-1/3 lg:flex-1 lg:basis-0 lg:min-w-0'
          >
            <AnimatedCounter
              to={to}
              suffix={suffix}
              formatLocale={formatLocale}
              className='text-4xl font-bold text-white tabular-nums font-mono leading-none whitespace-nowrap'
            />
            <div className='w-6 h-px bg-stride-yellow-accent/50 my-3' />
            <p className='text-white/55 text-xs font-mono uppercase tracking-[0.12em] leading-snug text-balance'>{label}</p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
