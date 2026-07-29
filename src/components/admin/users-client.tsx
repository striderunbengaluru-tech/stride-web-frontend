'use client'

import { useState, useMemo, useEffect, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, ChevronUp, Search, ExternalLink, ShieldCheck, ShieldOff, Phone, AlertCircle, MapPin, Cake, UserRound, CalendarPlus, Activity, ArrowUpNarrowWide, ArrowDownWideNarrow } from 'lucide-react'
import { updateUserRoleAction } from '@/lib/actions/admin'
import { RunnerTagBadge } from '@/components/ui/runner-tag-badge'
import { MILESTONE_TIERS, getMilestone } from '@/lib/milestones'
import { TierBadge } from '@/components/ui/tier-badge'

type Run = { eventName: string; eventDate: string | null; checkedInAt: string }

export type UserRow = {
  id: string
  full_name: string | null
  email: string | null
  username: string | null
  role: string
  created_at: string
  avatar_url: string | null
  runner_tag: string | null
  runs_completed: number
  gender: string | null
  date_of_birth: string | null
  contact_number: string | null
  emergency_contact_number: string | null
  location: string | null
  bio: string | null
  confirmed_count: number
  last_active_at: string | null
  runs: Run[]
}

const GENDER_LABEL: Record<string, string> = {
  MALE: 'Male',
  FEMALE: 'Female',
  OTHER: 'Other',
  PREFER_NOT_TO_SAY: 'Prefer not to say',
}

function calcAge(dob: string | null): number | null {
  if (!dob) return null
  const ms = Date.now() - new Date(dob).getTime()
  if (!Number.isFinite(ms) || ms <= 0) return null
  return Math.floor(ms / (365.25 * 86_400_000))
}

type RoleFilter = 'ALL' | 'ADMIN' | 'GUEST'

type SortKey = 'joined' | 'runs' | 'tier'
type SortDir = 'asc' | 'desc'

const SORT_LABEL: Record<SortKey, string> = {
  joined: 'Joined',
  runs: 'Runs',
  tier: 'Milestone',
}

// Tier position from the run count. Milestone tiers are a function of
// `runs_completed`, so this ordering matches the runs ordering — it only differs
// in that everyone inside a band is grouped together.
function tierIndexOf(runs: number): number {
  return MILESTONE_TIERS.findIndex(t => t.key === getMilestone(runs).key)
}

const ROLE_STYLES: Record<string, string> = {
  ADMIN: 'bg-stride-yellow-accent/20 text-stride-yellow-accent',
  GUEST: 'bg-white/10 text-white/50',
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function Avatar({ url, name }: { url: string | null; name: string | null }) {
  const initial = (name ?? '?').charAt(0).toUpperCase()
  return (
    <div className='w-10 h-10 rounded-full overflow-hidden border-2 border-white/15 bg-stride-yellow-accent/20 flex items-center justify-center shrink-0'>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={name ?? ''} className='w-full h-full object-cover' loading='lazy' fetchPriority='low' />
      ) : (
        <span className='text-stride-yellow-accent font-bold text-sm'>{initial}</span>
      )}
    </div>
  )
}

