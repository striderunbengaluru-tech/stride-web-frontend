'use client'

import { useState, useRef, useCallback, type ComponentType } from 'react'
import dynamic from 'next/dynamic'
import { CheckCircle2, XCircle, AlertCircle, Loader2, ScanLine, RotateCcw } from 'lucide-react'

type IDetectedBarcode = { rawValue: string }
type ScannerProps = {
  onScan: (detectedCodes: IDetectedBarcode[]) => void
  onError?: (error: unknown) => void
  constraints?: MediaTrackConstraints
  components?: { audio?: boolean; onOff?: boolean; torch?: boolean; zoom?: boolean; finder?: boolean }
  styles?: { container?: React.CSSProperties; video?: React.CSSProperties }
}

const Scanner = dynamic<ScannerProps>(
  () => import('@yudiel/react-qr-scanner').then((m) => m.Scanner as ComponentType<ScannerProps>),
  { ssr: false, loading: () => <ScannerPlaceholder label='Loading scanner…' /> }
)

type CheckInResult =
  | { success: true; checkedInAt: string; attendeeName: string; eventName: string; runsCompleted: number }
  | { success: false; message: string; checkedInAt?: string }

function ScannerPlaceholder({ label }: { label: string }) {
  return (
    <div className='w-full aspect-square flex flex-col items-center justify-center gap-3 bg-black/60 rounded-xl border border-white/15'>
      <Loader2 size={36} className='text-stride-yellow-accent animate-spin' />
      <p className='text-white/50 text-sm'>{label}</p>
    </div>
  )
}

function playSuccessBeep() {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.1)
    gain.gain.setValueAtTime(0.4, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.4)
  } catch {
    // AudioContext not available — silent fallback
  }
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export function QrScanner() {
  const [result, setResult] = useState<CheckInResult | null>(null)
  const [scanError, setScanError] = useState<string | null>(null)
  // Use refs for processing flag and last token to avoid stale closure bugs
  const processingRef = useRef(false)
  const lastTokenRef = useRef('')

  const handleScan = useCallback(async (detectedCodes: IDetectedBarcode[]) => {
    const token = detectedCodes[0]?.rawValue
    if (!token || processingRef.current || token === lastTokenRef.current) return

    processingRef.current = true
    lastTokenRef.current = token
    setScanError(null)

    try {
      const res = await fetch('/api/events/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const json = await res.json()

      if (res.ok) {
        playSuccessBeep()
        setResult({
          success: true,
          checkedInAt: json.checkedInAt,
          attendeeName: json.attendeeName,
          eventName: json.eventName,
          runsCompleted: json.runsCompleted,
        })
      } else if (res.status === 409) {
        setResult({
          success: false,
          message: `Already checked in at ${formatTime(json.checkedInAt)}`,
          checkedInAt: json.checkedInAt,
        })
      } else {
        setResult({ success: false, message: json.error ?? 'Check-in failed' })
      }
    } catch {
      setResult({ success: false, message: 'Network error — try again' })
    } finally {
      processingRef.current = false
    }
  }, [])

  function reset() {
    setResult(null)
    setScanError(null)
    lastTokenRef.current = ''
    processingRef.current = false
  }

  // Success screen
  if (result?.success) {
    return (
      <div className='w-full max-w-md mx-auto'>
        <div className='bg-green-500/10 border border-green-500/30 rounded-2xl p-8 flex flex-col items-center gap-5 text-center'>
          <CheckCircle2 size={64} className='text-green-400' />
          <div>
            <p className='text-green-300 font-bold text-xl'>{result.attendeeName}</p>
            <p className='text-white/60 text-sm mt-1'>{result.eventName}</p>
          </div>
          <div className='w-full grid grid-cols-2 gap-3'>
            <div className='bg-white/5 rounded-xl p-3'>
              <p className='text-white/40 text-xs uppercase tracking-wider mb-1'>Check-in Time</p>
              <p className='text-white font-mono text-sm font-medium'>{formatTime(result.checkedInAt)}</p>
            </div>
            <div className='bg-white/5 rounded-xl p-3'>
              <p className='text-white/40 text-xs uppercase tracking-wider mb-1'>Total Runs</p>
              <p className='text-stride-yellow-accent font-bold text-xl'>{result.runsCompleted}</p>
            </div>
          </div>
          <button
            onClick={reset}
            className='w-full flex items-center justify-center gap-2 py-3 rounded-md bg-stride-yellow-accent text-stride-dark font-bold text-sm hover:bg-stride-yellow-accent/90 transition-colors min-h-11'
          >
            <RotateCcw size={16} />
            Scan Another
          </button>
        </div>
      </div>
    )
  }

  // Error / already-checked-in screen
  if (result && !result.success) {
    return (
      <div className='w-full max-w-md mx-auto'>
        <div className='bg-red-500/10 border border-red-500/30 rounded-2xl p-8 flex flex-col items-center gap-5 text-center'>
          <XCircle size={64} className='text-red-400' />
          <p className='text-red-300 font-bold text-lg'>{result.message}</p>
          <button
            onClick={reset}
            className='w-full flex items-center justify-center gap-2 py-3 rounded-md bg-stride-yellow-accent text-stride-dark font-bold text-sm hover:bg-stride-yellow-accent/90 transition-colors min-h-11'
          >
            <RotateCcw size={16} />
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className='w-full max-w-md mx-auto space-y-4'>
      <div className='relative rounded-xl overflow-hidden border border-white/15'>
        <Scanner
          onScan={handleScan}
          onError={(err) => {
            const msg = err instanceof Error ? err.message : String(err)
            // Suppress noisy non-errors from continuous scanning
            if (!msg.toLowerCase().includes('no qr') && !msg.toLowerCase().includes('notfound')) {
              setScanError(msg)
            }
          }}
          constraints={{ facingMode: 'environment' }}
          components={{ audio: false, onOff: false, torch: false, zoom: false, finder: false }}
          styles={{ container: { width: '100%' }, video: { width: '100%', display: 'block' } }}
        />
        {/* Corner bracket overlay */}
        <div className='absolute inset-0 pointer-events-none'>
          <div className='absolute top-6 left-6 w-7 h-7 border-t-4 border-l-4 border-stride-yellow-accent rounded-tl-md' />
          <div className='absolute top-6 right-6 w-7 h-7 border-t-4 border-r-4 border-stride-yellow-accent rounded-tr-md' />
          <div className='absolute bottom-6 left-6 w-7 h-7 border-b-4 border-l-4 border-stride-yellow-accent rounded-bl-md' />
          <div className='absolute bottom-6 right-6 w-7 h-7 border-b-4 border-r-4 border-stride-yellow-accent rounded-br-md' />
        </div>
      </div>

      {scanError && (
        <div className='flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-xl p-3'>
          <AlertCircle size={16} className='text-red-400 shrink-0 mt-0.5' />
          <p className='text-red-300 text-sm'>{scanError}</p>
        </div>
      )}

      <div className='flex items-center gap-2 justify-center text-white/30 text-xs'>
        <ScanLine size={14} />
        <span>Point camera at a Stride QR ticket</span>
      </div>
    </div>
  )
}
