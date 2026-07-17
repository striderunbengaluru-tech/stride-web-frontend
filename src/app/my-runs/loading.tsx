// Segment-level skeleton for My Runs — title + tabs + list rows.
export default function MyRunsLoading() {
  return (
    <main className='min-h-screen bg-stride-purple-primary'>
      <section className='max-w-3xl mx-auto px-4 sm:px-6 pt-28 pb-24'>
        <div className='h-14 w-64 rounded-lg bg-white/8 animate-pulse' />
        <div className='h-5 w-80 max-w-full rounded bg-white/5 animate-pulse mt-4 mb-10' />
        <div className='h-12 w-56 rounded-2xl bg-white/5 animate-pulse mb-8' />
        <div className='space-y-3.5'>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className='h-28 rounded-2xl bg-white/5 animate-pulse' />
          ))}
        </div>
      </section>
    </main>
  )
}
