'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { EventCard } from './event-card'

type Event = {
  id: string
  name: string
  subtitle: string | null
  slug: string
  event_date: string | null
  location: string | null
  price_paise: number
  cover_url: string | null
  imageUrl: string | null
  /** Resolved on the server so package events read "From ₹X", not "Free". */
  priceLabel: string
  isFree: boolean
}

type Filter = 'upcoming' | 'past' | 'all'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'past', label: 'Past' },
  { key: 'all', label: 'All' },
]

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
}

const cardItem = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
}

export function EventsClient({ events }: { events: Event[] }) {
  const [filter, setFilter] = useState<Filter>('upcoming')
  const now = useMemo(() => new Date(), [])

  const filtered = useMemo(() => {
    if (filter === 'upcoming') return events.filter(e => !e.event_date || new Date(e.event_date) >= now)
    if (filter === 'past') return events.filter(e => !!e.event_date && new Date(e.event_date) < now)
    return events
  }, [events, filter, now])

  const counts = useMemo(() => ({
    upcoming: events.filter(e => !e.event_date || new Date(e.event_date) >= now).length,
    past:     events.filter(e => !!e.event_date && new Date(e.event_date) < now).length,
    all:      events.length,
  }), [events, now])

  return (
    <div>
      {/* Filter tabs */}
      <div className='flex gap-1.5 mb-10 bg-white/5 border border-white/8 rounded-2xl p-1.5 w-fit'>
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`relative px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
              filter === key
                ? 'bg-stride-yellow-accent text-copy-black shadow-lg'
                : 'text-white/50 hover:text-white/80'
            }`}
          >
            {label}
            <span className={`ml-1.5 text-xs font-normal ${filter === key ? 'text-copy-black/60' : 'text-white/25'}`}>
              {counts[key]}
            </span>
          </button>
        ))}
      </div>

      <AnimatePresence mode='wait'>
        {filtered.length === 0 ? (
          <motion.div
            key='empty'
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className='py-20 text-center'
          >
            <p className='text-white/30 text-lg font-medium'>No {filter === 'all' ? '' : filter} events right now.</p>
            <p className='text-white/20 text-sm mt-2'>We run two to three times a week; new dates are posted here.</p>
          </motion.div>
        ) : (
          <motion.div
            key={filter}
            className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10'
            variants={container}
            initial='hidden'
            animate='show'
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
          >
            {filtered.map(event => (
              <motion.div key={event.id} variants={cardItem}>
                <EventCard
                  name={event.name}
                  subtitle={event.subtitle}
                  slug={event.slug}
                  eventDate={event.event_date ? new Date(event.event_date) : null}
                  location={event.location}
                  priceLabel={event.priceLabel}
                  isFree={event.isFree}
                  coverUrl={event.imageUrl}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
