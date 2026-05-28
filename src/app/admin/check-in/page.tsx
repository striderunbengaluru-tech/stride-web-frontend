import { RunnerTagCheckIn } from '@/components/admin/runner-tag-check-in'

export const metadata = { title: 'Check-in — Stride Admin' }

export default function AdminCheckInPage() {
  return (
    <div className='max-w-lg mx-auto px-4 py-8'>
      <div className='mb-8'>
        <h1 className='text-2xl font-bold text-white'>Event Check-in</h1>
        <p className='text-white/50 text-sm mt-1'>
          Select the event, then enter the runner&apos;s 4-character Runner Tag to check them in.
        </p>
      </div>
      <div className='bg-white/10 backdrop-blur-md border border-white/15 rounded-xl p-6'>
        <RunnerTagCheckIn />
      </div>
    </div>
  )
}
