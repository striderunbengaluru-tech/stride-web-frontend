'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import clsx from 'clsx'
import { SLAY_LOGOS } from '@/content/slay-photos'

/** Past this many pixels the bar gets a backdrop, so it stays legible over photos. */
const SOLID_AFTER_PX = 40

export function SlayHeader() {
  const [solid, setSolid] = useState(false)

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > SOLID_AFTER_PX)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={clsx(
        'fixed inset-x-0 top-0 z-50 transition-colors duration-300',
        solid ? 'bg-slay-ink/80 backdrop-blur-md' : 'bg-transparent',
      )}
    >
      <nav aria-label='Slay Run Club' className='mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-8'>
        <a href='#top' className='flex min-h-11 items-center' aria-label='Slay Run Club, back to top'>
          <Image
            src={SLAY_LOGOS.wordmarkLime.src}
            width={SLAY_LOGOS.wordmarkLime.width}
            height={SLAY_LOGOS.wordmarkLime.height}
            alt=''
            priority
            className='h-9 w-auto sm:h-11'
          />
        </a>
        <a
          href='#join'
          className='inline-flex min-h-11 items-center rounded-full bg-slay-lime px-5 font-slay text-base uppercase tracking-wide text-copy-black transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slay-lime'
        >
          Join now
        </a>
      </nav>
    </header>
  )
}
