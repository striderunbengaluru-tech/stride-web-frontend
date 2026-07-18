import { unstable_cache } from 'next/cache'
import { adminClient } from '@/lib/supabase/admin'

// Wallet-pass quota guards. Two layers:
// 1. Per registration: at most MAX_PASSES_PER_REGISTRATION generations, so one
//    person can't burn the monthly allowance by re-clicking.
// 2. Global: the WalletWallet free tier allows 1000 generations/month — when
//    the API reports the quota exhausted, the confirmation page hides the
//    wallet CTAs entirely. Usage is checked at most every 5 minutes.

export const MAX_PASSES_PER_REGISTRATION = 5

// Remaining monthly generations: a number, or null when unknown (usage
// endpoint unreachable — treat as available and let the create call decide).
// Returns 0 when the API key isn't configured, which also hides the CTAs.
export const getWalletQuotaRemaining = (): Promise<number | null> =>
  unstable_cache(
    async () => {
      const key = process.env.STRIDE_WALLETWALLET_API_KEY
      if (!key) return 0
      try {
        const res = await fetch('https://api.walletwallet.dev/api/auth/usage', {
          headers: { Authorization: `Bearer ${key}` },
          signal: AbortSignal.timeout(5000),
        })
        if (!res.ok) return null
        const data = (await res.json()) as { remaining?: number }
        return typeof data.remaining === 'number' ? data.remaining : null
      } catch {
        return null
      }
    },
    ['walletwallet-usage'],
    { revalidate: 300, tags: ['wallet-quota'] }
  )()

// How many passes this registration has generated. Resilient: returns 0 if
// the wallet_passes_generated column doesn't exist yet, so the page never
// breaks pre-migration.
export async function getWalletPassCount(registrationId: string): Promise<number> {
  try {
    const { data, error } = await adminClient
      .from('event_registrations')
      .select('wallet_passes_generated')
      .eq('id', registrationId)
      .maybeSingle()
    if (error || !data) return 0
    return (data as { wallet_passes_generated?: number | null }).wallet_passes_generated ?? 0
  } catch {
    return 0
  }
}

// Best-effort increment — a missing column must never fail pass generation.
export async function incrementWalletPassCount(registrationId: string, current: number): Promise<void> {
  try {
    await adminClient
      .from('event_registrations')
      .update({ wallet_passes_generated: current + 1 })
      .eq('id', registrationId)
  } catch {
    // pre-migration: column absent; the global quota guard still applies
  }
}
