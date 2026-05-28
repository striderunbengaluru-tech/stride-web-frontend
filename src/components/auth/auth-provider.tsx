'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast, ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

// sessionStorage key — cleared on sign-out so the next real sign-in shows the toast again
const AUTHED_KEY = '_stride_authed'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        router.refresh()
        // Only toast on an actual new sign-in, not on every session restoration
        if (!sessionStorage.getItem(AUTHED_KEY)) {
          sessionStorage.setItem(AUTHED_KEY, '1')
          toast.success('Signed in successfully!', { toastId: 'signed-in' })
        }
      } else if (event === 'SIGNED_OUT') {
        sessionStorage.removeItem(AUTHED_KEY)
        router.refresh()
        toast.info('Signed out successfully.', { toastId: 'signed-out' })
      } else if (event === 'USER_UPDATED') {
        router.refresh()
      }
      // TOKEN_REFRESHED — silent, no action needed
    })
    return () => subscription.unsubscribe()
  }, [router])

  return (
    <>
      {children}
      <ToastContainer
        position='bottom-right'
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        theme='dark'
        toastStyle={{
          background: '#1a0d24',
          border: '1px solid rgba(255,255,255,0.1)',
          color: '#ffffff',
        }}
      />
    </>
  )
}
