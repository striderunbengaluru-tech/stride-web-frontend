'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'

// Desktop-navbar Become-a-Member CTA. On the homepage the hero already shows
// the same CTA in the first fold, so the navbar copy stays collapsed until the
// visitor scrolls the first fold out of view (and collapses again if they
// scroll back up) — the CTA never appears twice on screen. Every other page
// shows it immediately. Collapsing max-width (not just opacity) lets the
// Partner With Us button slide over smoothly instead of jumping.
const FIRST_FOLD_RATIO = 0.9

export function NavbarMemberCta() {
  const pathname = usePathname()
  const [pastFirstFold, setPastFirstFold] = useState(false)

  useEffect(() => {
    function onScroll() {
      setPastFirstFold(window.scrollY >= window.innerHeight * FIRST_FOLD_RATIO)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const visible = pathname !== '/' || pastFirstFold

  return (
    <div
      aria-hidden={!visible}
      className={clsx(
        'overflow-hidden transition-[max-width,opacity,transform] duration-500 ease-out motion-reduce:transition-none',
        visible
          ? 'max-w-60 opacity-100 translate-y-0'
          : 'max-w-0 opacity-0 -translate-y-1 pointer-events-none'
      )}
    >
      <Link
        href='/become-a-member'
        tabIndex={visible ? undefined : -1}
        className='inline-flex items-center whitespace-nowrap ml-2.5 bg-stride-yellow-accent text-copy-black font-bold px-4 py-2 rounded-md text-sm hover:scale-[1.03] hover:shadow-lg hover:shadow-stride-yellow-accent/25 active:scale-[0.97] transition-all duration-150'
      >
        Become a Member
      </Link>
    </div>
  )
}
