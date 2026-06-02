'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trophy, Plus, X, Clock, Check, Pencil, GripVertical } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import type { OfficialRun } from '@/types/strava'

const MAX_RUNS = 10
const DISTANCE_SUGGESTIONS = ['5K', '10K', 'Half Marathon', 'Marathon', 'Ultra']

type Props = { initialRuns: OfficialRun[]; isOwnProfile: boolean }

type FormState = { raceName: string; distance: string; finishTime: string }
const EMPTY_FORM: FormState = { raceName: '', distance: '', finishTime: '' }

export function OfficialRunsSection({ initialRuns, isOwnProfile }: Props) {
  const [runs, setRuns] = useState<OfficialRun[]>(initialRuns)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [dragSrc, setDragSrc] = useState<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)
  const router = useRouter()

  const inputCls = 'w-full bg-white/8 border border-white/20 rounded-xl px-3.5 py-2.5 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-stride-yellow-accent/60 transition-colors'
  const labelCls = 'text-white/50 text-xs font-medium block mb-1.5'
  const canAdd = runs.length < MAX_RUNS

  async function handleAdd() {
    if (!form.raceName.trim()) return
    setSaving(true)
    const res = await fetch('/api/profile/official-runs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        raceName: form.raceName.trim(),
        distance: form.distance.trim() || undefined,
        finishTime: form.finishTime.trim() || undefined,
      }),
    })
    setSaving(false)
    if (res.ok) {
      const { run } = await res.json() as { run: OfficialRun }
      setRuns(prev => [...prev, run])
      setForm(EMPTY_FORM)
      setAdding(false)
      router.refresh()
    }
  }

  function startEdit(run: OfficialRun) {
    setEditingId(run.id)
    setEditForm({
      raceName: run.race_name,
      distance: run.distance_category ?? '',
      finishTime: run.finish_time ?? '',
    })
  }

  async function handleEditSave(id: string) {
    if (!editForm.raceName.trim()) return
    setSaving(true)
    const res = await fetch('/api/profile/official-runs', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id,
        raceName: editForm.raceName.trim(),
        distance: editForm.distance.trim() || undefined,
        finishTime: editForm.finishTime.trim() || undefined,
      }),
    })
    setSaving(false)
    if (res.ok) {
      const { run } = await res.json() as { run: OfficialRun }
      setRuns(prev => prev.map(r => r.id === id ? run : r))
      setEditingId(null)
      router.refresh()
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    await fetch(`/api/profile/official-runs?id=${id}`, { method: 'DELETE' })
    setRuns(prev => prev.filter(r => r.id !== id))
    setDeletingId(null)
    router.refresh()
  }

  async function persistOrder(ordered: OfficialRun[]) {
    await fetch('/api/profile/official-runs', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderedIds: ordered.map(r => r.id) }),
    })
  }

  function handleDrop(i: number) {
    if (dragSrc === null || dragSrc === i) { setDragSrc(null); setDragOver(null); return }
    const next = [...runs]
    const [moved] = next.splice(dragSrc, 1)
    next.splice(i, 0, moved!)
    setRuns(next)
    setDragSrc(null)
    setDragOver(null)
    void persistOrder(next)
  }

  return (
    <section>
      <div className='flex items-center justify-between mb-4'>
        <div className='flex items-center gap-2'>
          <div className='h-4 w-1 bg-stride-yellow-accent rounded-full' aria-hidden='true' />
          <h2 className='text-white font-semibold text-sm tracking-wide'>Official races</h2>
        </div>
        {isOwnProfile && canAdd && !adding && (
          <button
            onClick={() => setAdding(true)}
            className='flex items-center gap-1.5 text-xs text-white/35 hover:text-stride-yellow-accent transition-colors'
          >
            <Plus size={12} />
            Add race
          </button>
        )}
      </div>

      {/* Add form */}
      {isOwnProfile && adding && (
        <div className='bg-white/5 border border-white/15 rounded-2xl p-5 mb-5'>
          <div className='flex items-center justify-between mb-4'>
            <span className='text-white font-semibold text-sm'>Add race</span>
            <button onClick={() => { setAdding(false); setForm(EMPTY_FORM) }} className='text-white/30 hover:text-white transition-colors'>
              <X size={15} />
            </button>
          </div>
          <div className='space-y-3'>
            <div>
              <label className={labelCls}>Race name</label>
              <input className={inputCls} placeholder='e.g. Tata Mumbai Marathon' value={form.raceName}
                onChange={e => setForm(f => ({ ...f, raceName: e.target.value }))} autoFocus />
            </div>
            <div className='grid grid-cols-2 gap-3'>
              <div>
                <label className={labelCls}>Distance</label>
                <input className={inputCls} placeholder='e.g. 10K' list='distance-suggestions' value={form.distance}
                  onChange={e => setForm(f => ({ ...f, distance: e.target.value }))} />
                <datalist id='distance-suggestions'>
                  {DISTANCE_SUGGESTIONS.map(d => <option key={d} value={d} />)}
                </datalist>
              </div>
              <div>
                <label className={labelCls}>Time</label>
                <input className={inputCls} placeholder='H:MM:SS' value={form.finishTime}
                  onChange={e => setForm(f => ({ ...f, finishTime: e.target.value }))} />
              </div>
            </div>
            <button
              onClick={handleAdd}
              disabled={saving || !form.raceName.trim()}
              className='w-full bg-stride-yellow-accent text-copy-black font-bold py-3 rounded-xl hover:bg-stride-yellow-accent/90 transition-colors disabled:opacity-50 min-h-11'
            >
              {saving ? <span className='flex items-center justify-center gap-2'><Spinner /> Saving…</span> : 'Save race'}
            </button>
          </div>
        </div>
      )}

      {/* Runs list */}
      {runs.length > 0 && (
        <div className='space-y-2'>
          {runs.map((run, i) => {
            const isEditing = editingId === run.id
            const isOver = dragOver === i && dragSrc !== i
            const isDragging = dragSrc === i

            if (isEditing) {
              return (
                <div key={run.id} className='bg-white/5 border border-stride-yellow-accent/30 rounded-2xl p-4 space-y-3'>
                  <input className={inputCls} value={editForm.raceName}
                    onChange={e => setEditForm(f => ({ ...f, raceName: e.target.value }))} />
                  <div className='grid grid-cols-2 gap-3'>
                    <input className={inputCls} placeholder='Distance' list='distance-suggestions' value={editForm.distance}
                      onChange={e => setEditForm(f => ({ ...f, distance: e.target.value }))} />
                    <input className={inputCls} placeholder='Time' value={editForm.finishTime}
                      onChange={e => setEditForm(f => ({ ...f, finishTime: e.target.value }))} />
                  </div>
                  <div className='flex gap-2'>
                    <button onClick={() => handleEditSave(run.id)} disabled={saving || !editForm.raceName.trim()}
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
                key={run.id}
                draggable={isOwnProfile}
                onDragStart={() => setDragSrc(i)}
                onDragOver={e => { e.preventDefault(); if (i !== dragOver) setDragOver(i) }}
                onDrop={() => handleDrop(i)}
                onDragEnd={() => { setDragSrc(null); setDragOver(null) }}
                className={`flex items-center gap-3 rounded-2xl border px-4 py-3.5 transition-all ${
                  isOver ? 'border-stride-yellow-accent bg-stride-yellow-accent/5'
                    : isDragging ? 'border-white/10 opacity-40'
                    : 'border-white/10 bg-white/4 hover:border-white/20'
                }`}
              >
                {isOwnProfile && (
                  <span className='shrink-0 text-white/25 hover:text-white/50 cursor-grab active:cursor-grabbing' aria-label='Drag to reorder'>
                    <GripVertical size={15} />
                  </span>
                )}
                <div className='min-w-0 flex-1'>
                  <p className='text-white font-semibold text-sm leading-snug truncate'>{run.race_name}</p>
                  {run.distance_category && (
                    <span className='text-white/45 text-xs'>{run.distance_category}</span>
                  )}
                </div>
                {run.finish_time && (
                  <div className='flex items-center gap-1 bg-white/8 rounded-lg px-2.5 py-1.5 shrink-0'>
                    <Clock size={11} className='text-stride-yellow-accent/70' />
                    <span className='text-white font-bold text-sm font-mono tabular-nums'>{run.finish_time}</span>
                  </div>
                )}
                {isOwnProfile && (
                  <div className='flex items-center gap-1 shrink-0'>
                    <button onClick={() => startEdit(run)} className='text-white/25 hover:text-white transition-colors p-1' aria-label='Edit race'>
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => handleDelete(run.id)} disabled={deletingId === run.id}
                      className='text-white/20 hover:text-red-400 transition-colors disabled:opacity-50 p-1' aria-label='Delete race'>
                      {deletingId === run.id ? <Spinner /> : <X size={13} />}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {runs.length === 0 && isOwnProfile && !adding && (
        <div className='border border-dashed border-white/12 rounded-2xl p-8 text-center'>
          <Trophy size={22} className='text-white/15 mx-auto mb-2' />
          <p className='text-white/25 text-sm'>Track your official race history here</p>
          <button
            onClick={() => setAdding(true)}
            className='mt-3 text-stride-yellow-accent text-xs hover:text-stride-yellow-accent/80 transition-colors'
          >
            Add your first race →
          </button>
        </div>
      )}

      {runs.length === 0 && !isOwnProfile && (
        <div className='border border-dashed border-white/12 rounded-2xl p-8 text-center'>
          <Trophy size={22} className='text-white/15 mx-auto mb-2' />
          <p className='text-white/25 text-sm'>No official races logged yet.</p>
        </div>
      )}

      {isOwnProfile && runs.length > 1 && (
        <p className='text-white/20 text-[11px] mt-3 text-center'>Drag to reorder · {runs.length}/{MAX_RUNS} races</p>
      )}
    </section>
  )
}
