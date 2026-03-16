'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trophy, ExternalLink, Plus, X, Calendar, Clock } from 'lucide-react'
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
      'Tata Steel Kolkata 25K',
      'Hyderabad Marathon',
      'Pune Marathon',
      'Kaveri Trail Marathon',
      'Nashik Valley Marathon',
    ],
  },
  {
    group: 'International',
    races: [
      'Boston Marathon',
      'London Marathon',
      'Berlin Marathon',
      'Chicago Marathon',
      'New York Marathon',
      'Tokyo Marathon',
      'Comrades Marathon',
      'Two Oceans Marathon',
      'UTMB',
    ],
  },
  {
    group: 'Fitness Racing',
    races: ['Hyrox'],
  },
]

const DISTANCE_CATEGORIES = ['1 Mile', '5K', '10K', 'Half Marathon', 'Marathon', 'Ultra', 'Other']

const EMPTY_FORM = {
  raceName: '',
  customRaceName: '',
  distanceCategory: '',
  raceDate: '',
  finishTime: '',
  stravaActivityUrl: '',
  isUpcoming: false,
}

type Props = {
  initialRuns: OfficialRun[]
  isOwnProfile: boolean
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function OfficialRunsSection({ initialRuns, isOwnProfile }: Props) {
  const [runs, setRuns] = useState<OfficialRun[]>(initialRuns)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const router = useRouter()

  const inputCls =
    'w-full bg-white/5 border border-white/15 rounded-md px-3 py-2 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-stride-yellow-accent/60'
  const labelCls = 'text-white/60 text-xs font-medium uppercase tracking-wider block mb-1'

  const allRaceNames = PRESET_RACES.flatMap((g) => g.races)
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
      setRuns((prev) => [run, ...prev])
      setForm(EMPTY_FORM)
      setShowForm(false)
      router.refresh()
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    await fetch(`/api/profile/official-runs?id=${id}`, { method: 'DELETE' })
    setRuns((prev) => prev.filter((r) => r.id !== id))
    setDeletingId(null)
    router.refresh()
  }

  const upcomingRuns = runs.filter((r) => r.is_upcoming)
  const pastRuns = runs.filter((r) => !r.is_upcoming)

  if (runs.length === 0 && !isOwnProfile) return null

  return (
    <div className='mt-8'>
      <div className='flex items-center justify-between mb-3'>
        <p className='text-white/40 text-xs uppercase tracking-widest'>Official Runs</p>
        {isOwnProfile && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className='flex items-center gap-1.5 text-xs text-white/40 hover:text-stride-yellow-accent transition-colors'
          >
            <Plus size={13} />
            Add Run
          </button>
        )}
      </div>

      {/* Add Run Form */}
      {isOwnProfile && showForm && (
        <div className='bg-white/10 backdrop-blur-md border border-white/15 rounded-xl p-5 mb-4'>
          <div className='flex items-center justify-between mb-4'>
            <span className='text-white text-sm font-medium'>Add Official Run</span>
            <button onClick={() => { setShowForm(false); setForm(EMPTY_FORM) }} className='text-white/40 hover:text-white'>
              <X size={16} />
            </button>
          </div>

          <div className='space-y-4'>
            {/* Race name */}
            <div>
              <label className={labelCls}>Race Name</label>
              <select
                className={inputCls}
                value={form.raceName}
                onChange={(e) => setForm((f) => ({ ...f, raceName: e.target.value, customRaceName: '' }))}
              >
                <option value=''>Select a race...</option>
                {PRESET_RACES.map((group) => (
                  <optgroup key={group.group} label={group.group}>
                    {group.races.map((race) => (
                      <option key={race} value={race}>{race}</option>
                    ))}
                  </optgroup>
                ))}
                <option value='__custom__'>Other (type below)</option>
              </select>
              {isCustomRace && (
                <input
                  className={`${inputCls} mt-2`}
                  placeholder='Race name...'
                  value={form.customRaceName}
                  onChange={(e) => setForm((f) => ({ ...f, customRaceName: e.target.value }))}
                />
              )}
            </div>

            {/* Distance category */}
            <div>
              <label className={labelCls}>Distance</label>
              <select
                className={inputCls}
                value={form.distanceCategory}
                onChange={(e) => setForm((f) => ({ ...f, distanceCategory: e.target.value }))}
              >
                <option value=''>Select distance...</option>
                {DISTANCE_CATEGORIES.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* Upcoming toggle */}
            <div>
              <label className={labelCls}>Status</label>
              <div className='flex gap-2'>
                <button
                  onClick={() => setForm((f) => ({ ...f, isUpcoming: false }))}
                  className={`flex-1 py-2 text-sm rounded-md border transition-colors ${
                    !form.isUpcoming
                      ? 'bg-stride-yellow-accent/20 border-stride-yellow-accent text-stride-yellow-accent'
                      : 'border-white/20 text-white/50 hover:border-white/40'
                  }`}
                >
                  Past
                </button>
                <button
                  onClick={() => setForm((f) => ({ ...f, isUpcoming: true }))}
                  className={`flex-1 py-2 text-sm rounded-md border transition-colors ${
                    form.isUpcoming
                      ? 'bg-stride-yellow-accent/20 border-stride-yellow-accent text-stride-yellow-accent'
                      : 'border-white/20 text-white/50 hover:border-white/40'
                  }`}
                >
                  Upcoming
                </button>
              </div>
            </div>

            {/* Race date */}
            <div>
              <label className={labelCls}>{form.isUpcoming ? 'Race Date' : 'Race Date'}</label>
              <input
                type='date'
                className={`${inputCls} [color-scheme:dark]`}
                value={form.raceDate}
                onChange={(e) => setForm((f) => ({ ...f, raceDate: e.target.value }))}
              />
            </div>

            {/* Finish time (only for past runs) */}
            {!form.isUpcoming && (
              <div>
                <label className={labelCls}>Finish Time (e.g. 1:45:30)</label>
                <input
                  className={inputCls}
                  placeholder='H:MM:SS or MM:SS'
                  value={form.finishTime}
                  onChange={(e) => setForm((f) => ({ ...f, finishTime: e.target.value }))}
                />
              </div>
            )}

            {/* Strava activity URL */}
            <div>
              <label className={labelCls}>Strava Activity Link (optional)</label>
              <input
                className={inputCls}
                placeholder='https://www.strava.com/activities/...'
                value={form.stravaActivityUrl}
                onChange={(e) => setForm((f) => ({ ...f, stravaActivityUrl: e.target.value }))}
              />
            </div>

            <button
              onClick={handleSave}
              disabled={saving || !effectiveRaceName.trim()}
              className='w-full bg-stride-yellow-accent text-copy-black font-semibold py-2.5 rounded-md hover:bg-stride-yellow-accent/90 transition-colors text-sm disabled:opacity-50 min-h-11'
            >
              {saving ? (
                <span className='flex items-center justify-center gap-2'><Spinner /> Saving…</span>
              ) : 'Add Run'}
            </button>
          </div>
        </div>
      )}

      {/* Upcoming runs */}
      {upcomingRuns.length > 0 && (
        <div className='mb-4'>
          <p className='text-white/25 text-[10px] uppercase tracking-widest mb-2'>Upcoming</p>
          <div className='space-y-2'>
            {upcomingRuns.map((run) => (
              <RunCard key={run.id} run={run} isOwnProfile={isOwnProfile} onDelete={handleDelete} deletingId={deletingId} />
            ))}
          </div>
        </div>
      )}

      {/* Past runs */}
      {pastRuns.length > 0 && (
        <div>
          <p className='text-white/25 text-[10px] uppercase tracking-widest mb-2'>Completed</p>
          <div className='space-y-2'>
            {pastRuns.map((run) => (
              <RunCard key={run.id} run={run} isOwnProfile={isOwnProfile} onDelete={handleDelete} deletingId={deletingId} />
            ))}
          </div>
        </div>
      )}

      {runs.length === 0 && isOwnProfile && !showForm && (
        <div className='bg-white/5 border border-dashed border-white/15 rounded-xl p-6 text-center'>
          <Trophy size={24} className='text-white/20 mx-auto mb-2' />
          <p className='text-white/30 text-sm'>Track your official race history here.</p>
          <button
            onClick={() => setShowForm(true)}
            className='mt-3 text-stride-yellow-accent text-sm hover:underline'
          >
            Add your first race
          </button>
        </div>
      )}
    </div>
  )
}

