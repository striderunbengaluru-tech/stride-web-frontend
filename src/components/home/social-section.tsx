const InstagramIcon = () => (
  <svg viewBox='0 0 24 24' fill='currentColor' className='size-5 shrink-0' aria-hidden='true'>
    <path d='M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z' />
  </svg>
)

const StravaIcon = () => (
  <svg viewBox='0 0 24 24' fill='currentColor' className='size-5 shrink-0' aria-hidden='true'>
    <path d='M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169' />
  </svg>
)

export default function SocialSection() {
  return (
    <section className='py-14 md:py-20 px-6'>
      <div className='mx-auto max-w-3xl text-center'>
        <p className='text-xs uppercase tracking-widest text-copy-white/40 font-medium mb-4'>
          Join the movement
        </p>
        <p className='text-copy-white/60 text-base md:text-lg mb-10'>
          5,754 runners. 97 runs. Every week of 2025.
        </p>

        <div className='flex flex-col sm:flex-row items-center justify-center gap-4'>
          <a
            href='https://www.instagram.com/stride_runclub_bengaluru/'
            target='_blank'
            rel='noopener noreferrer'
            className='flex items-center gap-2.5 px-7 py-3.5 rounded-md border border-copy-white/30 text-copy-white font-semibold hover:bg-copy-white/10 hover:border-copy-white/50 transition-all duration-200 w-full sm:w-auto justify-center'
          >
            <InstagramIcon />
            Follow on Instagram
          </a>
          <a
            href='https://strava.app.link/eFnB8k3rw2b'
            target='_blank'
            rel='noopener noreferrer'
            className='flex items-center gap-2.5 px-7 py-3.5 rounded-md border border-copy-white/30 text-copy-white font-semibold hover:bg-orange-500/10 hover:border-orange-500/50 hover:text-orange-500 transition-all duration-200 w-full sm:w-auto justify-center'
          >
            <StravaIcon />
            Join our Strava Club
          </a>
        </div>
      </div>
    </section>
  )
}