export function UsersClient({ users }: { users: UserRow[] }) {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL')
  const [sortKey, setSortKey] = useState<SortKey>('joined')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  // Pending role-change target — opens the confirmation modal
  const [roleTarget, setRoleTarget] = useState<UserRow | null>(null)
  const [roleError, setRoleError] = useState<string | null>(null)
  const [rolePending, startRoleTransition] = useTransition()
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  function openRoleModal(user: UserRow) {
    setRoleError(null)
    setRoleTarget(user)
  }

  const roleCounts = useMemo(() => ({
    ALL:   users.length,
    ADMIN: users.filter(u => u.role === 'ADMIN').length,
    GUEST: users.filter(u => u.role === 'GUEST').length,
  }), [users])

  const filtered = useMemo(() => {
    let result = users
    if (roleFilter !== 'ALL') result = result.filter(u => u.role === roleFilter)
    const q = search.trim().toLowerCase()
    if (q) result = result.filter(u =>
      u.full_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.username?.toLowerCase().includes(q) ||
      u.runner_tag?.toLowerCase().includes(q)
    )

    // Copy before sorting — `result` can still be the `users` prop array.
    const sorted = [...result].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      if (sortKey === 'joined') {
        return dir * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      }
      if (sortKey === 'tier') {
        const delta = tierIndexOf(a.runs_completed) - tierIndexOf(b.runs_completed)
        // Same tier — order by runs inside it so the list stays meaningful.
        return dir * (delta !== 0 ? delta : a.runs_completed - b.runs_completed)
      }
      return dir * (a.runs_completed - b.runs_completed)
    })
    return sorted
  }, [users, search, roleFilter, sortKey, sortDir])

  // ── Role-change confirmation modal ──
  const makingAdmin = roleTarget?.role !== 'ADMIN'
  const nextRole = makingAdmin ? 'ADMIN' : 'GUEST'
  const modal = roleTarget && mounted ? createPortal(
    <div className='fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4' onClick={() => setRoleTarget(null)}>
      <div className='bg-stride-purple-primary border border-white/15 rounded-2xl p-6 w-full max-w-sm shadow-2xl' onClick={e => e.stopPropagation()}>
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${makingAdmin ? 'bg-stride-yellow-accent/15' : 'bg-white/8'}`}>
          {makingAdmin
            ? <ShieldCheck size={20} className='text-stride-yellow-accent' />
            : <ShieldOff size={20} className='text-white/60' />}
        </div>
        <h2 className='text-white font-bold text-lg mb-1'>
          {makingAdmin ? 'Make this user an admin?' : 'Remove admin access?'}
        </h2>
        <p className='text-white/60 text-sm mb-1'>
          <span className='text-white font-medium'>{roleTarget.full_name ?? roleTarget.email ?? roleTarget.username ?? 'This user'}</span>
          {makingAdmin
            ? ' will gain full access to the admin panel — events, registrations, users, and all data.'
            : ' will lose access to the admin panel.'}
        </p>
        <p className='text-white/40 text-xs mb-6'>You can change this back at any time.</p>
        {roleError && (
          <div className='bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2.5 text-red-400 text-xs mb-4'>
            {roleError}
          </div>
        )}
        <div className='flex gap-3'>
          <button
            onClick={() => setRoleTarget(null)}
            disabled={rolePending}
            className='flex-1 py-2.5 rounded-xl border border-white/15 text-white/70 text-sm hover:border-white/30 transition-colors disabled:opacity-60'
          >
            Cancel
          </button>
          <button
            type='button'
            disabled={rolePending}
            onClick={() => {
              const target = roleTarget
              startRoleTransition(async () => {
                const result = await updateUserRoleAction(target.id, nextRole)
                if (result?.error) setRoleError(result.error)
                else setRoleTarget(null)
              })
            }}
            className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-colors disabled:opacity-60 ${
              makingAdmin
                ? 'bg-stride-yellow-accent text-copy-black hover:bg-stride-yellow-accent/90'
                : 'bg-white/10 text-white hover:bg-white/15'
            }`}
          >
            {rolePending ? 'Updating…' : makingAdmin ? 'Yes, make admin' : 'Yes, remove'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  ) : null

  return (
    <div className='space-y-4'>
      {modal}

      {/* Search + role filter */}
      <div className='flex flex-col sm:flex-row gap-3'>
        <div className='relative flex-1'>
          <Search size={15} className='absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none' />
          <input
            type='text'
            placeholder='Search name, email, username, or tag…'
            value={search}
            onChange={e => setSearch(e.target.value)}
            className='w-full bg-white/8 border border-white/20 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-stride-yellow-accent/60 transition-colors'
          />
        </div>
        <div className='flex gap-1 bg-white/5 border border-white/10 rounded-xl p-1 shrink-0'>
          {(['ALL', 'ADMIN', 'GUEST'] as RoleFilter[]).map(r => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                roleFilter === r
                  ? 'bg-stride-yellow-accent text-copy-black shadow-sm'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              {r === 'ALL' ? 'All' : r.charAt(0) + r.slice(1).toLowerCase()}
              <span className='ml-1 opacity-60'>({roleCounts[r]})</span>
            </button>
          ))}
        </div>

        {/* Sort — key picker + direction toggle */}
        <div className='flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1 shrink-0'>
          {(['joined', 'runs', 'tier'] as SortKey[]).map(k => (
            <button
              key={k}
              onClick={() => setSortKey(k)}
              aria-pressed={sortKey === k}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                sortKey === k
                  ? 'bg-stride-yellow-accent text-copy-black shadow-sm'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              {SORT_LABEL[k]}
            </button>
          ))}
          <button
            onClick={() => setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))}
            title={sortDir === 'asc' ? 'Ascending — click for descending' : 'Descending — click for ascending'}
            aria-label={`Sort direction: ${sortDir === 'asc' ? 'ascending' : 'descending'}`}
            className='flex items-center justify-center min-w-8 h-8 rounded-lg text-white/60 hover:text-white hover:bg-white/8 transition-colors'
          >
            {sortDir === 'asc'
              ? <ArrowUpNarrowWide size={15} aria-hidden='true' />
              : <ArrowDownWideNarrow size={15} aria-hidden='true' />}
          </button>
        </div>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className='text-center py-16'>
          <p className='text-white/30 text-sm'>No users match your search.</p>
        </div>
      )}

      {/* User cards */}
      <div className='space-y-2'>
        {filtered.map(u => {
          const isExpanded = expandedId === u.id
          const profileHref = u.username ? `/profile/${u.username}` : null
          const displayName = u.full_name ?? '—'

          return (
            <div
              key={u.id}
              className='bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-colors'
            >
              {/* Main row */}
              <div className='flex items-center gap-3 px-4 py-3.5'>

                {/* Avatar */}
                {profileHref ? (
                  <a href={profileHref} target='_blank' rel='noopener noreferrer' className='shrink-0 relative group/av' onClick={e => e.stopPropagation()}>
                    <Avatar url={u.avatar_url} name={u.full_name} />
                    <div className='absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover/av:opacity-100 flex items-center justify-center transition-opacity'>
                      <ExternalLink size={12} className='text-white' />
                    </div>
                  </a>
                ) : (
                  <Avatar url={u.avatar_url} name={displayName} />
                )}

                {/* Name + email + tag */}
                <div className='flex-1 min-w-0'>
                  <div className='flex items-center gap-1.5 flex-wrap'>
                    {profileHref ? (
                      <a href={profileHref} target='_blank' rel='noopener noreferrer' onClick={e => e.stopPropagation()}
                        className='text-white font-semibold text-sm hover:text-stride-yellow-accent transition-colors truncate max-w-[160px] sm:max-w-none'>
                        {displayName}
                      </a>
                    ) : (
                      <p className='font-semibold text-sm truncate text-white'>
                        {displayName}
                      </p>
                    )}
                    {u.runner_tag && <RunnerTagBadge tag={u.runner_tag} size='xs' />}
                  </div>
                  <p className='text-white/40 text-xs truncate mt-0.5'>{u.email}</p>
                  <p className='text-white/25 text-xs'>
                    {u.username ? `@${u.username}` : '—'}
                    {' · '}
                    Joined {fmtDate(u.created_at)}
                  </p>
                </div>

                {/* Milestone tier — hidden on the narrowest rows so the runs
                    count and role pill keep their fixed slots */}
                <div className='hidden md:flex items-center gap-1.5 w-36 shrink-0'>
                  <TierBadge tier={getMilestone(u.runs_completed)} size='md' />
                  <span className='text-white/60 text-xs font-medium line-clamp-1'>
                    {getMilestone(u.runs_completed).label}
                  </span>
                </div>

                {/* Runs — fixed width so alignment never shifts */}
                <div className='flex flex-col items-center w-10 shrink-0'>
                  <p className='text-stride-yellow-accent font-bold text-lg leading-none tabular-nums'>{u.runs_completed}</p>
                  <p className='text-white/30 text-[10px] mt-0.5'>runs</p>
                </div>

                {/* Role pill — fixed width */}
                <div className='hidden sm:flex w-16 shrink-0 justify-center'>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${ROLE_STYLES[u.role] ?? 'bg-white/10 text-white/50'}`}>
                    {u.role}
                  </span>
                </div>

                {/* Admin toggle */}
                <button
                  type='button'
                  onClick={e => { e.stopPropagation(); openRoleModal(u) }}
                  className='hidden sm:block shrink-0 text-xs text-white/35 hover:text-stride-yellow-accent transition-colors whitespace-nowrap'
                >
                  {u.role === 'ADMIN' ? 'Remove admin' : 'Make admin'}
                </button>

                {/* Expand button — always available so admins can drill into any user */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : u.id)}
                  className='text-white/25 hover:text-white/60 transition-colors shrink-0 p-1.5 rounded-lg hover:bg-white/5'
                  aria-label={isExpanded ? 'Hide details' : 'Show details'}
                >
                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </div>

              {/* Mobile: role + admin action */}
              <div className='sm:hidden flex items-center gap-2 px-4 pb-3 -mt-1'>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${ROLE_STYLES[u.role] ?? 'bg-white/10 text-white/50'}`}>
                  {u.role}
                </span>
                <button
                  type='button'
                  onClick={() => openRoleModal(u)}
                  className='ml-auto text-xs text-white/35 hover:text-stride-yellow-accent transition-colors'
                >
                  {u.role === 'ADMIN' ? 'Remove admin' : 'Make admin'}
                </button>
              </div>

              {/* Expanded details — profile facts + run history */}
              {isExpanded && (
                <div className='border-t border-white/8 bg-white/2'>

                  {/* Profile facts grid */}
                  <div className='px-4 py-4'>
                    <p className='text-white/25 text-[10px] font-mono uppercase tracking-widest mb-3'>Profile</p>
                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3'>
                      <Fact icon={<CalendarPlus size={12} />} label='Joined' value={fmtDate(u.created_at)} />
                      <Fact icon={<Activity size={12} />} label='Last active' value={u.last_active_at ? fmtDate(u.last_active_at) : '—'} />
                      <Fact icon={<UserRound size={12} />} label='Gender' value={u.gender ? GENDER_LABEL[u.gender] ?? u.gender : '—'} />
                      <Fact icon={<Cake size={12} />} label='Age' value={(() => {
                        const age = calcAge(u.date_of_birth)
                        return age !== null ? `${age} years` : '—'
                      })()} />
                      <Fact icon={<Phone size={12} />} label='Contact' value={u.contact_number ?? '—'} />
                      <Fact icon={<AlertCircle size={12} />} label='Emergency contact' value={u.emergency_contact_number ?? '—'} />
                      <Fact icon={<MapPin size={12} />} label='Location' value={u.location ?? '—'} />
                      <Fact
                        icon={<span className='text-stride-yellow-accent text-[11px] font-bold'>✓</span>}
                        label='Confirmed registrations'
                        value={`${u.confirmed_count} · ${u.runs.length} checked in`}
                      />
                    </div>
                    {u.bio && (
                      <div className='mt-4 pt-3 border-t border-white/5'>
                        <p className='text-white/25 text-[10px] font-mono uppercase tracking-widest mb-1.5'>Bio</p>
                        <p className='text-white/60 text-sm leading-snug line-clamp-3'>{u.bio}</p>
                      </div>
                    )}
                  </div>

                  {/* Run history */}
                  {u.runs.length > 0 && (
                    <div className='px-4 py-3 border-t border-white/5 space-y-2'>
                      <p className='text-white/25 text-[10px] font-mono uppercase tracking-widest mb-2.5'>Run history</p>
                      {u.runs.map((run, i) => (
                        <div key={i} className='flex items-center justify-between gap-3'>
                          <p className='text-white/65 text-sm truncate'>{run.eventName}</p>
                          <p className='text-white/25 text-xs shrink-0'>{fmtDate(run.checkedInAt)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Fact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className='flex items-start gap-2.5'>
      <span className='shrink-0 mt-0.5 w-5 h-5 rounded-md bg-white/8 border border-white/10 flex items-center justify-center text-white/45'>
        {icon}
      </span>
      <div className='min-w-0 flex-1'>
        <p className='text-white/30 text-[10px] font-mono uppercase tracking-widest'>{label}</p>
        <p className='text-white/75 text-sm truncate'>{value}</p>
      </div>
    </div>
  )
}
