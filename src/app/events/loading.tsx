// Segment-level skeleton — paints instantly on navigation while the events
// list streams in, so link taps never feel dead.
export default function EventsLoading() {
  return (
    <main className='min-h-screen bg-stride-purple-primary pt-28 pb-20'>
      <div className='max-w-6xl mx-auto px-6'>
        <div className='h-12 w-64 rounded-lg bg-white/8 animate-pulse mb-4' />
        <div className='h-5 w-96 max-w-full rounded bg-white/5 animate-pulse mb-10' />
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
