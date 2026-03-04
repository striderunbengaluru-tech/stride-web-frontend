'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast, ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

// Listens for Supabase auth state changes and calls router.refresh() so
// server components (Navbar, layouts) re-render with the latest session state.
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        router.refresh()
        toast.success('Signed in successfully!', { toastId: 'signed-in' })
      } else if (event === 'SIGNED_OUT') {
        router.refresh()
        toast.info('You have been signed out.', { toastId: 'signed-out' })
      } else if (event === 'TOKEN_REFRESHED') {
        // silent
      } else if (event === 'USER_UPDATED') {
        router.refresh()
      }
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
