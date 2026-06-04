'use client'

import { motion } from 'framer-motion'
import { Zap } from 'lucide-react'

type Props = {
  bullets: string[]
}

export function TldrBlock({ bullets }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
      className='bg-stride-yellow-accent/8 border border-stride-yellow-accent/20 rounded-2xl px-6 py-5 my-8'
    >
      <div className='flex items-center gap-2 mb-4'>
        <Zap className='w-4 h-4 text-stride-yellow-accent' fill='currentColor' />
        <span className='text-xs font-mono uppercase tracking-[0.22em] text-stride-yellow-accent font-semibold'>
          TL;DR
        </span>
      </div>
      <ul className='flex flex-col gap-2.5'>
        {bullets.map((bullet, i) => (
          <motion.li
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: 0.35 + i * 0.07 }}
            className='flex items-start gap-2.5 text-sm text-white/75 font-figtree leading-relaxed'
          >
            <span className='shrink-0 mt-1.5 w-1 h-1 rounded-full bg-stride-yellow-accent' />
            {bullet}
          </motion.li>
        ))}
      </ul>
    </motion.div>
  )
}
