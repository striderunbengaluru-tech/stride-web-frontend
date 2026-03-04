'use client'

import { useEffect, useState } from 'react'

const TIPS = [
  "Run your own race — comparison is the thief of joy on the track.",
  "Easy runs should feel easy. Most runners go too hard, too often.",
  "Hydration starts the night before, not the morning of your run.",
  "Your slowest run is still faster than sitting on the couch.",
  "Strength training twice a week reduces running injuries by up to 50%.",
  "The first 10 minutes are always the hardest. Push through and trust your body.",
  "Sleep is the best legal performance-enhancing drug available.",
  "Running form fix: lean slightly forward from your ankles, not your waist.",
  "Cadence matters. Aim for 170–180 steps per minute to reduce impact.",
  "Long runs should be at conversational pace — if you can't chat, slow down.",
  "Recovery is when you get stronger. Respect the rest day.",
  "Nutrition rule: nothing new on race day. Practice your race-day meals in training.",
  "Consistency beats intensity. 5 km every day beats 30 km once a week.",
  "Run outside when you can — trails and roads beat the treadmill for mental health.",
  "Post-run protein within 30 minutes accelerates muscle repair.",
  "Cold showers after hard sessions reduce soreness and speed recovery.",
  "Your breath tells the truth. If you're gasping, you're going too fast.",
  "Warm up with dynamic stretches, cool down with static holds.",
  "Every Stride run makes you part of something bigger than yourself.",
  "The best shoe is the one that fits your foot, not the most expensive one.",
]

export default function Loading() {
  const [tip, setTip] = useState('')

  useEffect(() => {
    setTip(TIPS[Math.floor(Math.random() * TIPS.length)])
  }, [])

  return (
    <div className='min-h-screen flex flex-col items-center justify-center gap-8 px-6'>
      {/* Animated runner dots */}
      <div className='flex items-end gap-2'>
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className='block w-2.5 rounded-full bg-stride-yellow-accent'
            style={{
              height: '10px',
              animation: `bounce 0.8s ease-in-out ${i * 0.12}s infinite alternate`,
            }}
          />
        ))}
      </div>

      {/* Running figure SVG */}
      <svg
        viewBox='0 0 64 64'
        className='w-14 h-14 text-stride-yellow-accent opacity-80'
        fill='currentColor'
        aria-hidden='true'
        style={{ animation: 'sway 1s ease-in-out infinite alternate' }}
      >
        {/* Simple stick-figure runner */}
        <circle cx='32' cy='10' r='6' />
        <line x1='32' y1='16' x2='32' y2='36' stroke='currentColor' strokeWidth='3' strokeLinecap='round' />
        <line x1='32' y1='36' x2='20' y2='50' stroke='currentColor' strokeWidth='3' strokeLinecap='round' />
        <line x1='32' y1='36' x2='44' y2='44' stroke='currentColor' strokeWidth='3' strokeLinecap='round' />
        <line x1='32' y1='22' x2='18' y2='30' stroke='currentColor' strokeWidth='3' strokeLinecap='round' />
        <line x1='32' y1='22' x2='46' y2='28' stroke='currentColor' strokeWidth='3' strokeLinecap='round' />
      </svg>

      {/* Tip text */}
      {tip && (
        <div className='max-w-sm text-center'>
          <p className='text-white/40 text-xs uppercase tracking-widest font-semibold mb-2'>Running tip</p>
          <p className='text-white/80 text-sm leading-relaxed'>{tip}</p>
        </div>
      )}

      <style>{`
        @keyframes bounce {
          from { height: 6px; opacity: 0.4; }
          to   { height: 20px; opacity: 1; }
        }
        @keyframes sway {
          from { transform: rotate(-5deg); }
          to   { transform: rotate(5deg); }
        }
      `}</style>
    </div>
  )
}
