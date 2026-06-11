'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Check, Pencil, GripVertical, Quote } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import type { Prompt } from '@/types/user'
import { PROMPT_QUESTIONS, MAX_PROMPTS, PROMPT_ANSWER_MAX } from '@/content/profile-prompts'

type Props = { initialPrompts: Prompt[]; isOwnProfile: boolean }

type FormState = { question: string; answer: string }
const EMPTY_FORM: FormState = { question: '', answer: '' }

export function PromptsSection({ initialPrompts, isOwnProfile }: Props) {
  const [prompts, setPrompts] = useState<Prompt[]>(initialPrompts)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [dragSrc, setDragSrc] = useState<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)
  const router = useRouter()

  const canAdd = prompts.length < MAX_PROMPTS

  // Questions not yet used, so each prompt stays unique. When editing, the
  // prompt's own question is added back so it remains selectable.
  const usedQuestions = new Set(prompts.map(p => p.question))
  const availableFor = (current?: string) =>
    PROMPT_QUESTIONS.filter(q => !usedQuestions.has(q) || q === current)

  async function handleAdd() {
    if (!form.question || !form.answer.trim()) return
    setSaving(true)
    const res = await fetch('/api/profile/prompts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (res.ok) {
      const { prompt } = await res.json() as { prompt: Prompt }
      setPrompts(prev => [...prev, prompt])
      setForm(EMPTY_FORM)
      setAdding(false)
      router.refresh()
    }
  }

  function startEdit(prompt: Prompt) {
    setEditingId(prompt.id)
    setEditForm({ question: prompt.question, answer: prompt.answer })
  }

  async function handleEditSave(id: string) {
    if (!editForm.question || !editForm.answer.trim()) return
    setSaving(true)
    const res = await fetch('/api/profile/prompts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...editForm }),
    })
    setSaving(false)
    if (res.ok) {
      const { prompt } = await res.json() as { prompt: Prompt }
      setPrompts(prev => prev.map(p => p.id === id ? prompt : p))
      setEditingId(null)
      router.refresh()
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    await fetch(`/api/profile/prompts?id=${id}`, { method: 'DELETE' })
    setPrompts(prev => prev.filter(p => p.id !== id))
    setDeletingId(null)
    router.refresh()
  }

  async function persistOrder(ordered: Prompt[]) {
    await fetch('/api/profile/prompts', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderedIds: ordered.map(p => p.id) }),
    })
  }

  function handleDrop(i: number) {
    if (dragSrc === null || dragSrc === i) { setDragSrc(null); setDragOver(null); return }
    const next = [...prompts]
    const [moved] = next.splice(dragSrc, 1)
    next.splice(i, 0, moved!)
    setPrompts(next)
    setDragSrc(null)
    setDragOver(null)
    void persistOrder(next)
  }

  return (
    <section>
      <div className='flex items-center justify-between mb-4'>
        <div className='flex items-center gap-2'>
          <div className='h-4 w-1 bg-stride-yellow-accent rounded-full' aria-hidden='true' />
          <h2 className='text-white font-semibold text-sm tracking-wide'>Prompts</h2>
        </div>
        {isOwnProfile && canAdd && !adding && (
          <button
            onClick={() => setAdding(true)}
            className='flex items-center gap-1.5 text-xs text-white/35 hover:text-stride-yellow-accent transition-colors min-h-9'
          >
            <Plus size={12} />
            Add prompt
          </button>
        )}
      </div>

      {/* Add form */}
      {isOwnProfile && adding && (
        <div className='bg-white/5 border border-white/15 rounded-2xl p-5 mb-5'>
          <div className='flex items-center justify-between mb-4'>
            <span className='text-white font-semibold text-sm'>Add prompt</span>
            <button onClick={() => { setAdding(false); setForm(EMPTY_FORM) }} className='text-white/30 hover:text-white transition-colors min-h-9 min-w-9 flex items-center justify-center'>
              <X size={15} />
            </button>
          </div>
          <PromptForm form={form} setForm={setForm} questions={availableFor()} />
          <button
            onClick={handleAdd}
            disabled={saving || !form.question || !form.answer.trim()}
            className='mt-4 w-full bg-stride-yellow-accent text-copy-black font-bold py-3 rounded-xl hover:bg-stride-yellow-accent/90 transition-colors disabled:opacity-50 min-h-11'
          >
            {saving ? <span className='flex items-center justify-center gap-2'><Spinner /> Saving…</span> : 'Save prompt'}
          </button>
        </div>
      )}

      {/* Prompts list */}
      {prompts.length > 0 && (
        <div className='space-y-2.5'>
          {prompts.map((prompt, i) => {
            const isEditing = editingId === prompt.id
            const isOver = dragOver === i && dragSrc !== i
            const isDragging = dragSrc === i

            if (isEditing) {
              return (
                <div key={prompt.id} className='bg-white/5 border border-stride-yellow-accent/30 rounded-2xl p-4'>
                  <PromptForm form={editForm} setForm={setEditForm} questions={availableFor(prompt.question)} />
                  <div className='flex gap-2 mt-3'>
                    <button onClick={() => handleEditSave(prompt.id)} disabled={saving || !editForm.question || !editForm.answer.trim()}
                      className='flex items-center gap-1.5 bg-stride-yellow-accent text-copy-black text-xs font-semibold px-3 py-2 rounded-lg hover:bg-stride-yellow-accent/90 disabled:opacity-50 min-h-9'>
                      {saving ? <Spinner className='w-3 h-3' /> : <Check size={13} />} Save
                    </button>
                    <button onClick={() => setEditingId(null)}
                      className='flex items-center gap-1.5 text-white/40 hover:text-white text-xs px-3 py-2 rounded-lg border border-white/15 transition-colors min-h-9'>
                      <X size={13} /> Cancel
                    </button>
                  </div>
                </div>
              )
            }

            return (
              <div
                key={prompt.id}
                draggable={isOwnProfile}
                onDragStart={() => setDragSrc(i)}
                onDragOver={e => { e.preventDefault(); if (i !== dragOver) setDragOver(i) }}
                onDrop={() => handleDrop(i)}
                onDragEnd={() => { setDragSrc(null); setDragOver(null) }}
                className={`group flex items-start gap-3.5 rounded-2xl border bg-white/6 backdrop-blur-md px-4 py-4 transition-all ${
                  isOver ? 'border-stride-yellow-accent bg-stride-yellow-accent/5'
                    : isDragging ? 'border-white/10 opacity-40'
                    : 'border-white/12 hover:border-stride-yellow-accent/40'
                }`}
              >
                {isOwnProfile && (
                  <span className='shrink-0 mt-1 text-white/20 hover:text-white/50 cursor-grab active:cursor-grabbing' aria-label='Drag to reorder'>
                    <GripVertical size={16} />
                  </span>
                )}

                {/* Quote mark */}
                <span className='shrink-0 mt-0.5 text-stride-yellow-accent/60' aria-hidden='true'>
                  <Quote size={16} />
                </span>

                {/* Question + answer */}
                <div className='min-w-0 flex-1'>
                  <p className='text-stride-yellow-accent/80 text-xs font-medium font-mono tracking-wide'>{prompt.question}</p>
                  <p className='text-white text-sm leading-relaxed mt-1.5 whitespace-pre-line break-words'>{prompt.answer}</p>
                </div>

                {isOwnProfile && (
                  <div className='flex items-center gap-1 shrink-0'>
                    <button onClick={() => startEdit(prompt)} className='text-white/25 hover:text-white transition-colors p-1.5' aria-label='Edit prompt'>
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleDelete(prompt.id)} disabled={deletingId === prompt.id}
                      className='text-white/20 hover:text-red-400 transition-colors disabled:opacity-50 p-1.5' aria-label='Delete prompt'>
                      {deletingId === prompt.id ? <Spinner /> : <X size={14} />}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {prompts.length === 0 && isOwnProfile && !adding && (
        <div className='border border-dashed border-white/12 rounded-2xl p-8 text-center'>
          <Quote size={22} className='text-white/15 mx-auto mb-2' />
          <p className='text-white/25 text-sm'>Answer a prompt to show some personality</p>
          <button
            onClick={() => setAdding(true)}
            className='mt-3 text-stride-yellow-accent text-xs hover:text-stride-yellow-accent/80 transition-colors min-h-9'
          >
            Add your first prompt →
          </button>
        </div>
      )}

      {prompts.length === 0 && !isOwnProfile && (
        <div className='border border-dashed border-white/12 rounded-2xl p-8 text-center'>
          <Quote size={22} className='text-white/15 mx-auto mb-2' />
          <p className='text-white/25 text-sm'>No prompts yet.</p>
        </div>
      )}

      {isOwnProfile && prompts.length > 1 && (
        <p className='text-white/20 text-[11px] mt-3 text-center'>Drag to reorder · {prompts.length}/{MAX_PROMPTS} prompts</p>
      )}
    </section>
  )
}

function PromptForm({
  form, setForm, questions,
}: {
  form: FormState
  setForm: React.Dispatch<React.SetStateAction<FormState>>
  questions: readonly string[]
}) {
  const remaining = PROMPT_ANSWER_MAX - form.answer.length
  return (
    <div className='space-y-3'>
      <select
        className='w-full bg-white/8 border border-white/20 rounded-xl px-3.5 py-2.5 text-white text-sm appearance-none focus:outline-none focus:border-stride-yellow-accent/60 transition-colors'
        value={form.question}
        onChange={e => setForm(f => ({ ...f, question: e.target.value }))}
      >
        <option value='' className='bg-stride-purple-primary'>Choose a prompt…</option>
        {questions.map(q => (
          <option key={q} value={q} className='bg-stride-purple-primary'>{q}</option>
        ))}
      </select>

      <div className='bg-white/8 border border-white/20 rounded-xl px-3.5 py-2.5 focus-within:border-stride-yellow-accent/60 transition-colors'>
        <textarea
          className='w-full bg-transparent text-white text-sm placeholder:text-white/25 focus:outline-none resize-none'
          placeholder='Your answer…'
          rows={3}
          maxLength={PROMPT_ANSWER_MAX}
          value={form.answer}
          onChange={e => setForm(f => ({ ...f, answer: e.target.value }))}
        />
        <p className={`text-right text-[11px] mt-1 ${remaining <= 20 ? 'text-stride-yellow-accent/80' : 'text-white/30'}`}>
          {remaining}
        </p>
      </div>
    </div>
  )
}
