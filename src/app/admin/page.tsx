import { adminClient } from '@/lib/supabase/admin'
import { DashboardCharts } from '@/components/admin/dashboard-charts'

export const metadata = { title: 'Admin — Stride Run Club' }

function startOfWeek(d: Date) {
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.setDate(diff))
}

function weekLabel(d: Date) {
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

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
    { data: allEvents },
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
    // All events for status breakdown
    adminClient
      .from('events')
      .select('status'),
  ])

  // Build weekly registrations data
  const weekBuckets = new Map<string, number>()
  for (let i = 7; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i * 7)
    const label = weekLabel(startOfWeek(new Date(d)))
    weekBuckets.set(label, 0)
  }
  for (const reg of recentRegs ?? []) {
    const d = new Date(reg.created_at)
    const label = weekLabel(startOfWeek(new Date(d)))
    if (weekBuckets.has(label)) weekBuckets.set(label, (weekBuckets.get(label) ?? 0) + 1)
  }
  const weeklyRegistrations = Array.from(weekBuckets.entries()).map(([week, registrations]) => ({ week, registrations }))

  // Build event check-in data
  type EventWithRegs = { id: string; name: string; event_registrations: { status: string; checked_in_at: string | null }[] }
  const eventCheckIns = (eventsForStats ?? [] as unknown as EventWithRegs[]).map((e) => {
    const regs = (e as unknown as EventWithRegs).event_registrations ?? []
    const confirmed = regs.filter((r) => r.status === 'CONFIRMED').length
    const checkedIn = regs.filter((r) => r.checked_in_at !== null).length
    return {
      name: (e as unknown as EventWithRegs).name,
      confirmed,
      checkedIn,
    }
  }).reverse()

  // Event status breakdown
  const statusCounts = { PUBLISHED: 0, DRAFT: 0, CANCELLED: 0 }
  for (const e of allEvents ?? []) {
    const s = e.status as keyof typeof statusCounts
    if (s in statusCounts) statusCounts[s]++
  }
  const eventStatusBreakdown = Object.entries(statusCounts).map(([name, value]) => ({ name, value }))

  const stats = [
    { label: 'Events', count: eventCount ?? 0, href: '/admin/events' },
    { label: 'Confirmed registrations', count: registrationCount ?? 0, href: '/admin/registrations' },
    { label: 'Runners', count: userCount ?? 0, href: '/admin/users' },
    { label: 'Products', count: productCount ?? 0, href: '/admin/products' },
  ]

  return (
    <div>
      <h1 className='text-3xl font-bold text-white mb-8'>Dashboard</h1>

      {/* Stat cards */}
      <div className='grid grid-cols-2 sm:grid-cols-4 gap-4'>
        {stats.map((stat) => (
          <a
            key={stat.label}
            href={stat.href}
            className='bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-stride-yellow-accent/50 transition-colors'
          >
            <p className='text-white/40 text-sm'>{stat.label}</p>
            <p className='text-4xl font-bold text-stride-yellow-accent mt-2'>{stat.count}</p>
          </a>
        ))}
      </div>

      {/* Charts */}
      <DashboardCharts
        weeklyRegistrations={weeklyRegistrations}
        eventCheckIns={eventCheckIns}
        eventStatusBreakdown={eventStatusBreakdown}
      />
    </div>
  )
}
