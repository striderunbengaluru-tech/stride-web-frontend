'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, X, Check, Plus } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import type { Prompt } from '@/types/user'

const PRESET_QUESTIONS = [
  "My pre-run ritual is...",
  "The race I'm most proud of...",
  "I run because...",
  "My spirit animal on race day...",
  "Best post-run meal...",
]

type Props = {
  prompts: Prompt[]
  isOwnProfile: boolean
}

export function EditPromptsSection({ prompts: initialPrompts, isOwnProfile }: Props) {
  const [editing, setEditing] = useState(false)
  const [prompts, setPrompts] = useState<Prompt[]>(initialPrompts)
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  function addPrompt(question: string) {
    if (prompts.length < 5 && !prompts.find(p => p.question === question)) {
      setPrompts(prev => [...prev, { question, answer: '' }])
    }
  }

  function updateAnswer(i: number, answer: string) {
    setPrompts(prev => {
      const updated = [...prev]
      if (updated[i]) updated[i] = { ...updated[i]!, answer }
      return updated
    })
  }

  function removePrompt(i: number) {
    setPrompts(prev => prev.filter((_, idx) => idx !== i))
  }

  async function save() {
    setSaving(true)
    await fetch('/api/profile/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompts: prompts.filter(p => p.question && p.answer) }),
    })
    setSaving(false)
    setEditing(false)
    router.refresh()
  }

  if (initialPrompts.length === 0 && !isOwnProfile) return null

  return (
    <div className='bg-white/8 border border-white/10 rounded-2xl p-5 flex flex-col gap-4 hover:border-white/15 transition-colors'>
      <div className='flex items-center justify-between'>
        <p className='text-white/40 text-[10px] uppercase tracking-widest font-medium'>Prompts</p>
        {isOwnProfile && !editing && (
          <button
            onClick={() => setEditing(true)}
            className='w-7 h-7 flex items-center justify-center rounded-full bg-white/5 border border-white/12 text-white/30 hover:text-white hover:border-white/25 transition-colors'
            aria-label='Edit prompts'
          >
            <Pencil size={12} />
          </button>
        )}
      </div>

      {editing ? (
        <div className='flex flex-col gap-4'>
          {prompts.map((p, i) => (
            <div key={i} className='bg-white/5 border border-white/10 rounded-xl p-4 space-y-2'>
              <div className='flex items-start justify-between gap-2'>
                <p className='text-stride-yellow-accent/80 text-xs font-semibold leading-snug'>{p.question}</p>
                <button onClick={() => removePrompt(i)}
                  className='text-white/20 hover:text-white/60 transition-colors shrink-0 mt-0.5'>
                  <X size={14} />
                </button>
              </div>
              <textarea
                className='w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-stride-yellow-accent/50 resize-none transition-colors'
                rows={2}
                maxLength={300}
                value={p.answer}
                onChange={e => updateAnswer(i, e.target.value)}
                placeholder='Your answer...'
              />
            </div>
          ))}

          {prompts.length < 5 && (
            <div className='flex flex-wrap gap-2'>
              {PRESET_QUESTIONS.filter(q => !prompts.find(p => p.question === q)).map(q => (
                <button key={q} onClick={() => addPrompt(q)}
                  className='flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-white/12 text-white/45 hover:border-stride-yellow-accent/40 hover:text-white/80 transition-colors text-left'>
                  <Plus size={11} className='shrink-0' />
                  {q}
                </button>
              ))}
            </div>
          )}

          <div className='flex gap-2'>
            <button onClick={save} disabled={saving}
              className='flex items-center gap-1.5 bg-stride-yellow-accent text-copy-black text-xs font-semibold px-3 py-2 rounded-lg hover:bg-stride-yellow-accent/90 disabled:opacity-50 min-h-9'>
              {saving ? <Spinner className='w-3 h-3' /> : <Check size={12} />} Save
            </button>
            <button onClick={() => { setEditing(false); setPrompts(initialPrompts) }}
              className='flex items-center gap-1.5 text-white/40 hover:text-white text-xs px-3 py-2 rounded-lg border border-white/15 transition-colors min-h-9'>
              <X size={12} /> Cancel
            </button>
          </div>
        </div>
      ) : initialPrompts.length > 0 ? (
        <div className='space-y-4'>
          {initialPrompts.map((p, i) => (
            <div key={i} className='border-l-2 border-stride-yellow-accent/25 pl-4'>
              <p className='text-stride-yellow-accent/60 text-[10px] font-semibold uppercase tracking-widest mb-1.5'>{p.question}</p>
              <p className='text-white/70 text-sm leading-relaxed'>{p.answer}</p>
            </div>
          ))}
        </div>
      ) : (
        <button
          onClick={() => setEditing(true)}
          className='flex items-center gap-2 text-white/25 text-sm italic hover:text-white/40 transition-colors'
        >
          <Plus size={14} className='shrink-0' />
          Add a prompt to share your running story...
        </button>
      )}
    </div>
  )
}
