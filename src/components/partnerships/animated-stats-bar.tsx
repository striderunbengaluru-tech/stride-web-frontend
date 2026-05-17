'use client'

import { motion } from 'framer-motion'
import { Share2, MessageCircle, Users, Calendar, Building2 } from 'lucide-react'
import { AnimatedCounter } from '@/components/ui/animated-counter'

const STATS = [
  { Icon: Share2,        to: 52,   suffix: 'K+', formatLocale: false, label: 'Instagram Followers' },
  { Icon: MessageCircle, to: 6,    suffix: 'K+', formatLocale: false, label: 'WhatsApp Community'  },
  { Icon: Users,         to: 6894, suffix: '',   formatLocale: true,  label: 'Runners Impacted'    },
  { Icon: Calendar,      to: 97,   suffix: '+',  formatLocale: false, label: 'Events per Year'     },
  { Icon: Building2,     to: 55,   suffix: '+',  formatLocale: false, label: 'Brand Partners'      },
]

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
}

export default function AnimatedStatsBar() {
  return (
    <motion.div
      className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4'
      initial='hidden'
      whileInView='show'
      viewport={{ once: true, margin: '-60px' }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
    >
      {STATS.map(({ Icon, to, suffix, formatLocale, label }, i) => (
        <motion.div
          key={label}
          variants={cardVariants}
          className={`bg-white/10 backdrop-blur-md border border-white/15 rounded-xl p-5 text-center${i === 4 ? ' col-span-2 sm:col-span-1' : ''}`}
        >
          <Icon size={18} className='text-stride-yellow-accent mx-auto mb-2' />
          <AnimatedCounter
            to={to}
            suffix={suffix}
            formatLocale={formatLocale}
            className='text-3xl font-bold text-white tabular-nums'
          />
          <p className='text-white/45 text-xs mt-1'>{label}</p>
        </motion.div>
      ))}
    </motion.div>
  )
}
