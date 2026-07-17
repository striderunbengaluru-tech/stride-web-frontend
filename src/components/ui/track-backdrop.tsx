// Decorative run-club backdrop shared by the events pages: track-lane arcs
// sweeping in from a corner (the bend of a 400m track), a dashed route line
// with start and finish markers, a vignette, and film grain. Replaces the old
// blurred gradient orbs. Purely decorative — no motion, no requests.
export function TrackBackdrop() {
  return (
    <div className='pointer-events-none absolute inset-0 overflow-hidden' aria-hidden='true'>
      {/* Track bend — bottom right */}
      <svg
        className='absolute -right-40 -bottom-56 w-[34rem] sm:w-[52rem] h-auto'
        viewBox='0 0 800 800'
        fill='none'
      >
        {[240, 306, 372, 438, 504, 570, 636, 702, 768].map((r) => (
          <circle key={r} cx='800' cy='800' r={r} stroke='white' strokeOpacity='0.06' strokeWidth='1.5' />
        ))}
        <g className='text-stride-yellow-accent'>
          <circle cx='800' cy='800' r='537' stroke='currentColor' strokeOpacity='0.28' strokeWidth='2' strokeDasharray='4 16' strokeLinecap='round' />
        </g>
      </svg>

      {/* Route line — start dot to finish marker, like a run route on a map */}
      <svg
        className='absolute -left-24 top-20 w-[34rem] sm:w-[46rem] h-auto'
        viewBox='0 0 700 260'
        fill='none'
      >
        <path
          d='M20 210 C 140 120, 240 250, 360 160 S 560 40, 680 80'
          stroke='white'
          strokeOpacity='0.09'
          strokeWidth='1.5'
          strokeDasharray='2 10'
          strokeLinecap='round'
        />
        <circle cx='20' cy='210' r='5' fill='white' fillOpacity='0.14' />
        <g className='text-stride-yellow-accent' opacity='0.35'>
          <circle cx='680' cy='80' r='3.5' fill='currentColor' />
          <circle cx='680' cy='80' r='10' stroke='currentColor' strokeWidth='1.5' />
        </g>
      </svg>

      {/* Vignette — pulls focus toward the content */}
      <div className='absolute inset-0 bg-[radial-gradient(120%_120%_at_50%_35%,transparent_55%,rgba(1,1,1,0.32)_100%)]' />

      {/* Film grain */}
      <div
        className='absolute inset-0 opacity-[0.05]'
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
    </div>
  )
}
