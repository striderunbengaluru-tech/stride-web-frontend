// Segment-level skeleton for profile pages. Mirrors the real layout at every
// breakpoint — a single stacked column on mobile and the 1/3 identity card +
// 2/3 content split from `lg:` up — so the shell doesn't reflow when the page
// resolves. Card chrome (radius, border, tint) is copied from the real cards
// and only the contents pulse, which reads calmer than pulsing whole slabs.

function Block({ className }: { className: string }) {
  return <div className={`bg-white/10 animate-pulse ${className}`} aria-hidden='true' />
}

export default function ProfileLoading() {
  return (
    <main className='min-h-screen bg-stride-purple-primary pb-24'>
      <div className='max-w-6xl mx-auto px-4 pt-24 sm:pt-28'>
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-4'>

          {/* ── Identity card (lg: left column) ── */}
          <div className='lg:col-span-1'>
            <div className='h-full bg-white/8 border border-white/10 rounded-2xl px-5 py-6 flex flex-col items-center'>
              <Block className='mt-2 w-36 h-36 sm:w-44 sm:h-44 rounded-lg' />
              <Block className='mt-5 h-7 w-40 rounded-md' />
              <Block className='mt-3 h-4 w-28 rounded' />
              <Block className='mt-4 h-6 w-24 rounded-full' />
              <div className='mt-5 flex gap-2'>
                <Block className='h-9 w-9 rounded-lg' />
                <Block className='h-9 w-9 rounded-lg' />
                <Block className='h-9 w-9 rounded-lg' />
              </div>
            </div>
          </div>

          {/* ── Content column (lg: right, 2/3) ── */}
          <div className='lg:col-span-2 flex flex-col gap-4'>

            {/* Milestone card */}
            <div className='bg-white/8 border border-white/10 rounded-2xl p-5'>
              <div className='flex items-center justify-between mb-5'>
                <Block className='h-3 w-20 rounded' />
                <Block className='h-3 w-32 rounded' />
              </div>
              <div className='flex items-end justify-between gap-4 mb-5'>
                <div className='min-w-0'>
                  <Block className='h-11 w-36 rounded-md' />
                  <Block className='mt-3 h-3 w-44 rounded' />
                </div>
                <Block className='h-7 w-28 rounded-full shrink-0' />
              </div>
              <Block className='h-1.5 w-full rounded-full' />
              <div className='grid grid-cols-5 gap-1.5 mt-5'>
                {Array.from({ length: 5 }, (_, i) => (
                  <Block key={i} className='h-16 rounded-xl' />
                ))}
              </div>
            </div>

            {/* About */}
            <div className='bg-white/8 border border-white/10 rounded-2xl p-5'>
              <Block className='h-3 w-16 rounded' />
              <Block className='mt-4 h-4 w-full rounded' />
              <Block className='mt-2 h-4 w-11/12 rounded' />
              <Block className='mt-2 h-4 w-3/5 rounded' />
            </div>

            {/* Specialties */}
            <div className='bg-white/8 border border-white/10 rounded-2xl p-5'>
              <Block className='h-3 w-24 rounded' />
              <div className='mt-4 flex flex-wrap gap-2'>
                {['w-24', 'w-20', 'w-28', 'w-16', 'w-24'].map((w, i) => (
                  <Block key={i} className={`h-7 ${w} rounded-full`} />
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </main>
  )
}
