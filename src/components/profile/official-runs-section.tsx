'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trophy, ExternalLink, Plus, X, Calendar, Clock, Flag } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import type { OfficialRun } from '@/types/strava'

const PRESET_RACES: { group: string; races: string[] }[] = [
  {
    group: 'Bengaluru',
    races: ['Wipro Bengaluru 10K', 'Wipro Half Marathon', 'TCS World 10K', 'Bengaluru Ultra'],
  },
  {
    group: 'Mumbai',
    races: ['Tata Mumbai Marathon', 'Standard Chartered Mumbai Half Marathon', 'IDBI Mumbai Half Marathon'],
  },
  {
    group: 'Delhi & NCR',
    races: ['Airtel Delhi Half Marathon', 'Delhi Marathon'],
  },
  {
    group: 'Other India',
    races: [
      'Tata Steel Kolkata 25K', 'Hyderabad Marathon', 'Pune Marathon',
      'Kaveri Trail Marathon', 'Nashik Valley Marathon',
    ],
  },
  {
    group: 'International',
    races: [
      'Boston Marathon', 'London Marathon', 'Berlin Marathon', 'Chicago Marathon',
      'New York Marathon', 'Tokyo Marathon', 'Comrades Marathon', 'Two Oceans Marathon', 'UTMB',
    ],
  },
  { group: 'Fitness Racing', races: ['Hyrox'] },
]

const DISTANCE_CATEGORIES = ['1 Mile', '5K', '10K', 'Half Marathon', 'Marathon', 'Ultra', 'Other']

const DISTANCE_ACCENT: Record<string, string> = {
  '1 Mile':        'from-blue-500/60',
  '5K':            'from-green-500/60',
  '10K':           'from-teal-500/60',
  'Half Marathon': 'from-blue-400/60',
  'Marathon':      'from-stride-yellow-accent/60',
  'Ultra':         'from-orange-500/60',
  'Other':         'from-white/20',
}

const DISTANCE_DOT: Record<string, string> = {
  '1 Mile':        'bg-blue-500',
  '5K':            'bg-green-500',
  '10K':           'bg-teal-500',
  'Half Marathon': 'bg-blue-400',
  'Marathon':      'bg-stride-yellow-accent',
  'Ultra':         'bg-orange-500',
  'Other':         'bg-white/40',
}

const EMPTY_FORM = {
  raceName: '', customRaceName: '', distanceCategory: '',
  raceDate: '', finishTime: '', stravaActivityUrl: '', isUpcoming: false,
}

type Props = { initialRuns: OfficialRun[]; isOwnProfile: boolean }

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

