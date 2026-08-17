'use client'

import { useState, useMemo, useEffect, useRef, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, ChevronUp, Search, ExternalLink, ShieldCheck, Phone, AlertCircle, MapPin, Cake, UserRound, CalendarPlus, Activity, ArrowUpNarrowWide, ArrowDownWideNarrow, X } from 'lucide-react'
import { updateUserRoleAction } from '@/lib/actions/admin'
import { RunnerTagBadge } from '@/components/ui/runner-tag-badge'
import { MILESTONE_TIERS, getMilestone } from '@/lib/milestones'
import { TierBadge } from '@/components/ui/tier-badge'
import { Avatar, Fact, GENDER_LABEL, telHref } from '@/components/admin/user-facts'
import { ageFromDob } from '@/lib/utils/age'
import { formatDateNumericIST } from '@/lib/utils/ist'

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

type RoleFilter = 'ALL' | 'ADMIN' | 'LEAD' | 'GUEST'

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
  LEAD: 'bg-stride-yellow-accent/12 text-stride-yellow-accent/85',
  GUEST: 'bg-white/10 text-white/50',
}

/**
 * The roles an admin may assign, described by what they actually grant.
 *
 * LEAD is worded to head off the obvious misreading: it is not a junior admin.
 * It opens the check-in screen and nothing else, and an admin choosing it
 * should be able to see that without having to try it.
 */
const ROLE_OPTIONS = [
  { value: 'GUEST', label: 'Guest', blurb: 'Standard member. No access to the admin portal.' },
  { value: 'LEAD',  label: 'Lead',  blurb: 'Run staff. Event check-in only — cannot see events, registrations, users or club data.' },
  { value: 'ADMIN', label: 'Admin', blurb: 'Full access to the admin portal and everything in it.' },
] as const

function fmtDate(d: string | null) {
  return d ? formatDateNumericIST(d) : '—'
}

