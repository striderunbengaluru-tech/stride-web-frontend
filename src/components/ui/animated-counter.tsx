'use client'

import { useEffect, useRef, useState } from 'react'
import { useMotionValue, useSpring, useInView } from 'framer-motion'

type AnimatedCounterProps = {
  to: number
  suffix?: string
  formatLocale?: boolean
  className?: string
}

export function AnimatedCounter({ to, suffix = '', formatLocale = false, className }: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const motionValue = useMotionValue(0)
  const spring = useSpring(motionValue, { stiffness: 50, damping: 15, restDelta: 0.001 })
  const [display, setDisplay] = useState('0')

  useEffect(() => {
    if (inView) {
      motionValue.set(to)
    }
  }, [inView, to, motionValue])

  useEffect(() => {
    const unsubscribe = spring.on('change', (v) => {
      const rounded = Math.round(v)
      setDisplay(formatLocale ? rounded.toLocaleString() : String(rounded))
    })
    return unsubscribe
  }, [spring, formatLocale])

  return (
    <span ref={ref} className={className}>
      {display}{suffix}
    </span>
  )
}
