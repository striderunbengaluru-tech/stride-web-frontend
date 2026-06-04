'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { CalendarDays, MapPin, CheckCircle2, ChevronRight } from 'lucide-react'

export type MyRun = {
  id: string
  name: string
  slug: string
  eventDate: string | null
  location: string | null
  bannerUrl: string | null
  pricePaise: number
  checkedIn: boolean
}

type Tab = 'upcoming' | 'past'

const TABS: { key: Tab; label: string }[] = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'past', label: 'Past' },
]

function priceLabel(paise: number): string {
  return paise === 0 ? 'Free' : `₹${(paise / 100).toLocaleString('en-IN')}`
}

function dateLabel(iso: string | null): string | null {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

export function MyRunsClient({ upcoming, past }: { upcoming: MyRun[]; past: MyRun[] }) {
  const [tab, setTab] = useState<Tab>('upcoming')
  const runs = tab === 'upcoming' ? upcoming : past
  const counts = { upcoming: upcoming.length, past: past.length }

  return (
    <div>
      {/* Tabs */}
      <div className='flex gap-1.5 mb-8 bg-white/5 border border-white/8 rounded-2xl p-1.5 w-fit'>
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`relative px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
              tab === key ? 'bg-stride-yellow-accent text-copy-black shadow-lg' : 'text-white/50 hover:text-white/80'
            }`}
          >
            {label}
            <span className={`ml-1.5 text-xs font-normal ${tab === key ? 'text-copy-black/60' : 'text-white/25'}`}>
              {counts[key]}
            </span>
          </button>
        ))}
      </div>

      <AnimatePresence mode='wait'>
        {runs.length === 0 ? (
          <motion.div key={`empty-${tab}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className='py-16 text-center'>
            <p className='text-white/35 text-base font-medium'>
              {tab === 'upcoming' ? 'No upcoming runs yet.' : 'No past runs yet.'}
            </p>
            <p className='text-white/20 text-sm mt-2'>
              {tab === 'upcoming'
                ? <>Find your next one on the <Link href='/events' className='text-stride-yellow-accent hover:underline'>events page</Link>.</>
                : 'Check in to a run and it’ll show up here.'}
            </p>
          </motion.div>
        ) : (
          <motion.ul
            key={tab}
            className='flex flex-col gap-3.5'
            initial='hidden'
            animate='show'
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
          >
            {runs.map(run => (
              <motion.li
                key={run.id}
                variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } } }}
              >
                <Link
                  href={`/events/${run.slug}`}
                  className='group flex items-stretch gap-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 hover:border-stride-yellow-accent/50 transition-colors overflow-hidden'
                >
                  {/* Banner — left, 3:4 */}
                  <div className='relative w-24 sm:w-32 shrink-0 bg-white/5'>
                    <div className='relative aspect-3/4 h-full'>
                      {run.bannerUrl ? (
                        <Image src={run.bannerUrl} alt={run.name} fill sizes='128px' className='object-cover' />
                      ) : (
                        <div className='absolute inset-0 flex items-center justify-center text-white/15'>
                          <CalendarDays size={26} />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Details — right */}
                  <div className='flex-1 min-w-0 py-3.5 pr-3.5 flex flex-col justify-center gap-1.5'>
                    <h3 className='text-white font-semibold text-sm sm:text-base leading-snug line-clamp-2'>{run.name}</h3>

                    {dateLabel(run.eventDate) && (
                      <p className='flex items-center gap-1.5 text-white/55 text-xs font-mono'>
                        <CalendarDays size={12} className='shrink-0 text-white/35' />
                        {dateLabel(run.eventDate)}
                      </p>
                    )}
                    {run.location && (
                      <p className='flex items-center gap-1.5 text-white/55 text-xs'>
                        <MapPin size={12} className='shrink-0 text-white/35' />
                        <span className='line-clamp-1'>{run.location}</span>
                      </p>
                    )}

                    <div className='flex items-center gap-2 mt-1.5 flex-wrap'>
                      <span className='inline-flex items-center text-xs font-bold text-stride-yellow-accent bg-stride-yellow-accent/10 border border-stride-yellow-accent/25 rounded-md px-2 py-0.5 font-mono'>
                        {priceLabel(run.pricePaise)} paid
                      </span>
                      {run.checkedIn && (
                        <span className='inline-flex items-center gap-1 text-xs font-medium text-green-400 bg-green-500/10 border border-green-500/25 rounded-md px-2 py-0.5'>
                          <CheckCircle2 size={12} /> Checked in
                        </span>
                      )}
                    </div>
                  </div>

                  <ChevronRight size={18} className='self-center shrink-0 mr-3 text-white/20 group-hover:text-stride-yellow-accent transition-colors' />
                </Link>
              </motion.li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}
