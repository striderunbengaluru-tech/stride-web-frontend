'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, X, Check, Flag, Mountain, Trees, Zap, Heart, Sunrise, Moon, Clock, Star, Footprints } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'

const PRESET_SKILLS = [
  '5K', '10K', 'Half Marathon', 'Marathon', 'Ultra',
  'Trail Running', 'Speed Work', 'Recovery Runs',
  'Morning Runner', 'Night Owl', 'Pacer', 'New Runner',
]

const SKILL_ICONS: Record<string, React.ReactNode> = {
  '5K':             <Footprints size={11} aria-hidden='true' />,
  '10K':            <Footprints size={11} aria-hidden='true' />,
  'Half Marathon':  <Flag size={11} aria-hidden='true' />,
  'Marathon':       <Flag size={11} aria-hidden='true' />,
  'Ultra':          <Mountain size={11} aria-hidden='true' />,
  'Trail Running':  <Trees size={11} aria-hidden='true' />,
  'Speed Work':     <Zap size={11} aria-hidden='true' />,
  'Recovery Runs':  <Heart size={11} aria-hidden='true' />,
  'Morning Runner': <Sunrise size={11} aria-hidden='true' />,
  'Night Owl':      <Moon size={11} aria-hidden='true' />,
  'Pacer':          <Clock size={11} aria-hidden='true' />,
  'New Runner':     <Star size={11} aria-hidden='true' />,
}

type Props = {
  skills: string[]
  isOwnProfile: boolean
}

export function EditSpecialtiesSection({ skills: initialSkills, isOwnProfile }: Props) {
  const [editing, setEditing] = useState(false)
  const [skills, setSkills] = useState<string[]>(initialSkills)
  const [customSkill, setCustomSkill] = useState('')
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  function toggle(skill: string) {
    setSkills(prev =>
      prev.includes(skill) ? prev.filter(s => s !== skill) : prev.length < 12 ? [...prev, skill] : prev
    )
  }

  function addCustom() {
    const t = customSkill.trim()
    if (t && !skills.includes(t) && skills.length < 12) {
      setSkills(prev => [...prev, t])
      setCustomSkill('')
    }
  }

  async function save() {
    setSaving(true)
    await fetch('/api/profile/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skills }),
    })
    setSaving(false)
    setEditing(false)
    router.refresh()
  }

  if (initialSkills.length === 0 && !isOwnProfile) return null

  return (
    <div className='h-full bg-white/8 border border-white/10 rounded-2xl p-5 flex flex-col gap-3 hover:border-white/15 transition-colors'>
      <div className='flex items-center justify-between'>
        <p className='text-white/40 text-[10px] uppercase tracking-widest font-medium'>Specialties</p>
        {isOwnProfile && !editing && (
          <button
            onClick={() => setEditing(true)}
            className='w-7 h-7 flex items-center justify-center rounded-full bg-white/5 border border-white/12 text-white/30 hover:text-white hover:border-white/25 transition-colors'
            aria-label='Edit specialties'
          >
            <Pencil size={12} />
          </button>
        )}
      </div>

      {editing ? (
        <div className='flex flex-col gap-3'>
          <div className='flex flex-wrap gap-2'>
            {PRESET_SKILLS.map(skill => (
              <button
                key={skill}
                onClick={() => toggle(skill)}
                className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  skills.includes(skill)
                    ? 'bg-stride-yellow-accent/15 border-stride-yellow-accent text-stride-yellow-accent'
                    : 'border-white/15 text-white/50 hover:border-white/30'
                }`}
              >
                {SKILL_ICONS[skill] ?? null}
                {skill}
              </button>
            ))}
          </div>
          <div className='flex gap-2'>
            <input
              className='flex-1 bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-white text-xs placeholder:text-white/25 focus:outline-none focus:border-stride-yellow-accent/50'
              placeholder='Add custom skill…'
              value={customSkill}
              onChange={e => setCustomSkill(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustom())}
            />
            <button onClick={addCustom} className='px-3 py-2 border border-white/15 rounded-lg text-white/50 hover:border-white/30 text-xs transition-colors'>
              Add
            </button>
          </div>
          {skills.filter(s => !PRESET_SKILLS.includes(s)).length > 0 && (
            <div className='flex flex-wrap gap-2'>
              {skills.filter(s => !PRESET_SKILLS.includes(s)).map(s => (
                <span key={s} className='inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full bg-stride-yellow-accent/15 border border-stride-yellow-accent text-stride-yellow-accent'>
                  {s}
                  <button onClick={() => setSkills(prev => prev.filter(x => x !== s))} className='hover:text-white ml-0.5 transition-colors'>
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className='flex gap-2'>
            <button onClick={save} disabled={saving}
              className='flex items-center gap-1.5 bg-stride-yellow-accent text-copy-black text-xs font-semibold px-3 py-2 rounded-lg hover:bg-stride-yellow-accent/90 disabled:opacity-50 min-h-9'>
              {saving ? <Spinner className='w-3 h-3' /> : <Check size={12} />} Save
            </button>
            <button onClick={() => { setEditing(false); setSkills(initialSkills) }}
              className='flex items-center gap-1.5 text-white/40 hover:text-white text-xs px-3 py-2 rounded-lg border border-white/15 transition-colors min-h-9'>
              <X size={12} /> Cancel
            </button>
          </div>
        </div>
      ) : skills.length > 0 ? (
        <div className='flex flex-wrap gap-2'>
          {skills.map(skill => (
            <span
              key={skill}
              className='inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-white/6 border border-white/10 text-white/60'
            >
              {SKILL_ICONS[skill] ?? null}
              {skill}
            </span>
          ))}
        </div>
      ) : (
        <button
          onClick={() => setEditing(true)}
          className='text-left text-white/25 text-sm italic hover:text-white/40 transition-colors'
        >
          Add your running specialties...
        </button>
      )}
    </div>
  )
}
