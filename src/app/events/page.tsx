export default function EventsPage() {
  return (
    <main className='min-h-screen pt-24'>
      <section className='container mx-auto px-6 py-16'>
        <h1 className='text-5xl font-bold mb-3'>Events</h1>
        <p className='text-copy-white/60 text-lg mb-12'>
          Races, group runs, and community meetups — all in one place.
        </p>

        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className='bg-copy-white/10 backdrop-blur-md rounded-xl p-6 border border-copy-white/15 hover:border-stride-yellow-accent/50 transition-colors'
            >
              <span className='text-stride-yellow-accent text-xs font-bold uppercase tracking-widest'>
                Upcoming
              </span>
              <h2 className='text-xl font-bold mt-2 mb-1 text-copy-white'>Event Name</h2>
              <p className='text-copy-white/60 text-sm'>Date · Location · Distance</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
