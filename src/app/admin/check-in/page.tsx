import { CheckCircle2, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { checkInByRegistrationId, type CheckInResult } from '@/lib/check-in'
import { RunnerTagCheckIn } from '@/components/admin/runner-tag-check-in'
import { formatTimeIST, formatDayMonthIST } from '@/lib/utils/ist'

export const metadata = { title: 'Check-in — Stride Admin' }

type Props = { searchParams: Promise<{ reg?: string }> }

// When opened from a wallet-pass QR (?reg=<registrationId>), check the runner
// in immediately and show the result. The admin layout already gates this
// route, but a page-load mutation is an admin entry point of its own, so the
// role is re-verified here independently (fresh DB read, never JWT claims).
async function scanCheckIn(registrationId: string): Promise<CheckInResult | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: viewer } = await adminClient
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  if (viewer?.role !== 'ADMIN') return null

  return checkInByRegistrationId(registrationId)
}

function ScanResult({ result }: { result: CheckInResult }) {
  if (result.ok) {
    return (
      <div className='mb-6 rounded-xl border border-green-500/30 bg-green-500/10 p-5'>
        <div className='flex items-center gap-2.5'>
          <CheckCircle2 size={20} className='text-green-400 shrink-0' />
          <p className='text-green-400 font-bold'>Checked in</p>
        </div>
        <p className='text-white text-lg font-semibold mt-2'>{result.attendeeName}</p>
        <p className='text-white/60 text-sm'>{result.eventName}</p>
        <p className='text-white/40 text-xs mt-2 font-mono'>
          Run #{result.runsCompleted} · {formatTimeIST(result.checkedInAt)}
        </p>
      </div>
    )
  }

  const already = result.code === 'already'
  return (
    <div className={`mb-6 rounded-xl border p-5 ${already ? 'border-stride-yellow-accent/40 bg-stride-yellow-accent/10' : 'border-red-500/30 bg-red-500/10'}`}>
      <div className='flex items-center gap-2.5'>
        <AlertTriangle size={20} className={`shrink-0 ${already ? 'text-stride-yellow-accent' : 'text-red-400'}`} />
        <p className={`font-bold ${already ? 'text-stride-yellow-accent' : 'text-red-400'}`}>{result.message}</p>
      </div>
      {result.attendeeName && (
        <p className='text-white text-lg font-semibold mt-2'>{result.attendeeName}</p>
      )}
      {result.eventName && <p className='text-white/60 text-sm'>{result.eventName}</p>}
      {result.checkedInAt && (
        <p className='text-white/40 text-xs mt-2 font-mono'>
          Checked in at {formatDayMonthIST(result.checkedInAt)}, {formatTimeIST(result.checkedInAt)}
        </p>
      )}
    </div>
  )
}

export default async function AdminCheckInPage({ searchParams }: Props) {
  const { reg } = await searchParams
  const scanResult = reg ? await scanCheckIn(reg) : null

  return (
    <div className='max-w-lg mx-auto px-4 py-8'>
      <div className='mb-8'>
        <h1 className='text-2xl font-bold text-white'>Event Check-in</h1>
        <p className='text-white/50 text-sm mt-1'>
          Scan a runner&apos;s wallet pass QR with your camera, or select the event and enter their
          4-character Runner Tag.
        </p>
      </div>

      {scanResult && <ScanResult result={scanResult} />}

      <div className='bg-white/10 backdrop-blur-md border border-white/15 rounded-xl p-6'>
        <RunnerTagCheckIn />
      </div>
    </div>
  )
}
