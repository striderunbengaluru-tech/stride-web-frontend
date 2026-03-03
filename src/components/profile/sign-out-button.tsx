'use client'

import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { authClient } from '@/lib/auth/client'

export function SignOutButton() {
  const router = useRouter()

  async function handleSignOut() {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push('/login')
          router.refresh()
        },
      },
    })
  }

  return (
    <button
      type='button'
      onClick={handleSignOut}
      className='flex items-center gap-2 text-white/50 hover:text-red-400 text-sm font-medium transition-colors min-h-11 px-4 rounded-md border border-white/15 hover:border-red-500/50'
    >
      <LogOut size={15} aria-hidden='true' />
      Log out
    </button>
  )
}
