'use client'

import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { useGSAP } from '@gsap/react'

// Registered here, and imported only by the /join-slay islands, so GSAP lands in
// that route's chunk and never in the shared bundle.
gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP)

/** Every effect is built inside this query; reduced-motion visitors get the static layout. */
export const MOTION_OK = '(prefers-reduced-motion: no-preference)'

export { gsap, ScrollTrigger, SplitText, useGSAP }
