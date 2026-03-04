import { createClient } from '@supabase/supabase-js'

// Service role client — bypasses RLS. Use only in trusted server contexts
// (admin server actions, webhook handlers). Never expose to client bundles.
export const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.STRIDE_SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)