export function UsersClient({ users }: { users: UserRow[] }) {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL')
  // '' = no tier filter. Otherwise a MilestoneTier.key.
  const [tierFilter, setTierFilter] = useState<string>('')
  const [tierPickerOpen, setTierPickerOpen] = useState(false)
  const tierPickerRef = useRef<HTMLDivElement>(null)
  const [sortKey, setSortKey] = useState<SortKey>('joined')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  // Pending role-change target — opens the confirmation modal
  const [roleTarget, setRoleTarget] = useState<UserRow | null>(null)
  const [pendingRole, setPendingRole] = useState<string>('GUEST')
  const [roleError, setRoleError] = useState<string | null>(null)
  const [rolePending, startRoleTransition] = useTransition()
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  function openRoleModal(user: UserRow) {
    setRoleError(null)
    setPendingRole(user.role)
    setRoleTarget(user)
  }

  const roleCounts = useMemo(() => ({
    ALL:   users.length,
    ADMIN: users.filter(u => u.role === 'ADMIN').length,
    LEAD:  users.filter(u => u.role === 'LEAD').length,
    GUEST: users.filter(u => u.role === 'GUEST').length,
  }), [users])

  // Headcount per tier, shown next to each option so the admin can see where the
  // club actually sits before filtering to an empty band.
  const tierCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const u of users) {
      const key = getMilestone(u.runs_completed).key
      counts[key] = (counts[key] ?? 0) + 1
    }
    return counts
  }, [users])

  const selectedTier = tierFilter ? MILESTONE_TIERS.find(t => t.key === tierFilter) ?? null : null

  // Click-outside to close, matching the event picker on /admin/check-in.
  useEffect(() => {
    if (!tierPickerOpen) return
    function onDown(e: MouseEvent | TouchEvent) {
      if (tierPickerRef.current && !tierPickerRef.current.contains(e.target as Node)) setTierPickerOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown, { passive: true })
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
    }
  }, [tierPickerOpen])

  const filtered = useMemo(() => {
    let result = users
    if (roleFilter !== 'ALL') result = result.filter(u => u.role === roleFilter)
    if (tierFilter) result = result.filter(u => getMilestone(u.runs_completed).key === tierFilter)
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
  }, [users, search, roleFilter, tierFilter, sortKey, sortDir])

  // ── Role picker ──
  // Three roles means a choice, not a toggle. The blurb under each option is
  // the point of the design: an admin granting LEAD needs to see that it buys
  // check-in and nothing else before they grant it.
  const roleUnchanged = pendingRole === roleTarget?.role
  const modal = roleTarget && mounted ? createPortal(
    <div className='fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4' onClick={() => setRoleTarget(null)}>
      <div className='bg-stride-purple-primary border border-white/15 rounded-2xl p-6 w-full max-w-md shadow-2xl' onClick={e => e.stopPropagation()}>
        <div className='w-12 h-12 rounded-full flex items-center justify-center mb-4 bg-stride-yellow-accent/15'>
          <ShieldCheck size={20} className='text-stride-yellow-accent' />
        </div>
        <h2 className='text-white font-bold text-lg mb-1'>Change role</h2>
        <p className='text-white/60 text-sm mb-5'>
          <span className='text-white font-medium'>{roleTarget.full_name ?? roleTarget.email ?? roleTarget.username ?? 'This user'}</span>
          {' '}is currently <span className='text-white font-medium'>{roleTarget.role}</span>.
        </p>

        <div role='radiogroup' aria-label='Role' className='flex flex-col gap-2 mb-5'>
          {ROLE_OPTIONS.map(opt => {
            const selected = pendingRole === opt.value
            return (
              <button
                key={opt.value}
                type='button'
                role='radio'
                aria-checked={selected}
                disabled={rolePending}
                onClick={() => setPendingRole(opt.value)}
                className={`text-left rounded-xl border px-4 py-3 transition-colors disabled:opacity-60 ${
                  selected
                    ? 'border-stride-yellow-accent/60 bg-stride-yellow-accent/10'
                    : 'border-white/12 bg-white/4 hover:border-white/25'
                }`}
              >
                <span className={`block text-sm font-semibold ${selected ? 'text-stride-yellow-accent' : 'text-white'}`}>
                  {opt.label}
                </span>
                <span className='block text-white/50 text-xs mt-0.5 leading-relaxed'>{opt.blurb}</span>
              </button>
            )
          })}
        </div>

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
            disabled={rolePending || roleUnchanged}
            onClick={() => {
              const target = roleTarget
              const next = pendingRole
              startRoleTransition(async () => {
                const result = await updateUserRoleAction(target.id, next)
                if (result?.error) setRoleError(result.error)
                else setRoleTarget(null)
              })
            }}
            className='flex-1 py-2.5 rounded-xl font-semibold text-sm transition-colors disabled:opacity-40 bg-stride-yellow-accent text-copy-black hover:bg-stride-yellow-accent/90'
          >
            {rolePending ? 'Updating…' : roleUnchanged ? 'No change' : `Make ${pendingRole.toLowerCase()}`}
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
          {(['ALL', 'ADMIN', 'LEAD', 'GUEST'] as RoleFilter[]).map(r => (
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

        {/* Milestone tier filter — badge + name, clearable */}
        <div ref={tierPickerRef} className='relative shrink-0'>
          <div className='flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1'>
            <button
              type='button'
              onClick={() => setTierPickerOpen(o => !o)}
              aria-expanded={tierPickerOpen}
              aria-haspopup='listbox'
              className='flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-white/70 hover:text-white hover:bg-white/8 transition-colors min-h-8'
            >
              {selectedTier ? (
                <>
                  <TierBadge tier={selectedTier} size='xs' decorative />
                  <span className='text-white'>{selectedTier.label}</span>
                </>
              ) : (
                <span>All tiers</span>
              )}
              <ChevronDown size={13} className={`text-white/40 transition-transform ${tierPickerOpen ? 'rotate-180' : ''}`} aria-hidden='true' />
            </button>
            {selectedTier && (
              <button
                type='button'
                onClick={() => { setTierFilter(''); setTierPickerOpen(false) }}
                aria-label='Clear milestone filter'
                className='flex items-center justify-center min-w-8 h-8 rounded-lg text-white/50 hover:text-white hover:bg-white/8 transition-colors'
              >
                <X size={14} aria-hidden='true' />
              </button>
            )}
          </div>

          {tierPickerOpen && (
            <div
              role='listbox'
              aria-label='Filter by milestone tier'
              className='absolute left-0 sm:right-0 sm:left-auto top-full mt-1 z-30 w-60 bg-stride-purple-primary border border-white/15 rounded-xl shadow-2xl overflow-hidden'
            >
              <button
                type='button'
                role='option'
                aria-selected={!tierFilter}
                onClick={() => { setTierFilter(''); setTierPickerOpen(false) }}
                className={`w-full text-left px-3 py-2.5 flex items-center gap-2.5 text-xs transition-colors border-b border-white/8 hover:bg-white/5 ${
                  !tierFilter ? 'bg-stride-yellow-accent/8 text-white' : 'text-white/70'
                }`}
              >
                <span className='w-5 shrink-0' aria-hidden='true' />
                <span className='flex-1 font-medium'>All tiers</span>
                <span className='text-white/40 tabular-nums'>{users.length}</span>
              </button>
              {MILESTONE_TIERS.map(tier => (
                <button
                  key={tier.key}
                  type='button'
                  role='option'
                  aria-selected={tierFilter === tier.key}
                  onClick={() => { setTierFilter(tier.key); setTierPickerOpen(false) }}
                  className={`w-full text-left px-3 py-2.5 flex items-center gap-2.5 text-xs transition-colors border-b border-white/8 last:border-b-0 hover:bg-white/5 ${
                    tierFilter === tier.key ? 'bg-stride-yellow-accent/8 text-white' : 'text-white/70'
                  }`}
                >
                  <TierBadge tier={tier} size='sm' decorative />
                  <span className='flex-1 font-medium line-clamp-1'>{tier.label}</span>
                  <span className='text-white/40 tabular-nums'>{tierCounts[tier.key] ?? 0}</span>
                </button>
              ))}
            </div>
          )}
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
          <p className='text-white/30 text-sm'>
            {selectedTier
              ? `No ${selectedTier.label} athletes match these filters.`
              : 'No users match your search.'}
          </p>
          {selectedTier && (
            <button
              type='button'
              onClick={() => setTierFilter('')}
              className='mt-3 text-stride-yellow-accent text-xs font-semibold underline underline-offset-2 hover:no-underline min-h-11'
            >
              Clear the milestone filter
            </button>
          )}
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
                    <Avatar url={u.avatar_url} name={u.full_name} size='lg' />
                    <div className='absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover/av:opacity-100 flex items-center justify-center transition-opacity'>
                      <ExternalLink size={12} className='text-white' />
                    </div>
                  </a>
                ) : (
                  <Avatar url={u.avatar_url} name={displayName} size='lg' />
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
                {/* Badge always, label only where there's room — with a tier
                    filter available the badge has to be visible on a phone for a
                    filtered result to make sense. */}
                <div className='flex items-center gap-1.5 w-8 md:w-36 shrink-0'>
                  <TierBadge tier={getMilestone(u.runs_completed)} size='md' />
                  <span className='hidden md:line-clamp-1 text-white/60 text-xs font-medium'>
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
                  Change role
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
                  Change role
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
                        const age = ageFromDob(u.date_of_birth)
                        return age !== null ? `${age} years` : '—'
                      })()} />
                      <Fact
                        icon={<Phone size={12} />}
                        label='Contact'
                        value={u.contact_number ?? '—'}
                        href={telHref(u.contact_number)}
                      />
                      <Fact
                        icon={<AlertCircle size={12} />}
                        label='Emergency contact'
                        value={u.emergency_contact_number ?? '—'}
                        href={telHref(u.emergency_contact_number)}
                      />
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
