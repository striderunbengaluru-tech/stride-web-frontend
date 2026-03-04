import { adminClient } from '@/lib/supabase/admin'
import { updateUserRoleAction } from '@/lib/actions/admin'

export const metadata = { title: 'Users — Admin' }

const ROLE_STYLES: Record<string, string> = {
  ADMIN: 'bg-stride-yellow-accent/20 text-stride-yellow-accent',
  MEMBER: 'bg-blue-500/20 text-blue-400',
  GUEST: 'bg-white/10 text-white/50',
}

export default async function AdminUsersPage() {
  const { data: users } = await adminClient
    .from('users')
    .select('id, full_name, email, username, role, created_at')
    .order('created_at', { ascending: false })

  return (
    <div>
      <h1 className='text-3xl font-bold text-white mb-8'>Users</h1>

      <div className='bg-white/10 backdrop-blur-md border border-white/15 rounded-xl overflow-hidden'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='border-b border-white/10'>
              <th className='text-left text-white/50 font-medium px-6 py-4 uppercase tracking-wider text-xs'>User</th>
              <th className='text-left text-white/50 font-medium px-6 py-4 uppercase tracking-wider text-xs'>Joined</th>
              <th className='text-left text-white/50 font-medium px-6 py-4 uppercase tracking-wider text-xs'>Role</th>
              <th className='px-6 py-4' />
            </tr>
          </thead>
          <tbody>
            {(users ?? []).map((u) => (
              <tr key={u.id} className='border-b border-white/5 hover:bg-white/5 transition-colors'>
                <td className='px-6 py-4'>
                  <p className='text-white font-medium'>{u.full_name}</p>
                  <p className='text-white/40 text-xs mt-0.5'>{u.email}</p>
                  {u.username && <p className='text-white/30 text-xs'>@{u.username}</p>}
                </td>
                <td className='px-6 py-4 text-white/60 text-xs'>
                  {new Date(u.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </td>
                <td className='px-6 py-4'>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-md ${ROLE_STYLES[u.role] ?? 'bg-white/10 text-white/50'}`}>
                    {u.role}
                  </span>
                </td>
                <td className='px-6 py-4'>
                  <form action={updateUserRoleAction.bind(null, u.id, u.role === 'ADMIN' ? 'MEMBER' : 'ADMIN')}>
                    <button type='submit' className='text-xs text-white/50 hover:text-stride-yellow-accent transition-colors'>
                      {u.role === 'ADMIN' ? 'Remove Admin' : 'Make Admin'}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
