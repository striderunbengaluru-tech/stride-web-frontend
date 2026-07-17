import Image from 'next/image'

// The logo is a local static SVG served from our own origin (CDN-cached,
// preloaded via `priority`), so it paints in the very first render — no
// loading gate needed. The previous Supabase-hosted version needed an
// opacity-until-loaded guard against a dark loading box, which also made the
// logo hydration-bound and dragged mobile LCP to ~6.5s.
export function NavbarLogo() {
  return (
    <Image
      src='/assets/images/stride-logo-color-transparent.svg'
      alt='Stride Run Club'
      width={110}
      height={36}
      className='object-contain'
      priority
      unoptimized
    />
  )
}
