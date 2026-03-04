import { QrScanner } from '@/components/admin/qr-scanner'

export const metadata = { title: 'Scan QR — Stride Admin' }

export default function AdminScanPage() {
  return (
    <div className='max-w-lg mx-auto px-4 py-8'>
      <div className='mb-8'>
        <h1 className='text-2xl font-bold text-white'>Scan QR Ticket</h1>
        <p className='text-white/50 text-sm mt-1'>
          Point the camera at an attendee&apos;s QR ticket to check them in.
        </p>
      </div>
      <QrScanner />
    </div>
  )
}
