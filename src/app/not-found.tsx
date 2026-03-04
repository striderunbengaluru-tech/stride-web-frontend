import Link from 'next/link'

export default function NotFound() {
  return (
    <main className='min-h-screen flex flex-col items-center justify-center gap-8 px-6 text-center'>
      {/* Large number */}
      <div className='relative select-none'>
        <span className='text-[8rem] sm:text-[12rem] font-bold leading-none text-white/5 select-none'>
          404
        </span>
        <span className='absolute inset-0 flex items-center justify-center text-4xl sm:text-5xl font-bold text-stride-yellow-accent'>
          404
        </span>
      </div>

      {/* Running track illustration */}
      <div className='flex items-center gap-1 opacity-40' aria-hidden='true'>
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className='h-0.5 bg-white/30 rounded-full'
            style={{ width: i % 3 === 0 ? '20px' : '8px' }}
          />
        ))}
        <span className='text-xl ml-1'>🏃</span>
      </div>

      <div className='max-w-md'>
        <h1 className='text-2xl font-bold text-white mb-3'>You ran off the map!</h1>
        <p className='text-white/50 text-base leading-relaxed'>
          This page doesn&apos;t exist. Maybe it took a wrong turn at the last checkpoint.
          Head back to the start line.
        </p>
      </div>

      <Link
        href='/'
        className='bg-stride-yellow-accent text-copy-black font-bold px-8 py-3 rounded-md hover:opacity-90 transition-opacity min-h-11 flex items-center gap-2'
      >
        <span>Back to Home</span>
      </Link>
    </main>
  )
}
