'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trophy, Plus, X, Clock, Check, Pencil, GripVertical, Flag, Ruler, Calendar } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import type { OfficialRun } from '@/types/user'

const MAX_RUNS = 10
const PRESET_DISTANCES = ['5K', '10K', '21.1K', '42.2K'] as const
// Free-text values saved before the segmented control existed
const LEGACY_DISTANCES: Record<string, string> = { 'Half Marathon': '21.1K', 'Marathon': '42.2K' }
const CUSTOM_DISTANCE_RE = /^(\d+(?:\.\d+)?)K$/
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const
const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 30 }, (_, i) => CURRENT_YEAR - i)

type Props = { initialRuns: OfficialRun[]; isOwnProfile: boolean }

type FormState = { name: string; distance: string; time: string; month: string; year: string }
const EMPTY_FORM: FormState = { name: '', distance: '', time: '', month: '', year: '' }

// Auto-insert colons as the user types a finish time: digits fill from the
// right (seconds first), so 14530 renders as 1:45:30 and 4530 as 45:30.
function formatRaceTime(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 6)
  if (d.length <= 2) return d
  if (d.length <= 4) return `${d.slice(0, -2)}:${d.slice(-2)}`
  return `${d.slice(0, -4)}:${d.slice(-4, -2)}:${d.slice(-2)}`
}

function toForm(run: OfficialRun): FormState {
  const rawDistance = run.distance ?? ''
  return {
    name: run.name,
    distance: LEGACY_DISTANCES[rawDistance] ?? rawDistance,
    time: run.time ?? '',
    month: run.month ? String(run.month) : '',
    year: run.year ? String(run.year) : '',
  }
}

