'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

// Wallet badge CTAs with generation feedback. Pass creation takes a moment,
// so each badge shows a spinner while its pass is being signed; success and
// failure both surface as toasts. Google Wallet opens in a NEW tab (the tab
// is opened synchronously on click so popup blockers allow it) — the
// confirmation page stays put.

const APPLE_WALLET_BADGE =
  'https://ienotcjldormdxrzukpk.supabase.co/storage/v1/object/public/stride-assets/images/web-assets/apple-wallet-cta.svg'
const GOOGLE_WALLET_BADGE =
  'https://ienotcjldormdxrzukpk.supabase.co/storage/v1/object/public/stride-assets/images/web-assets/google-wallet-cta.svg'

type Platform = 'apple' | 'google'

export function WalletPassButtons({ registrationId }: { registrationId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState<Platform | null>(null)

  function passUrl(platform: Platform) {
    return `/api/events/wallet-pass?reg=${registrationId}&platform=${platform}&format=json`
  }

  function handleFailure(code?: string, message?: string) {
    toast.error(message ?? 'We couldn’t generate your pass just now. Please try again in a bit.')
    // Limit/quota states also hide the buttons server-side — refresh to sync
    if (code === 'limit' || code === 'quota') router.refresh()
  }

  async function handleApple() {
    if (loading) return

    // iOS: navigate directly so Safari opens the Add-to-Wallet sheet in one
    // tap (a blob download would need a second tap from Files). The trade-off
    // is no loader/toast on iOS — the native sheet is the feedback.
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
      || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    if (isIOS) {
      window.location.href = `/api/events/wallet-pass?reg=${registrationId}&platform=apple`
      return
    }

    setLoading('apple')
    try {
      const res = await fetch(passUrl('apple'))
      const type = res.headers.get('content-type') ?? ''
      if (!res.ok || !type.includes('vnd.apple.pkpass')) {
        const data = await res.json().catch(() => null)
        handleFailure(data?.code, data?.error)
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'stride-run.pkpass'
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 30_000)
      toast.success('Pass downloaded. Open it to add to Apple Wallet.')
    } catch {
      toast.error('We couldn’t generate your pass just now. Please try again in a bit.')
    } finally {
      setLoading(null)
    }
  }

  async function handleGoogle() {
    if (loading) return
    setLoading('google')
    // Open the tab synchronously so popup blockers don't eat it
    const tab = window.open('about:blank', '_blank')
    try {
      const res = await fetch(passUrl('google'))
      const data = (await res.json().catch(() => null)) as { url?: string; code?: string; error?: string } | null
      if (!res.ok || !data?.url) {
        tab?.close()
        handleFailure(data?.code, data?.error)
        return
      }
      if (tab) tab.location.href = data.url
      else window.open(data.url, '_blank')
      toast.success('Google Wallet opened in a new tab.')
    } catch {
      tab?.close()
      toast.error('We couldn’t generate your pass just now. Please try again in a bit.')
    } finally {
      setLoading(null)
    }
  }

  const badge = (platform: Platform, src: string, alt: string, onClick: () => void) => (
    <button
      type='button'
      onClick={onClick}
      disabled={loading !== null}
      aria-label={alt}
      className='relative inline-block min-h-11 hover:opacity-90 active:scale-[0.98] transition-all disabled:cursor-wait'
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className={`h-12 w-auto transition-opacity ${loading === platform ? 'opacity-40' : ''}`}
      />
      {loading === platform && (
        <span className='absolute inset-0 flex items-center justify-center'>
          <Loader2 size={20} className='animate-spin text-white' aria-hidden='true' />
        </span>
      )}
    </button>
  )

  return (
    <div className='flex flex-wrap items-center gap-3'>
      {badge('apple', APPLE_WALLET_BADGE, 'Add to Apple Wallet', handleApple)}
      {badge('google', GOOGLE_WALLET_BADGE, 'Add to Google Wallet', handleGoogle)}
    </div>
  )
}
