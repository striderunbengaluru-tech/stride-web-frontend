import { adminClient } from '@/lib/supabase/admin'

export const metadata = { title: 'Admin — Stride Run Club' }

export default async function AdminDashboardPage() {
  const [
    { count: eventCount },
    { count: productCount },
    { count: userCount },
    { count: registrationCount },
  ] = await Promise.all([
    adminClient.from('events').select('*', { count: 'exact', head: true }),
    adminClient.from('products').select('*', { count: 'exact', head: true }),
    adminClient.from('users').select('*', { count: 'exact', head: true }),
    adminClient.from('event_registrations').select('*', { count: 'exact', head: true }).eq('status', 'CONFIRMED'),
  ])

  const stats = [
    { label: 'Events', count: eventCount ?? 0, href: '/admin/events' },
    { label: 'Confirmed Registrations', count: registrationCount ?? 0, href: '/admin/registrations' },
    { label: 'Runners', count: userCount ?? 0, href: '/admin/users' },
    { label: 'Products', count: productCount ?? 0, href: '/admin/products' },
  ]

  return (
    <div>
      <h1 className='text-3xl font-bold text-white mb-8'>Dashboard</h1>
      <div className='grid grid-cols-2 sm:grid-cols-4 gap-4'>
        {stats.map((stat) => (
          <a
            key={stat.label}
            href={stat.href}
            className='bg-white/10 backdrop-blur-md border border-white/15 rounded-xl p-6 hover:border-stride-yellow-accent/50 transition-colors'
          >
            <p className='text-white/50 text-sm uppercase tracking-widest'>{stat.label}</p>
            <p className='text-4xl font-bold text-stride-yellow-accent mt-2'>{stat.count}</p>
          </a>
        ))}
      </div>
    </div>
  )
}
