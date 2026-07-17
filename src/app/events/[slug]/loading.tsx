// Segment-level skeleton mirroring the event detail layout (poster left,
// content right on desktop; stacked on mobile).
export default function EventDetailLoading() {
  return (
    <main className='min-h-screen bg-stride-purple-primary pb-32 sm:pb-20'>
      <div className='lg:flex lg:pt-28 lg:max-w-6xl lg:mx-auto lg:gap-10 lg:px-6'>
        <div className='w-full lg:w-[42%] shrink-0 pt-24 lg:pt-0 px-5 lg:px-0'>
          <div className='w-full aspect-3/4 rounded-md bg-white/5 animate-pulse' />
        </div>
        <div className='flex-1 min-w-0 px-5 sm:px-8 lg:px-0 pt-6 lg:pt-0 space-y-4'>
          <div className='h-10 w-3/4 rounded-lg bg-white/8 animate-pulse' />
          <div className='h-5 w-1/2 rounded bg-white/5 animate-pulse' />
          <div className='h-24 rounded-2xl bg-white/5 animate-pulse mt-6' />
          <div className='h-40 rounded-2xl bg-white/5 animate-pulse' />
        </div>
      </div>
    </main>
  )
}
