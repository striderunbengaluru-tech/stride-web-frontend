import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { AdminNav } from '@/components/admin/admin-nav'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  // Always read role fresh from DB — JWT claims may hold stale values.
  const { data: row } = await adminClient
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (row?.role !== 'ADMIN') redirect('/')

  return (
    <div className='min-h-screen bg-stride-purple-primary'>
      {/* Glassmorphic backdrop strip — fills the gap between the floating main navbar
          and the sticky admin nav so page content never bleeds through behind them.
          Sits below both navbars (z-30 < admin nav z-40 < main navbar z-50). */}
      <div className='fixed top-0 left-0 right-0 h-28 z-30 bg-stride-purple-primary/75 backdrop-blur-xl border-b border-white/8 pointer-events-none' aria-hidden='true' />

      {/* pt-28 clears the fixed main site navbar (top-4 + min-h-[60px] = 76px, +36px margin) */}
      <div className='pt-28'>
        <AdminNav />
        <main className='w-full px-4 sm:px-6 py-8'>
          {children}
        </main>
      </div>
    </div>
  )
}
