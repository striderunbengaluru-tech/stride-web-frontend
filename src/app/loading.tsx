'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Zap } from 'lucide-react'

const TIPS = [
  "Run your own race. Someone else's pace has nothing to do with yours.",
  "Easy runs should feel easy. Most of us run them too hard.",
  "Hydration starts the night before, not the morning of the run.",
  "A slow run still beats no run.",
  "Strength training twice a week can cut running injuries by up to half.",
  "The first 10 minutes usually feel the worst. Settle in before you judge the run.",
  "Sleep is the best legal performance enhancer there is.",
  "Lean slightly forward from your ankles, not your waist.",
  "Aim for a cadence of 170–180 steps per minute. Quicker, shorter steps mean less impact.",
  "Long runs belong at conversational pace. If you can't chat, slow down.",
  "The strength you're chasing shows up between runs, so take the rest day.",
  "Nothing new on race day. Test your fuel and gear in training first.",
  "5 km every day will take you further than 30 km once a week.",
  "Run outside when you can. Save the treadmill for days the weather wins.",
  "Protein within 30 minutes of a run helps your muscles repair faster.",
  "A cold shower after a hard session takes the edge off the soreness.",
  "Your breathing is the simplest pace check you own. Gasping means slow down.",
  "Warm up with dynamic stretches, cool down with static holds.",
  "Half of a Stride run happens after the run. Stick around for the meetup.",
  "Fit beats price when you're choosing running shoes.",
]

const DUCKY_BASE =
  'https://ienotcjldormdxrzukpk.supabase.co/storage/v1/object/public/stride-assets/images/web-assets'
const DUCKY_COUNT = 5

export default function Loading() {
  const [tip, setTip] = useState('')
  const [duckyIdx, setDuckyIdx] = useState(0)
  const [popped, setPopped] = useState(true)

  useEffect(() => {
    setTip(TIPS[Math.floor(Math.random() * TIPS.length)])
  }, [])

  useEffect(() => {
    let switchTimer: ReturnType<typeof setTimeout>

    const interval = setInterval(() => {
      setPopped(false)
      switchTimer = setTimeout(() => {
        setDuckyIdx((i) => (i + 1) % DUCKY_COUNT)
        setPopped(true)
      }, 280)
    }, 2000)

    return () => {
      clearInterval(interval)
      clearTimeout(switchTimer)
    }
  }, [])

  return (
    <div className='min-h-screen bg-stride-purple-primary flex flex-col items-center justify-center gap-7 px-6'>

      {/* Ducky mascot — cycles through 5 poses with spring pop */}
      <div
        style={{
          transform: popped ? 'scale(1)' : 'scale(0.05)',
          opacity: popped ? 1 : 0,
          transition: popped
            ? 'transform 0.42s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.15s ease-out'
            : 'transform 0.22s ease-in, opacity 0.18s ease-in',
        }}
      >
        <Image
          src={`${DUCKY_BASE}/ducky-${duckyIdx + 1}.webp`}
          alt='Ducky the Stride mascot'
          width={176}
          height={176}
          className='w-44 h-44 object-contain drop-shadow-2xl'
        />
      </div>

      {/* Bouncing dots */}
      <div className='flex items-end gap-1.5'>
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className='block w-2 rounded-full bg-stride-yellow-accent'
            style={{
              height: '8px',
              animation: `stride-bounce 0.8s ease-in-out ${i * 0.12}s infinite alternate`,
            }}
          />
        ))}
      </div>

      {/* Running tip card */}
      {tip && (
        <div className='max-w-xs w-full bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl px-5 py-4 text-center'>
          <div className='flex items-center justify-center gap-1.5 mb-3'>
            <Zap size={11} className='text-stride-yellow-accent fill-stride-yellow-accent' />
            <span className='text-stride-yellow-accent text-[10px] font-bold font-mono uppercase tracking-[0.22em]'>
              Running Tip
            </span>
          </div>
          <p className='text-white/90 text-sm leading-relaxed'>{tip}</p>
        </div>
      )}

      <style>{`
        @keyframes stride-bounce {
          from { height: 6px;  opacity: 0.35; }
          to   { height: 18px; opacity: 1; }
        }
      `}</style>
    </div>
  )
}