export function OfficialRunsSection({ initialRuns, isOwnProfile }: Props) {
  const [runs, setRuns] = useState<OfficialRun[]>(initialRuns)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const router = useRouter()

  const inputCls = 'w-full bg-white/8 border border-white/20 rounded-xl px-3.5 py-2.5 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-stride-yellow-accent/60 transition-colors'
  const labelCls = 'text-white/50 text-xs font-medium block mb-1.5'

  const isCustomRace = form.raceName === '__custom__'
  const effectiveRaceName = isCustomRace ? form.customRaceName : form.raceName

  async function handleSave() {
    if (!effectiveRaceName.trim()) return
    setSaving(true)
    const res = await fetch('/api/profile/official-runs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        raceName: effectiveRaceName.trim(),
        distanceCategory: form.distanceCategory || undefined,
        raceDate: form.raceDate || undefined,
        finishTime: form.finishTime || undefined,
        stravaActivityUrl: form.stravaActivityUrl || undefined,
        isUpcoming: form.isUpcoming,
      }),
    })
    setSaving(false)
    if (res.ok) {
      const { run } = await res.json() as { run: OfficialRun }
      setRuns(prev => [run, ...prev])
      setForm(EMPTY_FORM)
      setShowForm(false)
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

  const upcomingRuns = runs.filter(r => r.is_upcoming)
  const pastRuns = runs.filter(r => !r.is_upcoming)

  if (runs.length === 0 && !isOwnProfile) return null

  return (
    <section className='mt-10'>
      <div className='flex items-center justify-between mb-4'>
        <div className='flex items-center gap-2'>
          <div className='h-4 w-1 bg-stride-yellow-accent rounded-full' aria-hidden='true' />
          <h2 className='text-white font-semibold text-sm tracking-wide'>Official races</h2>
        </div>
        {isOwnProfile && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className='flex items-center gap-1.5 text-xs text-white/35 hover:text-stride-yellow-accent transition-colors'
          >
            <Plus size={12} />
            Add race
          </button>
        )}
      </div>

      {/* Add run form */}
      {isOwnProfile && showForm && (
        <div className='bg-white/5 border border-white/15 rounded-2xl p-5 mb-5'>
          <div className='flex items-center justify-between mb-5'>
            <span className='text-white font-semibold text-sm'>Add race</span>
            <button onClick={() => { setShowForm(false); setForm(EMPTY_FORM) }} className='text-white/30 hover:text-white transition-colors'>
              <X size={15} />
            </button>
          </div>

          <div className='space-y-4'>
            <div>
              <label className={labelCls}>Race name</label>
              <select className={inputCls} value={form.raceName}
                onChange={e => setForm(f => ({ ...f, raceName: e.target.value, customRaceName: '' }))}
              >
                <option value=''>Select a race…</option>
                {PRESET_RACES.map(group => (
                  <optgroup key={group.group} label={group.group}>
                    {group.races.map(race => <option key={race} value={race}>{race}</option>)}
                  </optgroup>
                ))}
                <option value='__custom__'>Other (enter below)</option>
              </select>
              {isCustomRace && (
                <input className={`${inputCls} mt-2`} placeholder='Race name…'
                  value={form.customRaceName}
                  onChange={e => setForm(f => ({ ...f, customRaceName: e.target.value }))}
                />
              )}
            </div>

            <div>
              <label className={labelCls}>Distance</label>
              <select className={inputCls} value={form.distanceCategory}
                onChange={e => setForm(f => ({ ...f, distanceCategory: e.target.value }))}
              >
                <option value=''>Select distance…</option>
                {DISTANCE_CATEGORIES.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div>
              <label className={labelCls}>Status</label>
              <div className='flex gap-2'>
                {[false, true].map(upcoming => (
                  <button
                    key={String(upcoming)}
                    onClick={() => setForm(f => ({ ...f, isUpcoming: upcoming }))}
                    className={`flex-1 py-2.5 text-sm rounded-xl border transition-all ${
                      form.isUpcoming === upcoming
                        ? 'bg-stride-yellow-accent/15 border-stride-yellow-accent text-stride-yellow-accent'
                        : 'border-white/15 text-white/40 hover:border-white/30'
                    }`}
                  >
                    {upcoming ? 'Upcoming' : 'Completed'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={labelCls}>Race date</label>
              <input type='date' className={`${inputCls} scheme-dark`} value={form.raceDate}
                onChange={e => setForm(f => ({ ...f, raceDate: e.target.value }))}
              />
            </div>

            {!form.isUpcoming && (
              <div>
                <label className={labelCls}>Finish time (e.g. 1:45:30)</label>
                <input className={inputCls} placeholder='H:MM:SS or MM:SS' value={form.finishTime}
                  onChange={e => setForm(f => ({ ...f, finishTime: e.target.value }))}
                />
              </div>
            )}

            <div>
              <label className={labelCls}>Strava activity link (optional)</label>
              <input className={inputCls} placeholder='https://www.strava.com/activities/…'
                value={form.stravaActivityUrl}
                onChange={e => setForm(f => ({ ...f, stravaActivityUrl: e.target.value }))}
              />
            </div>

            <button
              onClick={handleSave}
              disabled={saving || !effectiveRaceName.trim()}
              className='w-full bg-stride-yellow-accent text-copy-black font-bold py-3 rounded-xl hover:bg-stride-yellow-accent/90 transition-colors disabled:opacity-50 min-h-11'
            >
              {saving ? <span className='flex items-center justify-center gap-2'><Spinner /> Saving…</span> : 'Save race'}
            </button>
          </div>
        </div>
      )}

      {/* Upcoming runs */}
      {upcomingRuns.length > 0 && (
        <div className='mb-4'>
          <p className='text-white/25 text-[10px] uppercase tracking-widest mb-2.5 flex items-center gap-2'>
            <Flag size={9} /> Upcoming
          </p>
          <div className='space-y-2'>
            {upcomingRuns.map(run => (
              <RunCard key={run.id} run={run} isOwnProfile={isOwnProfile} onDelete={handleDelete} deletingId={deletingId} />
            ))}
          </div>
        </div>
      )}

      {/* Past runs */}
      {pastRuns.length > 0 && (
        <div>
          <p className='text-white/25 text-[10px] uppercase tracking-widest mb-2.5 flex items-center gap-2'>
            <Trophy size={9} /> Completed
          </p>
          <div className='space-y-2'>
            {pastRuns.map(run => (
              <RunCard key={run.id} run={run} isOwnProfile={isOwnProfile} onDelete={handleDelete} deletingId={deletingId} />
            ))}
          </div>
        </div>
      )}

      {runs.length === 0 && isOwnProfile && !showForm && (
        <div className='border border-dashed border-white/12 rounded-2xl p-8 text-center'>
          <Trophy size={22} className='text-white/15 mx-auto mb-2' />
          <p className='text-white/25 text-sm'>Track your official race history here</p>
          <button
            onClick={() => setShowForm(true)}
            className='mt-3 text-stride-yellow-accent text-xs hover:text-stride-yellow-accent/80 transition-colors'
          >
            Add your first race →
          </button>
        </div>
      )}
    </section>
  )
}

function RunCard({
  run, isOwnProfile, onDelete, deletingId,
}: {
  run: OfficialRun; isOwnProfile: boolean
  onDelete: (id: string) => void; deletingId: string | null
}) {
  const isDeleting = deletingId === run.id
  const accent = run.distance_category ? (DISTANCE_DOT[run.distance_category] ?? 'bg-white/30') : 'bg-white/20'
  const gradientAccent = run.distance_category ? (DISTANCE_ACCENT[run.distance_category] ?? 'from-white/10') : 'from-white/5'

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-white/10 bg-linear-to-r ${gradientAccent} to-transparent hover:border-white/20 transition-colors`}>
      <div className='flex items-stretch'>
        {/* Left accent bar */}
        <div className={`w-1 shrink-0 ${accent} rounded-l-2xl`} />

        {/* Content */}
        <div className='flex-1 px-4 py-3.5 min-w-0'>
          <div className='flex items-start justify-between gap-3'>
            <div className='min-w-0'>
              <div className='flex items-center gap-2 flex-wrap mb-1'>
                <p className='text-white font-semibold text-sm leading-snug truncate'>{run.race_name}</p>
                {run.is_upcoming && (
                  <span className='text-[9px] px-1.5 py-0.5 rounded-full bg-stride-yellow-accent/20 text-stride-yellow-accent border border-stride-yellow-accent/30 font-bold uppercase tracking-wider shrink-0'>
                    Upcoming
                  </span>
                )}
              </div>

              <div className='flex items-center gap-3 flex-wrap'>
                {run.distance_category && (
                  <span className='text-xs text-white/50 font-medium'>{run.distance_category}</span>
                )}
                {run.race_date && (
                  <span className='flex items-center gap-1 text-white/35 text-xs'>
                    <Calendar size={10} />
                    {formatDate(run.race_date)}
                  </span>
                )}
              </div>
            </div>

            {/* Finish time — prominent */}
            <div className='flex items-center gap-2 shrink-0'>
              {run.finish_time && !run.is_upcoming && (
                <div className='flex items-center gap-1 bg-white/8 rounded-lg px-2.5 py-1.5'>
                  <Clock size={11} className='text-stride-yellow-accent/70' />
                  <span className='text-white font-bold text-sm font-mono tabular-nums'>{run.finish_time}</span>
                </div>
              )}
              {run.strava_activity_url && (
                <a href={run.strava_activity_url} target='_blank' rel='noopener noreferrer'
                  className='text-white/20 hover:text-[#FC4C02] transition-colors p-1'
                  aria-label='View on Strava'
                >
                  <ExternalLink size={12} />
                </a>
              )}
              {isOwnProfile && (
                <button onClick={() => onDelete(run.id)} disabled={isDeleting}
                  className='text-white/15 hover:text-red-400 transition-colors disabled:opacity-50 p-1'
                  aria-label='Delete race'
                >
                  {isDeleting ? <Spinner /> : <X size={13} />}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
