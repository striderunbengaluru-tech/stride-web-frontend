import InstagramEmbed from '@/components/partnerships/instagram-embed'
import { SPOTLIGHTS } from '@/content/spotlights'

export default function SpotlightSection() {
  return (
    <section className='py-14 md:py-20 px-6'>
      <div className='mx-auto max-w-5xl'>

        {/* Header */}
        <div className='text-center mb-12'>
          <p className='text-xs uppercase tracking-widest text-stride-yellow-accent font-medium mb-3'>
            Community voices
          </p>
          <h2 className='text-3xl md:text-4xl font-bold font-libre text-copy-white'>
            Stride Spotlight
          </h2>
          <p className='text-copy-white/50 mt-3 max-w-md mx-auto text-sm'>
            Real runners. Real stories. This is what Stride looks like from the inside.
          </p>
        </div>

        {/* Grid — centres 1 item, 2-col for 2, 3-col for 3+ */}
        <div className='flex flex-wrap justify-center gap-8'>
          {SPOTLIGHTS.map(({ reelUrl, caption, handle, handleUrl }) => (
            <div
              key={reelUrl}
              className='w-full max-w-[360px] flex flex-col gap-3'
            >
              <InstagramEmbed url={reelUrl} />

              {/* Caption */}
              <div className='bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex items-center justify-between gap-3'>
                <p className='text-copy-white/80 text-sm font-medium'>{caption}</p>
                <a
                  href={handleUrl}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='text-stride-yellow-accent text-sm font-semibold hover:underline shrink-0'
                >
                  {handle}
                </a>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}
