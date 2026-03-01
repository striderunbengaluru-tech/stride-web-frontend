import { createClient } from '@supabase/supabase-js'

// Service role client — bypasses RLS. Only use in trusted server-side admin contexts.
// Never import this in client components or expose to the browser.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.STRIDE_SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