function toPayload(form: FormState) {
  return {
    name: form.name.trim(),
    distance: form.distance.trim() || undefined,
    time: form.time.trim() || undefined,
    month: form.month ? Number(form.month) : null,
    year: form.year ? Number(form.year) : null,
  }
}

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

  const canAdd = runs.length < MAX_RUNS

  async function handleAdd() {
    if (!form.name.trim()) return
    setSaving(true)
    const res = await fetch('/api/profile/official-runs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toPayload(form)),
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
    setEditForm(toForm(run))
  }

  async function handleEditSave(id: string) {
    if (!editForm.name.trim()) return
    setSaving(true)
    const res = await fetch('/api/profile/official-runs', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...toPayload(editForm) }),
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
            className='flex items-center gap-1.5 text-xs text-white/35 hover:text-stride-yellow-accent transition-colors min-h-9'
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
            <button onClick={() => { setAdding(false); setForm(EMPTY_FORM) }} className='text-white/30 hover:text-white transition-colors min-h-9 min-w-9 flex items-center justify-center'>
              <X size={15} />
            </button>
          </div>
          <RunForm form={form} setForm={setForm} />
          <button
            onClick={handleAdd}
            disabled={saving || !form.name.trim()}
            className='mt-4 w-full bg-stride-yellow-accent text-copy-black font-bold py-3 rounded-xl hover:bg-stride-yellow-accent/90 transition-colors disabled:opacity-50 min-h-11'
          >
            {saving ? <span className='flex items-center justify-center gap-2'><Spinner /> Saving…</span> : 'Save race'}
          </button>
        </div>
      )}

      {/* Runs list */}
      {runs.length > 0 && (
        <div className='space-y-2.5'>
          {runs.map((run, i) => {
            const isEditing = editingId === run.id
            const isOver = dragOver === i && dragSrc !== i
            const isDragging = dragSrc === i

            if (isEditing) {
              return (
                <div key={run.id} className='bg-white/5 border border-stride-yellow-accent/30 rounded-2xl p-4'>
                  <RunForm form={editForm} setForm={setEditForm} />
                  <div className='flex gap-2 mt-3'>
                    <button onClick={() => handleEditSave(run.id)} disabled={saving || !editForm.name.trim()}
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
                className={`group flex items-center gap-3.5 rounded-2xl border bg-white/6 backdrop-blur-md px-4 py-4 transition-all ${
                  isOver ? 'border-stride-yellow-accent bg-stride-yellow-accent/5'
                    : isDragging ? 'border-white/10 opacity-40'
                    : 'border-white/12 hover:border-stride-yellow-accent/40'
                }`}
              >
                {isOwnProfile && (
                  <span className='shrink-0 text-white/20 hover:text-white/50 cursor-grab active:cursor-grabbing' aria-label='Drag to reorder'>
                    <GripVertical size={16} />
                  </span>
                )}

                {/* Calendar chip — month + year (matches the events page) */}
                <div className='shrink-0 w-12 h-12 rounded-xl bg-white/8 border border-white/12 flex flex-col items-center justify-center leading-none gap-0.5'>
                  {run.month || run.year ? (
                    <>
                      {run.month && (
                        <span className='text-stride-yellow-accent text-[8px] font-black font-mono uppercase tracking-widest'>
                          {MONTHS[run.month - 1]}
                        </span>
                      )}
                      {run.year && (
                        <span className='text-white font-bold text-sm leading-none font-mono tabular-nums'>{run.year}</span>
                      )}
                    </>
                  ) : (
                    <Trophy size={18} className='text-stride-yellow-accent' />
                  )}
                </div>

                {/* Name + distance chip */}
                <div className='min-w-0 flex-1'>
                  <p className='text-white font-semibold text-sm leading-snug line-clamp-1'>{run.name}</p>
                  {run.distance && (
                    <span className='mt-1.5 inline-flex items-center rounded-md bg-stride-yellow-accent/15 border border-stride-yellow-accent/25 px-2 py-0.5 text-[11px] font-mono font-bold text-stride-yellow-accent'>
                      {run.distance}
                    </span>
                  )}
                </div>

                {/* Finish time — the hero stat of a race card */}
                {run.time && (
                  <div className='shrink-0 text-right'>
                    <p className='text-[9px] font-mono uppercase tracking-[0.2em] text-white/35'>Finish</p>
                    <p className='text-white font-bold font-mono tabular-nums text-base leading-tight'>{run.time}</p>
                  </div>
                )}

                {isOwnProfile && (
                  <div className='flex items-center gap-1 shrink-0'>
                    <button onClick={() => startEdit(run)} className='text-white/25 hover:text-white transition-colors p-1.5' aria-label='Edit race'>
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleDelete(run.id)} disabled={deletingId === run.id}
                      className='text-white/20 hover:text-red-400 transition-colors disabled:opacity-50 p-1.5' aria-label='Delete race'>
                      {deletingId === run.id ? <Spinner /> : <X size={14} />}
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
            className='mt-3 text-stride-yellow-accent text-xs hover:text-stride-yellow-accent/80 transition-colors min-h-9'
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

// ── Shared labeled form, used for both add + edit ──

type DistanceKind = '' | 'preset' | 'custom' | 'na'

function deriveDistanceKind(distance: string): DistanceKind {
  if (!distance) return ''
  if ((PRESET_DISTANCES as readonly string[]).includes(distance)) return 'preset'
  if (CUSTOM_DISTANCE_RE.test(distance)) return 'custom'
  return '' // unknown legacy free text — nothing highlighted, value kept until changed
}

function RunForm({ form, setForm }: { form: FormState; setForm: React.Dispatch<React.SetStateAction<FormState>> }) {
  const [kind, setKind] = useState<DistanceKind>(() => deriveDistanceKind(form.distance))
  const [customKm, setCustomKm] = useState<string>(() => CUSTOM_DISTANCE_RE.exec(form.distance)?.[1] ?? '')

  function pickPreset(d: string) {
    setKind('preset')
    setForm(f => ({ ...f, distance: d }))
  }

  function pickCustom() {
    setKind('custom')
    setForm(f => ({ ...f, distance: customKm ? `${customKm}K` : '' }))
  }

  function pickNa() {
    setKind('na')
    setCustomKm('')
    setForm(f => ({ ...f, distance: '' }))
  }

  function handleCustomKm(raw: string) {
    // Digits with an optional single decimal point, clamped to 1–1000
    const cleaned = raw.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1')
    setCustomKm(cleaned)
    const num = Number(cleaned)
    const valid = cleaned !== '' && Number.isFinite(num) && num >= 1 && num <= 1000
    setForm(f => ({ ...f, distance: valid ? `${cleaned}K` : '' }))
  }

  const customNum = Number(customKm)
  const customInvalid = kind === 'custom' && customKm !== '' && !(customNum >= 1 && customNum <= 1000)
  const chipBase = 'min-h-9 px-3 rounded-md text-xs font-semibold transition-colors'
  const chipOff = 'bg-white/8 border border-white/15 text-white/60 hover:border-stride-yellow-accent/40 hover:text-white'
  const chipOn = 'bg-stride-yellow-accent border border-stride-yellow-accent text-copy-black'

  return (
    <div className='space-y-4'>
      <label className='block'>
        <span className={LABEL_CLS}>Race name</span>
        <Field icon={<Flag size={15} className='text-white/40' />}>
          <input
            className={INPUT_CLS}
            placeholder='e.g. Tata Mumbai Marathon'
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            autoFocus
          />
        </Field>
      </label>

      <div>
        <span className={LABEL_CLS}>Distance</span>
        <div className='flex flex-wrap gap-1.5' role='radiogroup' aria-label='Race distance'>
          {PRESET_DISTANCES.map(d => (
            <button key={d} type='button' role='radio' aria-checked={kind === 'preset' && form.distance === d}
              onClick={() => pickPreset(d)}
              className={`${chipBase} font-mono ${kind === 'preset' && form.distance === d ? chipOn : chipOff}`}>
              {d}
            </button>
          ))}
          <button type='button' role='radio' aria-checked={kind === 'custom'} onClick={pickCustom}
            className={`${chipBase} ${kind === 'custom' ? chipOn : chipOff}`}>
            Custom
          </button>
          <button type='button' role='radio' aria-checked={kind === 'na'} onClick={pickNa}
            className={`${chipBase} ${kind === 'na' ? chipOn : chipOff}`}>
            Not applicable
          </button>
        </div>
        {kind === 'custom' && (
          <div className='mt-2'>
            <Field icon={<Ruler size={15} className='text-white/40' />}>
              <input
                className={`${INPUT_CLS} font-mono`}
                placeholder='Distance in km (1–1000)'
                inputMode='decimal'
                value={customKm}
                onChange={e => handleCustomKm(e.target.value)}
              />
              <span className='text-white/40 text-sm font-mono shrink-0'>K</span>
            </Field>
            {customInvalid && (
              <p className='text-red-400 text-xs mt-1' role='alert'>Enter a distance between 1 and 1000.</p>
            )}
          </div>
        )}
      </div>

      <label className='block'>
        <span className={LABEL_CLS}>Finish time</span>
        <Field icon={<Clock size={15} className='text-white/40' />}>
          <input
            className={`${INPUT_CLS} font-mono tabular-nums`}
            placeholder='1:45:30'
            inputMode='numeric'
            value={form.time}
            onChange={e => setForm(f => ({ ...f, time: formatRaceTime(e.target.value) }))}
          />
        </Field>
      </label>

      <div>
        <span className={LABEL_CLS}>When</span>
        <div className='grid grid-cols-2 gap-3'>
          <Field icon={<Calendar size={15} className='text-white/40' />}>
            <select
              className={`${INPUT_CLS} appearance-none`}
              aria-label='Month'
              value={form.month}
              onChange={e => setForm(f => ({ ...f, month: e.target.value }))}
            >
              <option value=''>Month</option>
              {MONTHS.map((m, i) => <option key={m} value={i + 1} className='bg-stride-purple-primary'>{m}</option>)}
            </select>
          </Field>

          <Field icon={<Calendar size={15} className='text-white/40' />}>
            <select
              className={`${INPUT_CLS} appearance-none`}
              aria-label='Year'
              value={form.year}
              onChange={e => setForm(f => ({ ...f, year: e.target.value }))}
            >
              <option value=''>Year</option>
              {YEARS.map(y => <option key={y} value={y} className='bg-stride-purple-primary'>{y}</option>)}
            </select>
          </Field>
        </div>
      </div>
    </div>
  )
}

const LABEL_CLS =
  'block text-[10px] font-mono uppercase tracking-[0.18em] text-white/40 mb-1.5'

const INPUT_CLS =
  'w-full bg-transparent text-white text-sm placeholder:text-white/25 focus:outline-none'

function Field({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className='flex items-center gap-2.5 bg-white/8 border border-white/20 rounded-xl px-3.5 py-2.5 focus-within:border-stride-yellow-accent/60 transition-colors'>
      <span className='shrink-0'>{icon}</span>
      {children}
    </div>
  )
}
