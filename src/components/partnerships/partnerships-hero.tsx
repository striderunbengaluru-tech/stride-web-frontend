'use client'

import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import PartnerWithUsButton from '@/components/partnerships/partner-with-us-button'
import SmoothScrollLink from '@/components/ui/smooth-scroll-link'

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number]

function fadeUp(delay: number) {
  return {
    initial: { opacity: 0, y: 32 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.65, ease, delay },
  }
}

export default function PartnershipsHero() {
  const sectionRef = useRef<HTMLElement>(null)
  const { scrollY } = useScroll()
  const parallaxY = useTransform(scrollY, [0, 300], ['0%', '-8%'])

  return (
    <section ref={sectionRef} className='max-w-5xl mx-auto px-6 pt-6 md:pt-16 pb-20 text-center'>
      {/* Pill badge */}
      <motion.span
        {...fadeUp(0)}
        className='inline-block text-xs font-mono uppercase tracking-widest text-stride-yellow-accent font-medium mb-6 px-3 py-1 rounded-full border border-stride-yellow-accent/30 bg-stride-yellow-accent/10'
      >
        Brand Partnerships
      </motion.span>

      {/* Headline with parallax */}
      <motion.div style={{ y: parallaxY }}>
        <motion.h1
          className='text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-tight mb-6 font-libre'
        >
          <motion.span
            {...fadeUp(0.1)}
            className='block'
          >
            Partner with India&apos;s
          </motion.span>
          <motion.span
            {...fadeUp(0.2)}
            className='block text-stride-yellow-accent'
          >
            fittest community.
          </motion.span>
        </motion.h1>
      </motion.div>

      {/* Description */}
      <motion.p
        {...fadeUp(0.3)}
        className='text-white/60 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed mb-10'
      >
        <span className='font-mono'>52,000+</span> followers. <span className='font-mono'>7,000+</span> athletes. A city moving as one. Stride is Bengaluru&apos;s most engaged running
        community: health-conscious members who show up every week.
      </motion.p>

      {/* CTA row */}
      <motion.div
        {...fadeUp(0.4)}
        className='flex flex-col sm:flex-row gap-4 justify-center items-center'
      >
        <motion.div whileHover={{ scale: 1.03 }}>
          <PartnerWithUsButton />
        </motion.div>
        <SmoothScrollLink
          targetId='why-stride'
          className='inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm'
        >
          See why brands choose Stride
          <ArrowRight size={14} />
        </SmoothScrollLink>
      </motion.div>
    </section>
  )
}
