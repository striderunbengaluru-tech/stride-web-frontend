'use client'

import { useRef, type ReactNode } from 'react'
import { motion, useMotionValue, useMotionTemplate } from 'framer-motion'

type SpotlightCardProps = {
  children: ReactNode
  className?: string
  spotlightColor?: string
}

export function SpotlightCard({
  children,
  className,
  spotlightColor = 'rgba(225,208,63,0.08)',
}: SpotlightCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const mouseX = useMotionValue(-999)
  const mouseY = useMotionValue(-999)

  const background = useMotionTemplate`radial-gradient(350px circle at ${mouseX}px ${mouseY}px, ${spotlightColor}, transparent 70%)`

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    mouseX.set(e.clientX - rect.left)
    mouseY.set(e.clientY - rect.top)
  }

  function handleMouseLeave() {
    mouseX.set(-999)
    mouseY.set(-999)
  }

  return (
    <div
      ref={ref}
      className={className}
      style={{ position: 'relative' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <motion.div
        className='pointer-events-none absolute inset-0 rounded-xl z-0'
        style={{ background }}
      />
      <div className='relative z-10'>{children}</div>
    </div>
  )
}
