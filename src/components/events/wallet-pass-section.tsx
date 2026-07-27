import {
  MAX_PASSES_PER_REGISTRATION,
  getWalletQuotaRemaining,
  getWalletPassCount,
} from '@/lib/wallet-quota'
import { WalletPassButtons } from '@/components/events/wallet-pass-buttons'
import { Reveal } from '@/components/ui/reveal'

type Props = {
  registrationId: string
  isConcluded: boolean
  walletFlag?: string
}

// The wallet CTAs depend on the monthly WalletWallet quota, which is fetched
// from an external API (up to ~2s on a cache miss). Rendering this in its own
// async component lets the confirmation page stream its shell immediately and
// fill this section in when the quota resolves, instead of blocking the whole
// page on that call. Wrap it in <Suspense> at the call site.
export async function WalletPassSection({ registrationId, isConcluded, walletFlag }: Props) {
  // No wallet pass once the run is over.
  if (isConcluded) return null

  const [quotaRemaining, passCount] = await Promise.all([
    getWalletQuotaRemaining(),
    getWalletPassCount(registrationId),
  ])

  const walletAvailable = quotaRemaining === null || quotaRemaining > 0
  const underPassCap = passCount < MAX_PASSES_PER_REGISTRATION
  const showWalletCtas = walletAvailable && underPassCap
  const walletNotice =
    walletAvailable && (walletFlag === 'limit' || !underPassCap)
      ? `You’ve hit the download limit for this booking (${MAX_PASSES_PER_REGISTRATION} passes). Your saved pass still works.`
      : walletFlag === 'quota'
      ? 'Wallet passes are temporarily unavailable. Please try again later.'
      : walletFlag === 'error'
      ? 'We couldn’t generate your pass just now. Please try again in a bit.'
      : null

  if (!showWalletCtas && !walletNotice) return null

  return (
    <Reveal>
      <div>
        <p className='text-white/50 text-[10px] font-bold font-mono uppercase tracking-widest mb-3'>Save to your wallet</p>
        {walletNotice && (
          <p className='text-white/60 text-xs bg-white/5 border border-white/12 rounded-lg px-3 py-2.5 mb-3'>
            {walletNotice}
          </p>
        )}
        {showWalletCtas && <WalletPassButtons registrationId={registrationId} />}
      </div>
    </Reveal>
  )
}

// Fallback shown while WalletPassSection resolves — mirrors the section header
// plus the two wallet-badge buttons so the layout doesn't jump.
export function WalletPassSectionSkeleton() {
  return (
    <div>
      <p className='text-white/50 text-[10px] font-bold font-mono uppercase tracking-widest mb-3'>Save to your wallet</p>
      <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
        <div className='h-12 rounded-md bg-white/8 animate-pulse' />
        <div className='h-12 rounded-md bg-white/8 animate-pulse' />
      </div>
    </div>
  )
}
