// Segment-level skeleton for profile pages — avatar + name block + cards.
export default function ProfileLoading() {
  return (
    <main className='min-h-screen bg-stride-purple-primary pt-28 pb-20'>
      <div className='max-w-3xl mx-auto px-4 sm:px-6'>
        <div className='flex flex-col items-center'>
          <div className='w-28 h-28 rounded-full bg-white/8 animate-pulse' />
          <div className='h-8 w-56 rounded-lg bg-white/8 animate-pulse mt-5' />
          <div className='h-4 w-40 rounded bg-white/5 animate-pulse mt-3' />
        </div>
        <div className='mt-8 space-y-4'>
          <div className='h-32 rounded-2xl bg-white/5 animate-pulse' />
          <div className='h-44 rounded-2xl bg-white/5 animate-pulse' />
          <div className='h-44 rounded-2xl bg-white/5 animate-pulse' />
        </div>
      </div>
    </main>
  )
}
