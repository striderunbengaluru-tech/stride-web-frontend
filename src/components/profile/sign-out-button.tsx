'use client'

import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export function SignOutButton() {
  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/become-a-member'
  }

  return (
    <button
      type='button'
      onClick={handleSignOut}
      className='flex-1 flex items-center justify-center gap-2 text-white/70 hover:text-white text-sm font-medium transition-colors min-h-11 px-4 rounded-lg border border-white/15 hover:border-white/30 hover:bg-white/5'
    >
      <LogOut size={15} aria-hidden='true' />
      Log out
    </button>
  )
}
