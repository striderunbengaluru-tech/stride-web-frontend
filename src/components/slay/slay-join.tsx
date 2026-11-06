import Image from 'next/image'
import { SLAY_JOIN } from '@/content/slay'
import { SlayJoinForm } from './slay-join-form'

export function SlayJoin() {
  return (
    <section id='join' aria-labelledby='slay-join-title' className='relative isolate scroll-mt-16 overflow-hidden bg-slay-pink px-4 py-24 text-copy-black sm:px-8 sm:py-32'>
      <div className='mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2'>
        <div>
          <h2 id='slay-join-title' className='font-slay text-6xl uppercase leading-[0.9] sm:text-8xl'>
            {SLAY_JOIN.headline}
          </h2>
          <p className='mt-6 max-w-md text-lg leading-relaxed'>{SLAY_JOIN.intro}</p>
          <div className='relative mt-10 hidden aspect-[3/2] -rotate-2 overflow-hidden rounded-3xl border-4 border-copy-black shadow-2xl lg:block'>
            <Image
              src={SLAY_JOIN.photo.src}
              alt={SLAY_JOIN.photo.alt}
              fill
              sizes='50vw'
              className='object-cover'
            />
          </div>
        </div>
        <div className='rounded-3xl border-4 border-copy-black bg-copy-white p-6 shadow-[8px_8px_0_0_var(--color-copy-black)] sm:p-10'>
          <SlayJoinForm />
        </div>
      </div>
    </section>
  )
}
