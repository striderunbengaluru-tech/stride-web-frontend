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
      <div className='pt-20'>
        <AdminNav />
        <main className='max-w-6xl mx-auto px-6 py-8'>{children}</main>
      </div>
    </div>
  )
}
