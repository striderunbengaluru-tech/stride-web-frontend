'use client'

import { Target, Video, Zap, Heart } from 'lucide-react'
import { motion } from 'framer-motion'
import { SpotlightCard } from '@/components/ui/spotlight-card'
import type { WhyUsItem } from '@/app/partnerships/partners-data'

const ICONS = [Target, Video, Zap, Heart]

type AnimatedWhyUsProps = {
  items: WhyUsItem[]
}

export default function AnimatedWhyUs({ items }: AnimatedWhyUsProps) {
  return (
    <div className='grid grid-cols-1 sm:grid-cols-2 gap-5'>
      {items.map((item, index) => {
        const Icon = ICONS[index]
        return (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: index * 0.1 }}
          >
            <SpotlightCard className='relative bg-white/5 border border-white/10 rounded-xl p-7 hover:border-stride-yellow-accent/25 hover:bg-white/10 transition-all group overflow-hidden flex flex-col h-full'>
              <div className='absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-stride-yellow-accent/50 to-transparent' />
              <span className='absolute top-5 right-6 text-6xl font-bold text-white/4 font-mono leading-none select-none pointer-events-none'>
                {String(index + 1).padStart(2, '0')}
              </span>

              <div className='w-11 h-11 rounded-lg bg-stride-yellow-accent/10 border border-stride-yellow-accent/20 flex items-center justify-center mb-5 group-hover:bg-stride-yellow-accent/15 group-hover:border-stride-yellow-accent/40 transition-colors'>
                <Icon size={20} className='text-stride-yellow-accent' />
              </div>

              <h3 className='font-libre text-white font-bold text-xl mb-3'>{item.title}</h3>
              <p className='text-white/55 text-sm leading-relaxed'>{item.body}</p>

              {item.badges && (
                <div className='flex flex-wrap gap-2 mt-4'>
                  {item.badges.map((badge) => (
                    <span
                      key={badge}
                      className='text-[11px] px-3 py-1 rounded-full bg-stride-yellow-accent/10 border border-stride-yellow-accent/20 text-stride-yellow-accent/80 font-medium'
                    >
                      {badge}
                    </span>
                  ))}
                </div>
              )}

              {item.brandLabel && (
                <div className='mt-4'>
                  <span className='inline-block text-xs px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-white/70 font-semibold tracking-wide'>
                    {item.brandLabel}
                  </span>
                </div>
              )}
            </SpotlightCard>
          </motion.div>
        )
      })}
    </div>
  )
}