function RunCard({
  run,
  isOwnProfile,
  onDelete,
  deletingId,
}: {
  run: OfficialRun
  isOwnProfile: boolean
  onDelete: (id: string) => void
  deletingId: string | null
}) {
  const isDeleting = deletingId === run.id

  return (
    <div className='bg-white/10 backdrop-blur-md border border-white/15 rounded-xl px-4 py-3 hover:border-stride-yellow-accent/30 transition-colors'>
      <div className='flex items-start justify-between gap-2'>
        <div className='min-w-0'>
          <div className='flex items-center gap-2 flex-wrap'>
            <p className='text-white text-sm font-medium'>{run.race_name}</p>
            {run.is_upcoming && (
              <span className='text-[10px] px-1.5 py-0.5 rounded bg-stride-yellow-accent/20 text-stride-yellow-accent border border-stride-yellow-accent/30 font-medium'>
                Upcoming
              </span>
            )}
            {run.distance_category && (
              <span className='text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/50 border border-white/15'>
                {run.distance_category}
              </span>
            )}
          </div>

          <div className='flex items-center gap-3 mt-1.5 text-white/40 text-xs'>
            {run.race_date && (
              <span className='flex items-center gap-1'>
                <Calendar size={10} />
                {formatDate(run.race_date)}
              </span>
            )}
            {run.finish_time && !run.is_upcoming && (
              <span className='flex items-center gap-1 font-semibold text-white/60'>
                <Clock size={10} />
                {run.finish_time}
              </span>
            )}
          </div>
        </div>

        <div className='flex items-center gap-2 shrink-0'>
          {run.strava_activity_url && (
            <a
              href={run.strava_activity_url}
              target='_blank'
              rel='noopener noreferrer'
              className='text-white/30 hover:text-[#FC4C02] transition-colors'
              aria-label='View Strava activity'
            >
              <ExternalLink size={13} />
            </a>
          )}
          {isOwnProfile && (
            <button
              onClick={() => onDelete(run.id)}
              disabled={isDeleting}
              className='text-white/20 hover:text-red-400 transition-colors disabled:opacity-50'
              aria-label='Delete run'
            >
              {isDeleting ? <Spinner /> : <X size={14} />}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
