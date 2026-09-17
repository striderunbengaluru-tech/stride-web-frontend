// Segment-level skeleton — paints instantly on navigation while the calendar
// streams in. Mirrors the header, the view toggle, the filter row and the grid.
export default function RaceCalendarLoading() {
  return (
    <main className='min-h-screen bg-stride-purple-primary pt-32 pb-24'>
      <div className='max-w-6xl mx-auto px-6'>
        <div className='h-14 w-72 max-w-full rounded-lg bg-white/8 animate-pulse mb-5' />
        <div className='h-5 w-96 max-w-full rounded bg-white/5 animate-pulse mb-12' />
        <div className='h-14 w-52 rounded-2xl bg-white/5 animate-pulse mb-6' />
        <div className='flex gap-2 mb-10 overflow-hidden'>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className='h-11 w-24 shrink-0 rounded-md bg-white/5 animate-pulse' />
          ))}
        </div>
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10'>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className='rounded-md border border-white/10 overflow-hidden'>
              <div className='aspect-3/4 bg-white/5 animate-pulse' />
              <div className='p-4 space-y-2.5'>
                <div className='h-4 w-28 rounded bg-white/8 animate-pulse' />
                <div className='h-6 w-3/4 rounded bg-white/8 animate-pulse' />
                <div className='h-4 w-1/2 rounded bg-white/5 animate-pulse' />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
