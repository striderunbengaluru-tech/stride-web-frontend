import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { user as userTable } from '@/lib/db/schema'
import { AdminNav } from '@/components/admin/admin-nav'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/')

  // Always read role fresh from DB — cookieCache may hold a stale value
  // if the role was changed after the session was created.
  const [row] = await db
    .select({ role: userTable.role })
    .from(userTable)
    .where(eq(userTable.id, session.user.id))
    .limit(1)

  if (row?.role !== 'ADMIN') {
    redirect('/')
  }

  return (
    <div className='min-h-screen bg-stride-purple-primary'>
      <div className='pt-16'>
        <AdminNav />
        <main className='max-w-6xl mx-auto px-6 py-8'>{children}</main>
      </div>
    </div>
  )
}
