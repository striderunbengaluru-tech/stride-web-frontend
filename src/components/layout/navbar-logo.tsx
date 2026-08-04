import Image from 'next/image'

// The logo is a local static raster served from our own origin (CDN-cached,
// preloaded via `priority`), so it paints in the very first render — no
// loading gate needed. The previous Supabase-hosted version needed an
// opacity-until-loaded guard against a dark loading box, which also made the
// logo hydration-bound and dragged mobile LCP to ~6.5s.
//
// It used to be an `.svg`, but that file was a Figma export that only wrapped a
// base64 PNG in `<rect fill="url(#pattern)">`. iOS Safari intermittently fails
// to resolve that paint server and falls back to the initial fill — painting
// the logo as a solid black box.
export function NavbarLogo() {
  return (
    <Image
      src='/assets/images/stride-logo-color-transparent.webp'
      alt='Stride Run Club'
      width={110}
      height={36}
      className='object-contain'
      priority
    />
  )
}
