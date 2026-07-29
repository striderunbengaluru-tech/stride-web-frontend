import Link from 'next/link'
import { adminClient } from '@/lib/supabase/admin'
import { DashboardCharts } from '@/components/admin/dashboard-charts'
import { CalendarRange, ClipboardCheck, Users, Package, LayoutDashboard, ArrowUpRight } from 'lucide-react'
import { formatDayMonthIST } from '@/lib/utils/ist'

export const metadata = { title: 'Admin — Stride Run Club' }

// Returns a NEW Date (no mutation) set to the Monday 00:00 of the week containing `d`.
function startOfWeek(d: Date): Date {
  const result = new Date(d)
  const day = result.getDay()
  // Sunday = 0 → -6 (back to previous Monday); Mon-Sat (1-6) → 1 - day
  const offset = day === 0 ? -6 : 1 - day
  result.setDate(result.getDate() + offset)
  result.setHours(0, 0, 0, 0)
  return result
}

function weekKey(d: Date): string {
  return startOfWeek(d).toISOString().slice(0, 10) // YYYY-MM-DD of Monday — stable bucket key
}

function weekLabel(d: Date): string {
  return formatDayMonthIST(startOfWeek(d))
}

function ageBucket(dob: string): '18-24' | '25-34' | '35-44' | '45+' | null {
  const ms = Date.now() - new Date(dob).getTime()
  if (!Number.isFinite(ms) || ms <= 0) return null
  const years = Math.floor(ms / (365.25 * 86_400_000))
  if (years < 18) return null
  if (years < 25) return '18-24'
  if (years < 35) return '25-34'
  if (years < 45) return '35-44'
  return '45+'
}

const AGE_BUCKETS: ('18-24' | '25-34' | '35-44' | '45+')[] = ['18-24', '25-34', '35-44', '45+']
const GENDER_KEYS = ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'] as const

