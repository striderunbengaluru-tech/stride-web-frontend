export default function LeaderboardPage() {
  const placeholderRunners = Array.from({ length: 10 }, (_, i) => ({
    rank: i + 1,
    name: 'Runner Name',
    distance: `${(100 - i * 8).toFixed(1)} km`,
    runs: 12 - i,
  }));

  return (
    <main className='min-h-screen pt-24'>
      <section className='container mx-auto px-6 py-16'>
        <h1 className='text-5xl font-bold mb-3'>Leaderboard</h1>
        <p className='text-copy-white/60 text-lg mb-12'>
          Top runners this month — ranked by total distance.
        </p>

        <div className='bg-copy-white/10 backdrop-blur-md rounded-xl border border-copy-white/15 overflow-hidden'>
          <div className='grid grid-cols-4 px-6 py-3 text-stride-yellow-accent text-xs font-bold uppercase tracking-widest border-b border-copy-white/10'>
            <span>Rank</span>
            <span>Runner</span>
            <span>Distance</span>
            <span>Runs</span>
          </div>

          {placeholderRunners.map((runner) => (
            <div
              key={runner.rank}
              className='grid grid-cols-4 px-6 py-4 border-b border-copy-white/10 hover:bg-copy-white/5 transition-colors last:border-0'
            >
              <span className='text-stride-yellow-accent font-bold'>
                {runner.rank <= 3 ? ['🥇', '🥈', '🥉'][runner.rank - 1] : `#${runner.rank}`}
              </span>
              <span className='text-copy-white font-medium line-clamp-1'>{runner.name}</span>
              <span className='text-copy-white/60'>{runner.distance}</span>
              <span className='text-copy-white/60'>{runner.runs}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
