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
}

type Filter = 'upcoming' | 'past' | 'all'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'past', label: 'Past' },
  { key: 'all', label: 'All' },
]

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
}

const cardItem = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
}

export function EventsClient({ events }: { events: Event[] }) {
  const [filter, setFilter] = useState<Filter>('upcoming')
  const now = useMemo(() => new Date(), [])

  const filtered = useMemo(() => {
    if (filter === 'upcoming') {
      return events.filter(e => !e.event_date || new Date(e.event_date) >= now)
    }
    if (filter === 'past') {
      return events.filter(e => !!e.event_date && new Date(e.event_date) < now)
    }
    return events
  }, [events, filter, now])

  return (
    <div>
      {/* Filter tabs */}
      <div className='flex gap-2 mb-10'>
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
              filter === key
                ? 'bg-stride-yellow-accent text-copy-black'
                : 'bg-white/10 text-white/60 hover:bg-white/15 hover:text-white border border-white/10'
            }`}
          >
            {label}
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
            className='bg-white/10 backdrop-blur-md border border-white/15 rounded-xl p-16 text-center'
          >
            <p className='text-white/40 text-lg'>No {filter === 'all' ? '' : filter} events right now.</p>
            <p className='text-white/30 text-sm mt-2'>Check back soon — we run regularly!</p>
          </motion.div>
        ) : (
          <motion.div
            key={filter}
            className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'
            variants={container}
            initial='hidden'
            animate='show'
            exit={{ opacity: 0 }}
          >
            {filtered.map(event => (
              <motion.div key={event.id} variants={cardItem}>
                <EventCard
                  name={event.name}
                  subtitle={event.subtitle}
                  slug={event.slug}
                  eventDate={event.event_date ? new Date(event.event_date) : null}
                  location={event.location}
                  pricePaise={event.price_paise}
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
