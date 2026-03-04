'use client'

import { useRef } from 'react'
import QRCode from 'react-qr-code'
import { Download, Share2, Printer, CheckCircle, Calendar, MapPin, User, Hash } from 'lucide-react'

type Props = {
  token: string
  registrationId: string
  eventName: string
  eventDate: string | null
  eventLocation: string | null
  userName: string
  userEmail: string
}

export function QrTicket({ token, registrationId, eventName, eventDate, eventLocation, userName, userEmail }: Props) {
  const qrRef = useRef<HTMLDivElement>(null)

  function handlePrint() {
    window.print()
  }

  async function handleShare() {
    const shareData = {
      title: `My ticket for ${eventName}`,
      text: `I'm registered for ${eventName} with Stride Run Club!`,
      url: window.location.href,
    }
    if (navigator.share) {
      await navigator.share(shareData)
    } else {
      await navigator.clipboard.writeText(window.location.href)
      alert('Link copied to clipboard!')
    }
  }

  function handleDownload() {
    const svgEl = qrRef.current?.querySelector('svg')
    if (!svgEl) return

    const svgData = new XMLSerializer().serializeToString(svgEl)
    const canvas = document.createElement('canvas')
    const size = 400
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!

    const img = new Image()
    img.onload = () => {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, size, size)
      ctx.drawImage(img, 0, 0, size, size)

      const link = document.createElement('a')
      link.download = `stride-ticket-${registrationId.slice(0, 8)}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    }
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgData)
  }

  const shortId = registrationId.slice(0, 8).toUpperCase()

  return (
    <>
      {/* Print-only styles */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #stride-ticket-print { display: block !important; }
        }
      `}</style>

      <div id='stride-ticket-print' className='w-full max-w-lg mx-auto'>

        {/* Confirmation banner */}
        <div className='flex items-center gap-3 mb-6'>
          <CheckCircle className='text-green-400 shrink-0' size={28} />
          <div>
            <p className='text-white font-bold text-lg'>Booking Confirmed!</p>
            <p className='text-white/50 text-sm'>Your spot is reserved. Show this QR at the entry.</p>
          </div>
        </div>

        {/* Ticket card */}
        <div className='bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl overflow-hidden'>

          {/* Ticket header */}
          <div className='bg-stride-yellow-accent/10 border-b border-white/10 px-6 py-4 flex items-center justify-between'>
            <div>
              <p className='text-stride-yellow-accent text-xs font-bold uppercase tracking-widest mb-0.5'>
                Stride Run Club
              </p>
              <h2 className='text-white font-bold text-xl leading-tight'>{eventName}</h2>
            </div>
            <div className='text-right'>
              <p className='text-white/40 text-xs uppercase tracking-wider'>Booking Ref</p>
              <p className='text-stride-yellow-accent font-mono font-bold text-sm'>#{shortId}</p>
            </div>
          </div>

          {/* Event meta */}
          <div className='px-6 py-4 space-y-2.5 border-b border-white/10'>
            {eventDate && (
              <div className='flex items-center gap-2.5 text-white/70 text-sm'>
                <Calendar size={15} className='text-stride-yellow-accent shrink-0' />
                <span>{eventDate}</span>
              </div>
            )}
            {eventLocation && (
              <div className='flex items-center gap-2.5 text-white/70 text-sm'>
                <MapPin size={15} className='text-stride-yellow-accent shrink-0' />
                <span>{eventLocation}</span>
              </div>
            )}
            <div className='flex items-center gap-2.5 text-white/70 text-sm'>
              <User size={15} className='text-stride-yellow-accent shrink-0' />
              <span>{userName}</span>
            </div>
            <div className='flex items-center gap-2.5 text-white/40 text-xs'>
              <Hash size={13} className='shrink-0' />
              <span className='font-mono'>{registrationId}</span>
            </div>
          </div>

          {/* Perforated divider */}
          <div className='relative mx-0 border-t-2 border-dashed border-white/15'>
            <div className='absolute -left-3 -translate-y-1/2 w-6 h-6 bg-stride-purple-primary rounded-full border border-white/10' />
            <div className='absolute -right-3 -translate-y-1/2 w-6 h-6 bg-stride-purple-primary rounded-full border border-white/10' />
          </div>

          {/* QR code section */}
          <div className='px-6 py-6 flex flex-col items-center gap-4'>
            <div ref={qrRef} className='bg-white p-4 rounded-xl shadow-xl'>
              <QRCode
                id='ticket-qr'
                value={token}
                size={192}
                bgColor='#ffffff'
                fgColor='#010101'
              />
            </div>
            <p className='text-white/30 text-xs text-center max-w-xs'>
              Scan this code at the event entry. One scan per person. Do not share.
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className='flex gap-3 mt-5'>
          <button
            onClick={handleDownload}
            className='flex-1 flex items-center justify-center gap-2 py-3 rounded-md bg-white/10 hover:bg-white/15 border border-white/15 hover:border-white/25 text-white text-sm font-medium transition-colors min-h-11'
          >
            <Download size={15} />
            Download QR
          </button>
          <button
            onClick={handleShare}
            className='flex-1 flex items-center justify-center gap-2 py-3 rounded-md bg-white/10 hover:bg-white/15 border border-white/15 hover:border-white/25 text-white text-sm font-medium transition-colors min-h-11'
          >
            <Share2 size={15} />
            Share
          </button>
          <button
            onClick={handlePrint}
            className='flex-1 flex items-center justify-center gap-2 py-3 rounded-md bg-white/10 hover:bg-white/15 border border-white/15 hover:border-white/25 text-white text-sm font-medium transition-colors min-h-11'
          >
            <Printer size={15} />
            Print
          </button>
        </div>
      </div>
    </>
  )
}
