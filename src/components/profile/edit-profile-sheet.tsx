'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Prompt } from '@/types/user'
import { Spinner } from '@/components/ui/spinner'

const PRESET_SKILLS = [
  '5K', '10K', 'Half Marathon', 'Marathon', 'Ultra',
  'Trail Running', 'Speed Work', 'Recovery Runs',
  'Morning Runner', 'Night Owl', 'Pacer', 'New Runner',
]

const PRESET_QUESTIONS = [
  'My pre-run ritual is...',
  'The race I\'m most proud of...',
  'I run because...',
  'My spirit animal on race day...',
  'Best post-run meal...',
]

type Props = {
  initial: {
    name: string
    bio: string
    location: string
    skills: string[]
    linkedinUrl: string
    instagramUrl: string
    stravaUrl: string
    prompts: Prompt[]
  }
}

export function EditProfileSheet({ initial }: Props) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState(initial.name)
  const [bio, setBio] = useState(initial.bio)
  const [location, setLocation] = useState(initial.location)
  const [skills, setSkills] = useState<string[]>(initial.skills)
  const [customSkill, setCustomSkill] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState(initial.linkedinUrl)
  const [instagramUrl, setInstagramUrl] = useState(initial.instagramUrl)
  const [stravaUrl, setStravaUrl] = useState(initial.stravaUrl)
  const [prompts, setPrompts] = useState<Prompt[]>(initial.prompts)
  const router = useRouter()

  function toggleSkill(skill: string) {
    setSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : prev.length < 12 ? [...prev, skill] : prev
    )
  }

  function addCustomSkill() {
    const trimmed = customSkill.trim()
    if (trimmed && !skills.includes(trimmed) && skills.length < 12) {
      setSkills((prev) => [...prev, trimmed])
      setCustomSkill('')
    }
  }

  function updatePrompt(index: number, field: 'question' | 'answer', value: string) {
    setPrompts((prev) => {
      const updated = [...prev]
      if (updated[index]) {
        updated[index] = { ...updated[index], [field]: value }
      } else {
        updated[index] = { question: '', answer: '', [field]: value }
      }
      return updated
    })
  }

  function addPrompt(question: string) {
    if (prompts.length < 5 && !prompts.find((p) => p.question === question)) {
      setPrompts((prev) => [...prev, { question, answer: '' }])
    }
  }

  function removePrompt(index: number) {
    setPrompts((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSave() {
    setSaving(true)
    await fetch('/api/profile/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name || undefined,
        bio: bio || undefined,
        location: location || undefined,
        skills,
        linkedinUrl: linkedinUrl || undefined,
        instagramUrl: instagramUrl || undefined,
        stravaUrl: stravaUrl || undefined,
        prompts: prompts.filter((p) => p.question && p.answer),
      }),
    })
    setSaving(false)
    setOpen(false)
    router.refresh()
  }

  const inputCls = 'w-full bg-white/5 border border-white/15 rounded-md px-3 py-2 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-stride-yellow-accent/60'
  const labelCls = 'text-white/60 text-xs font-medium uppercase tracking-wider block mb-1'

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className='text-sm font-medium px-4 py-2 rounded-md border border-white/20 text-white/80 hover:border-stride-yellow-accent/50 hover:text-white transition-colors min-h-11'
      >
        Edit Profile
      </button>

      {open && (
        <div className='fixed inset-0 z-50 flex'>
          {/* Backdrop */}
          <div className='flex-1 bg-black/60' onClick={() => setOpen(false)} />

          {/* Sheet */}
          <div className='w-full max-w-md bg-stride-purple-primary border-l border-white/15 overflow-y-auto flex flex-col'>
            <div className='flex items-center justify-between px-6 py-4 border-b border-white/10 sticky top-0 bg-stride-purple-primary'>
              <h2 className='text-white font-semibold'>Edit Profile</h2>
              <button onClick={() => setOpen(false)} className='text-white/50 hover:text-white text-xl leading-none'>×</button>
            </div>

            <div className='p-6 space-y-6 flex-1'>
              {/* Basic */}
              <div className='space-y-4'>
                <div>
                  <label className={labelCls}>Display Name</label>
                  <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Bio</label>
                  <textarea
                    className={inputCls}
                    rows={3}
                    maxLength={300}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder='Tell the community about yourself...'
                  />
                  <p className='text-white/30 text-xs mt-1 text-right'>{bio.length}/300</p>
                </div>
                <div>
                  <label className={labelCls}>Location</label>
                  <input className={inputCls} value={location} onChange={(e) => setLocation(e.target.value)} placeholder='Bengaluru, India' />
                </div>
              </div>

              {/* Skills */}
              <div>
                <label className={labelCls}>Skills & Specialties</label>
                <div className='flex flex-wrap gap-2 mb-3'>
                  {PRESET_SKILLS.map((skill) => (
                    <button
                      key={skill}
                      onClick={() => toggleSkill(skill)}
                      className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
                        skills.includes(skill)
                          ? 'bg-stride-yellow-accent/20 border-stride-yellow-accent text-stride-yellow-accent'
                          : 'border-white/20 text-white/60 hover:border-white/40'
                      }`}
                    >
                      {skill}
                    </button>
                  ))}
                </div>
                <div className='flex gap-2'>
                  <input
                    className={`${inputCls} flex-1`}
                    placeholder='Add custom skill...'
                    value={customSkill}
                    onChange={(e) => setCustomSkill(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomSkill())}
                  />
                  <button
                    onClick={addCustomSkill}
                    className='px-3 py-2 border border-white/20 rounded-md text-white/60 hover:border-white/40 text-sm'
                  >
                    Add
                  </button>
                </div>
                {skills.filter((s) => !PRESET_SKILLS.includes(s)).map((s) => (
                  <span key={s} className='inline-flex items-center gap-1 mt-2 mr-2 text-xs px-3 py-1.5 rounded-md bg-stride-yellow-accent/20 border border-stride-yellow-accent text-stride-yellow-accent'>
                    {s}
                    <button onClick={() => setSkills((prev) => prev.filter((x) => x !== s))} className='text-stride-yellow-accent/60 hover:text-stride-yellow-accent ml-1'>×</button>
                  </span>
                ))}
              </div>

              {/* Social Links */}
              <div className='space-y-3'>
                <label className={labelCls}>Social Links</label>
                <input className={inputCls} value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} placeholder='https://linkedin.com/in/...' />
                <input className={inputCls} value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} placeholder='https://instagram.com/...' />
                <input className={inputCls} value={stravaUrl} onChange={(e) => setStravaUrl(e.target.value)} placeholder='https://strava.com/athletes/...' />
              </div>

              {/* Prompts */}
              <div>
                <label className={labelCls}>Prompts ({prompts.length}/5)</label>
                {prompts.map((p, i) => (
                  <div key={i} className='mb-4 bg-white/5 rounded-xl p-4 border border-white/10'>
                    <div className='flex items-start justify-between mb-2'>
                      <p className='text-stride-yellow-accent text-xs font-medium'>{p.question}</p>
                      <button onClick={() => removePrompt(i)} className='text-white/30 hover:text-white/60 text-lg leading-none ml-2'>×</button>
                    </div>
                    <textarea
                      className={inputCls}
                      rows={2}
                      maxLength={300}
                      placeholder='Your answer...'
                      value={p.answer}
                      onChange={(e) => updatePrompt(i, 'answer', e.target.value)}
                    />
                  </div>
                ))}
                {prompts.length < 5 && (
                  <div className='flex flex-wrap gap-2 mt-2'>
                    {PRESET_QUESTIONS.filter((q) => !prompts.find((p) => p.question === q)).map((q) => (
                      <button
                        key={q}
                        onClick={() => addPrompt(q)}
                        className='text-xs px-3 py-1.5 rounded-md border border-white/20 text-white/60 hover:border-stride-yellow-accent/50 hover:text-white transition-colors text-left'
                      >
                        + {q}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className='px-6 py-4 border-t border-white/10 sticky bottom-0 bg-stride-purple-primary'>
              <button
                onClick={handleSave}
                disabled={saving}
                className='w-full bg-stride-yellow-accent text-copy-black font-semibold py-3 rounded-md hover:bg-stride-yellow-accent/90 transition-colors text-sm disabled:opacity-50 min-h-11'
              >
                {saving ? (
                  <span className='flex items-center justify-center gap-2'><Spinner /> Saving…</span>
                ) : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
