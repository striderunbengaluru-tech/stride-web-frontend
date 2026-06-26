'use client'

import { motion } from 'framer-motion'
import { Mail, Phone, ArrowUpRight } from 'lucide-react'

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg viewBox='0 0 24 24' fill='currentColor' className={className} aria-hidden='true'>
    <path d='M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z' />
  </svg>
)

const contacts = [
  {
    icon: Mail,
    channel: 'Email',
    display: 'striderunclubbengaluru@gmail.com',
    href: 'mailto:striderunclubbengaluru@gmail.com',
    external: false,
  },
  {
    icon: Phone,
    channel: 'Phone',
    display: '+91 83688 77289',
    href: 'tel:+918368877289',
    external: false,
  },
  {
    icon: InstagramIcon,
    channel: 'Instagram',
    display: '@stride_runclub_bengaluru',
    href: 'https://www.instagram.com/stride_runclub_bengaluru/',
    external: true,
  },
]

export function ContactContent() {
  return (
    <div className='max-w-2xl mx-auto px-6 pt-36 pb-24 text-center'>

      {/* Heading — one line, centered */}
      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className='text-6xl sm:text-8xl font-bold text-white leading-none tracking-tight whitespace-nowrap'
      >
        Let&apos;s <span className='text-stride-yellow-accent'>talk.</span>
      </motion.h1>

      {/* Sub-copy */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.14 }}
        className='text-white/40 text-base leading-relaxed mt-6 mb-16 mx-auto max-w-xs'
      >
        Questions, partnerships, or just want to run with us — we&apos;re easy to reach.
      </motion.p>

      {/* Contact rows */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.24 }}
        className='border-t border-white/10 text-left'
      >
        {contacts.map(({ icon: Icon, channel, display, href, external }, i) => (
          <motion.a
            key={channel}
            href={href}
            target={external ? '_blank' : undefined}
            rel={external ? 'noopener noreferrer' : undefined}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.3 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
            className='group flex items-center justify-between py-6 border-b border-white/10 hover:border-white/20 transition-colors duration-200'
          >
            <div className='flex items-center gap-5'>
              <Icon className='w-5 h-5 text-white/30 group-hover:text-stride-yellow-accent transition-colors duration-200 shrink-0' />
              <span className='text-white text-base sm:text-lg font-medium group-hover:text-stride-yellow-accent transition-colors duration-200'>
                {display}
              </span>
            </div>
            <ArrowUpRight
              size={15}
              className='text-white/15 shrink-0 group-hover:text-stride-yellow-accent group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-200'
            />
          </motion.a>
        ))}
      </motion.div>

    </div>
  )
}
