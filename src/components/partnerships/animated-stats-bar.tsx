'use client'

import { motion } from 'framer-motion'
import { AnimatedCounter } from '@/components/ui/animated-counter'

const STATS = [
  { to: 52,   suffix: 'K+', formatLocale: false, label: 'Instagram Followers' },
  { to: 6,    suffix: 'K+', formatLocale: false, label: 'WhatsApp Community'  },
  { to: 6894, suffix: '',   formatLocale: true,  label: 'Runners Impacted'    },
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
        className='text-xs uppercase tracking-[0.25em] text-stride-yellow-accent font-roboto pt-10 mb-12 text-center'
      >
        By the numbers
      </motion.p>

      {/* Stat grid */}
      <div className='flex flex-wrap justify-center'>
        {STATS.map(({ to, suffix, formatLocale, label }, i) => (
          <motion.div
            key={label}
            variants={fade(0.06 + i * 0.07)}
            className='flex flex-col items-center text-center py-6 basis-1/2 sm:basis-1/3 lg:basis-1/5'
          >
            <AnimatedCounter
              to={to}
              suffix={suffix}
              formatLocale={formatLocale}
              className='text-4xl lg:text-5xl font-bold text-white tabular-nums font-libre leading-none'
            />
            <div className='w-6 h-px bg-stride-yellow-accent/50 my-3' />
            <p className='text-white/55 text-xs uppercase tracking-[0.12em] font-roboto'>{label}</p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
