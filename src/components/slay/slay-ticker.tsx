const WORDS = ['Slay every move', 'Social runs', 'Fitness experiences', 'Curated workshops', 'Women only'] as const

/**
 * A decorative lime band between sections. Two copies, so the loop is seamless.
 *
 * Tilted, so the band is wider than the screen (no bare corners at either end)
 * and stacked above its neighbours (the next section would otherwise paint over
 * its lower edge).
 */
export function SlayTicker() {
  return (
    <div aria-hidden className='relative z-10 -my-6 sm:-my-10'>
      <div className='-mx-[4vw] w-[108vw] -rotate-2 overflow-hidden border-y-2 border-copy-black bg-slay-lime py-3 text-copy-black sm:py-4'>
        <div className='slay-ticker flex w-max'>
          {[0, 1].map((copy) => (
            <ul key={copy} className='flex shrink-0 items-center'>
              {WORDS.map((word) => (
                <li key={word} className='flex items-center font-slay text-2xl uppercase tracking-wide sm:text-4xl'>
                  <span className='px-5'>{word}</span>
                  <span className='text-slay-pink'>✦</span>
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </div>
  )
}