export default async function AdminDashboardPage() {
  const eightWeeksAgo = new Date()
  eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56)

  const [
    { count: eventCount },
    { count: productCount },
    { count: userCount },
    { count: registrationCount },
    { data: recentRegs },
    { data: eventsForStats },
    { data: checkInGenderRows },
    { data: dobRows },
  ] = await Promise.all([
    adminClient.from('events').select('*', { count: 'exact', head: true }),
    adminClient.from('products').select('*', { count: 'exact', head: true }),
    adminClient.from('users').select('*', { count: 'exact', head: true }),
    adminClient.from('event_registrations').select('*', { count: 'exact', head: true }).eq('status', 'CONFIRMED'),
    // Weekly registrations
    adminClient
      .from('event_registrations')
      .select('created_at')
      .eq('status', 'CONFIRMED')
      .gte('created_at', eightWeeksAgo.toISOString()),
    // Per-event check-in stats (last 6 published events)
    adminClient
      .from('events')
      .select('id, name, event_registrations(status, checked_in_at)')
      .eq('status', 'PUBLISHED')
      .order('event_date', { ascending: false })
      .limit(6),
    // Gender distribution of check-ins — one row per check-in (per-check-in basis)
    adminClient
      .from('event_registrations')
      .select('users(gender)')
      .eq('status', 'CONFIRMED')
      .not('checked_in_at', 'is', null),
    // Age group distribution — pull DOBs for all users who've set one
    adminClient
      .from('users')
      .select('date_of_birth')
      .not('date_of_birth', 'is', null),
  ])

  // Build weekly registrations data — use stable bucket key (Monday ISO date) for matching
  const weekBuckets: { key: string; label: string; registrations: number }[] = []
  const now = new Date()
  for (let i = 7; i >= 0; i--) {
    const ref = new Date(now)
    ref.setDate(ref.getDate() - i * 7)
    weekBuckets.push({ key: weekKey(ref), label: weekLabel(ref), registrations: 0 })
  }
  const byKey = new Map(weekBuckets.map((b, i) => [b.key, i]))
  for (const reg of recentRegs ?? []) {
    const idx = byKey.get(weekKey(new Date(reg.created_at)))
    if (idx !== undefined) weekBuckets[idx].registrations++
  }
  const weeklyRegistrations = weekBuckets.map(b => ({ week: b.label, registrations: b.registrations }))

  // Build event check-in data
  type EventWithRegs = { id: string; name: string; event_registrations: { status: string; checked_in_at: string | null }[] }
  const eventCheckIns = (eventsForStats ?? [] as unknown as EventWithRegs[]).map((e) => {
    const regs = (e as unknown as EventWithRegs).event_registrations ?? []
    const confirmed = regs.filter((r) => r.status === 'CONFIRMED').length
    const checkedIn = regs.filter((r) => r.status === 'CONFIRMED' && r.checked_in_at !== null).length
    return {
      name: (e as unknown as EventWithRegs).name,
      confirmed,
      checkedIn,
    }
  }).reverse()

  // Gender distribution — per-check-in counting
  type GenderRow = { users: { gender: string | null } | null }
  const genderCounts: Record<typeof GENDER_KEYS[number], number> = { MALE: 0, FEMALE: 0, OTHER: 0, PREFER_NOT_TO_SAY: 0 }
  for (const row of (checkInGenderRows ?? []) as unknown as GenderRow[]) {
    const g = row.users?.gender
    if (g && (GENDER_KEYS as readonly string[]).includes(g)) {
      genderCounts[g as typeof GENDER_KEYS[number]]++
    }
  }
  const genderDistribution = [
    { label: 'Male',              key: 'MALE'              as const, value: genderCounts.MALE },
    { label: 'Female',            key: 'FEMALE'            as const, value: genderCounts.FEMALE },
    { label: 'Other',             key: 'OTHER'             as const, value: genderCounts.OTHER },
    { label: 'Prefer not to say', key: 'PREFER_NOT_TO_SAY' as const, value: genderCounts.PREFER_NOT_TO_SAY },
  ]

  // Age group distribution
  const ageCounts: Record<typeof AGE_BUCKETS[number], number> = { '18-24': 0, '25-34': 0, '35-44': 0, '45+': 0 }
  for (const row of (dobRows ?? []) as { date_of_birth: string | null }[]) {
    if (!row.date_of_birth) continue
    const b = ageBucket(row.date_of_birth)
    if (b) ageCounts[b]++
  }
  const ageDistribution = AGE_BUCKETS.map(bucket => ({ bucket, count: ageCounts[bucket] }))

  const stats: { label: string; count: number; href: string; icon: React.ReactNode; tone: string }[] = [
    { label: 'Events',                   count: eventCount ?? 0,        href: '/admin/events',        icon: <CalendarRange size={18} />, tone: 'bg-stride-yellow-accent/15 text-stride-yellow-accent' },
    { label: 'Confirmed registrations',  count: registrationCount ?? 0, href: '/admin/registrations', icon: <ClipboardCheck size={18} />, tone: 'bg-green-500/15 text-green-400' },
    { label: 'Runners',                  count: userCount ?? 0,         href: '/admin/users',         icon: <Users size={18} />,         tone: 'bg-sky-500/15 text-sky-400' },
    { label: 'Products',                 count: productCount ?? 0,      href: '/admin/products',      icon: <Package size={18} />,       tone: 'bg-purple-500/15 text-purple-400' },
  ]

  return (
    <div>
      <div className='flex items-center gap-3 mb-8'>
        <div className='w-9 h-9 rounded-xl bg-stride-yellow-accent/15 text-stride-yellow-accent flex items-center justify-center shrink-0'>
          <LayoutDashboard size={18} />
        </div>
        <div>
          <h1 className='text-3xl font-bold text-white leading-none'>Dashboard</h1>
          <p className='text-white/40 text-xs mt-1.5 font-mono uppercase tracking-widest'>Snapshot of your community</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className='grid grid-cols-2 sm:grid-cols-4 gap-4'>
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className='group relative bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-stride-yellow-accent/50 hover:bg-white/8 transition-colors'
          >
            <div className='flex items-start justify-between gap-2 mb-2.5'>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${stat.tone}`}>
                {stat.icon}
              </div>
              <ArrowUpRight
                size={16}
                className='text-white/20 group-hover:text-stride-yellow-accent group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all'
              />
            </div>
            <p className='text-4xl font-bold text-white tabular-nums leading-none font-mono'>{stat.count}</p>
            <p className='text-white/45 text-xs mt-2 font-mono uppercase tracking-wider'>{stat.label}</p>
          </Link>
        ))}
      </div>

      {/* Charts — 2×2 grid on desktop, stacked on mobile */}
      <DashboardCharts
        weeklyRegistrations={weeklyRegistrations}
        eventCheckIns={eventCheckIns}
        genderDistribution={genderDistribution}
        ageDistribution={ageDistribution}
      />
    </div>
  )
}
