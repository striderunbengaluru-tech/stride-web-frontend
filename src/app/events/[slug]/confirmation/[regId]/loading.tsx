// Segment-level skeleton for the booking confirmation page. Without this the
// route inherited the event-detail skeleton from ../../loading.tsx, which is a
// poster-left / content-right layout and looks nothing like this page — loading
// UI should mirror the final UI so the swap doesn't read as a re-render.
//
// Mirrors: success badge, event poster card, then stacked "next steps" blocks.
export default function ConfirmationLoading() {
  return (
    <main className='relative min-h-screen bg-stride-purple-primary ambient-glow pb-20'>
      <div className='relative z-10 pt-28 sm:pt-32'>
        <div className='max-w-2xl mx-auto px-5 sm:px-8 space-y-7'>

          {/* Success badge + heading */}
          <div className='flex flex-col items-center'>
            <div className='w-16 h-16 rounded-full bg-green-500/20 border border-green-500/40 animate-pulse mb-5' />
            <div className='h-9 w-64 rounded-lg bg-white/8 animate-pulse' />
            <div className='h-4 w-44 rounded bg-white/5 animate-pulse mt-3' />
          </div>

          {/* Event poster card — 3:4 to match the real one so nothing shifts */}
          <div className='rounded-md border border-white/10 bg-white/4 overflow-hidden'>
            <div className='w-full aspect-3/4 bg-white/5 animate-pulse' />
            <div className='px-4 py-4 space-y-2.5'>
              <div className='h-4 w-36 rounded bg-white/8 animate-pulse' />
              <div className='h-6 w-3/4 rounded bg-white/8 animate-pulse' />
              <div className='h-4 w-1/2 rounded bg-white/5 animate-pulse' />
            </div>
          </div>

          {/* "Here's your next steps" heading + action blocks */}
          <div className='h-6 w-52 rounded bg-white/8 animate-pulse' />
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
            <div className='h-12 rounded-md bg-white/8 animate-pulse' />
            <div className='h-12 rounded-md bg-white/8 animate-pulse' />
          </div>
          <div className='h-12 rounded-md bg-white/8 animate-pulse' />

          {/* Stride tag card */}
          <div className='h-40 rounded-2xl bg-white/8 animate-pulse' />
        </div>
      </div>
    </main>
  )
}
