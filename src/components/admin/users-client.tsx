'use client'

import { useState, useMemo } from 'react'
import { ChevronDown, ChevronUp, Search, ExternalLink } from 'lucide-react'
import { updateUserRoleAction } from '@/lib/actions/admin'
import { PendingButton } from '@/components/admin/pending-button'
import { RunnerTagBadge } from '@/components/ui/runner-tag-badge'

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
  runs: Run[]
}

type RoleFilter = 'ALL' | 'ADMIN' | 'MEMBER' | 'GUEST'

const ROLE_STYLES: Record<string, string> = {
  ADMIN: 'bg-stride-yellow-accent/20 text-stride-yellow-accent',
  MEMBER: 'bg-blue-500/20 text-blue-400',
  GUEST: 'bg-white/10 text-white/50',
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function Avatar({ url, name, size }: { url: string | null; name: string | null; size: number }) {
  const initial = (name ?? '?').charAt(0).toUpperCase()
  const dim = `w-${size} h-${size}`
  return (
    <div
      className={`${dim} rounded-full overflow-hidden border-2 border-white/15 bg-stride-yellow-accent/20 flex items-center justify-center shrink-0`}
      style={{ width: size * 4, height: size * 4 }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={name ?? ''} className='w-full h-full object-cover' loading='lazy' fetchPriority='low' />
      ) : (
        <span className='text-stride-yellow-accent font-bold' style={{ fontSize: size * 1.5 }}>{initial}</span>
      )}
    </div>
  )
}

export function UsersClient({ users }: { users: UserRow[] }) {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    let result = users
    if (roleFilter !== 'ALL') {
      result = result.filter(u => u.role === roleFilter)
    }
    const q = search.trim().toLowerCase()
    if (q) {
      result = result.filter(u =>
        u.full_name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.username?.toLowerCase().includes(q) ||
        u.runner_tag?.toLowerCase().includes(q)
      )
    }
    return result
  }, [users, search, roleFilter])

  const roleCounts = useMemo(() => ({
    ALL: users.length,
    ADMIN: users.filter(u => u.role === 'ADMIN').length,
    MEMBER: users.filter(u => u.role === 'MEMBER').length,
    GUEST: users.filter(u => u.role === 'GUEST').length,
  }), [users])

  return (
    <div className='space-y-4'>

      {/* Search + role filter */}
      <div className='flex flex-col sm:flex-row gap-3'>
        {/* Search */}
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

        {/* Role filter pills */}
        <div className='flex gap-1 bg-white/5 border border-white/10 rounded-xl p-1 shrink-0'>
          {(['ALL', 'ADMIN', 'MEMBER', 'GUEST'] as RoleFilter[]).map(r => (
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

          return (
            <div
              key={u.id}
              className='bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-colors group'
            >
              {/* Main row */}
              <div className='flex items-center gap-4 px-5 py-4'>

                {/* Avatar + profile link area */}
                {profileHref ? (
                  <a
                    href={profileHref}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='shrink-0 relative'
                    onClick={e => e.stopPropagation()}
                    aria-label={`View ${u.full_name ?? u.username ?? 'user'}'s profile`}
                  >
                    <Avatar url={u.avatar_url} name={u.full_name} size={13} />
                    {/* Hover indicator */}
                    <div className='absolute inset-0 rounded-full bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity'>
                      <ExternalLink size={14} className='text-white' />
                    </div>
                  </a>
                ) : (
                  <div className='shrink-0'>
                    <Avatar url={u.avatar_url} name={u.full_name} size={13} />
                  </div>
                )}

                {/* Name + email + tag */}
                <div className='flex-1 min-w-0'>
                  <div className='flex items-center gap-2 flex-wrap'>
                    {profileHref ? (
                      <a
                        href={profileHref}
                        target='_blank'
                        rel='noopener noreferrer'
                        onClick={e => e.stopPropagation()}
                        className='text-white font-semibold text-sm hover:text-stride-yellow-accent transition-colors truncate'
                      >
                        {u.full_name ?? '—'}
                      </a>
                    ) : (
                      <p className='text-white font-semibold text-sm truncate'>{u.full_name ?? '—'}</p>
                    )}
                    {u.runner_tag && (
                      <RunnerTagBadge tag={u.runner_tag} size='xs' />
                    )}
                  </div>
                  <p className='text-white/40 text-xs truncate mt-0.5'>{u.email}</p>
                  {u.username && (
                    <p className='text-white/25 text-xs mt-0.5'>@{u.username}</p>
                  )}
                </div>

                {/* Runs count */}
                <div className='hidden sm:flex flex-col items-center text-center shrink-0 w-12'>
                  <p className='text-stride-yellow-accent font-bold text-xl leading-none'>{u.runs_completed}</p>
                  <p className='text-white/30 text-[10px] mt-0.5'>runs</p>
                </div>

                {/* Role pill */}
                <span className={`hidden sm:inline-block text-xs font-semibold px-2.5 py-1 rounded-md shrink-0 ${ROLE_STYLES[u.role] ?? 'bg-white/10 text-white/50'}`}>
                  {u.role}
                </span>

                {/* Admin toggle */}
                <form
                  action={updateUserRoleAction.bind(null, u.id, u.role === 'ADMIN' ? 'MEMBER' : 'ADMIN')}
                  onClick={e => e.stopPropagation()}
                >
                  <PendingButton className='hidden sm:block text-xs text-white/35 hover:text-stride-yellow-accent transition-colors shrink-0'>
                    {u.role === 'ADMIN' ? 'Remove admin' : 'Make admin'}
                  </PendingButton>
                </form>

                {/* Run history expand */}
                {u.runs.length > 0 && (
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : u.id)}
                    className='text-white/25 hover:text-white/60 transition-colors shrink-0 p-1.5 rounded-lg hover:bg-white/5'
                    aria-label={isExpanded ? 'Hide run history' : 'Show run history'}
                  >
                    {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  </button>
                )}
              </div>

              {/* Mobile: role + runs + admin action */}
              <div className='sm:hidden flex items-center gap-2 px-5 pb-3.5'>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded ${ROLE_STYLES[u.role] ?? 'bg-white/10 text-white/50'}`}>
                  {u.role}
                </span>
                <span className='text-white/20 text-xs'>·</span>
                <span className='text-white/40 text-xs'>{u.runs_completed} runs</span>
                <form
                  action={updateUserRoleAction.bind(null, u.id, u.role === 'ADMIN' ? 'MEMBER' : 'ADMIN')}
                  className='ml-auto'
                >
                  <PendingButton className='text-xs text-white/35 hover:text-stride-yellow-accent transition-colors'>
                    {u.role === 'ADMIN' ? 'Remove admin' : 'Make admin'}
                  </PendingButton>
                </form>
              </div>

              {/* Expanded run history */}
              {isExpanded && u.runs.length > 0 && (
                <div className='border-t border-white/8 px-5 py-3 space-y-2 bg-white/3'>
                  <p className='text-white/25 text-[10px] uppercase tracking-widest mb-2.5'>Run history</p>
                  {u.runs.map((run, i) => (
                    <div key={i} className='flex items-center justify-between gap-3'>
                      <p className='text-white/65 text-sm truncate'>{run.eventName}</p>
                      <p className='text-white/25 text-xs shrink-0'>{fmtDate(run.checkedInAt)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
