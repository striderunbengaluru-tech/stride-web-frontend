'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { Camera, CameraOff, CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react'

// BarcodeDetector is a browser API not yet in TypeScript's lib.dom.d.ts
declare class BarcodeDetector {
  constructor(options?: { formats: string[] })
  detect(source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement): Promise<{ rawValue: string }[]>
  static getSupportedFormats(): Promise<string[]>
}

type ScanResult = {
  success: boolean
  message: string
  checkedInAt?: string
}

export function QrScanner() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const streamRef = useRef<MediaStream | null>(null)
  const detectorRef = useRef<BarcodeDetector | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const lastTokenRef = useRef<string | null>(null)

  const stopCamera = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setIsScanning(false)
  }, [])

  useEffect(() => {
    return () => { stopCamera() }
  }, [stopCamera])

  async function startCamera() {
    setError(null)
    setResult(null)
    lastTokenRef.current = null

    if (!('BarcodeDetector' in window)) {
      setError('Your browser does not support native QR scanning. Please use Chrome 83+ or Safari 17+.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      detectorRef.current = new BarcodeDetector({ formats: ['qr_code'] })
      setIsScanning(true)
      scanLoop()
    } catch (err) {
      setError('Camera access denied. Please allow camera permissions and try again.')
      console.error('[QrScanner] camera error', err)
    }
  }

  function scanLoop() {
    const video = videoRef.current
    const detector = detectorRef.current
    if (!video || !detector || video.readyState < 2) {
      animFrameRef.current = requestAnimationFrame(scanLoop)
      return
    }

    detector.detect(video).then((barcodes) => {
      if (barcodes.length > 0) {
        const token = barcodes[0].rawValue
        if (token && token !== lastTokenRef.current && !processing) {
          lastTokenRef.current = token
          handleToken(token)
        }
      }
      animFrameRef.current = requestAnimationFrame(scanLoop)
    }).catch(() => {
      animFrameRef.current = requestAnimationFrame(scanLoop)
    })
  }

  async function handleToken(token: string) {
    setProcessing(true)
    try {
      const res = await fetch('/api/events/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await res.json()

      if (res.ok) {
        setResult({ success: true, message: 'Check-in successful!', checkedInAt: data.checkedInAt })
        stopCamera()
      } else if (res.status === 409) {
        setResult({ success: false, message: `Already checked in at ${new Date(data.checkedInAt).toLocaleTimeString('en-IN')}` })
        stopCamera()
      } else {
        setResult({ success: false, message: data.error ?? 'Check-in failed' })
        // Allow rescanning after error
        setTimeout(() => {
          lastTokenRef.current = null
          setResult(null)
        }, 3000)
      }
    } catch {
      setResult({ success: false, message: 'Network error — try again' })
      setTimeout(() => {
        lastTokenRef.current = null
        setResult(null)
      }, 3000)
    } finally {
      setProcessing(false)
    }
  }

  function reset() {
    setResult(null)
    setError(null)
    lastTokenRef.current = null
    startCamera()
  }

  return (
    <div className='w-full max-w-md mx-auto space-y-5'>
      {/* Camera viewport */}
      <div className='relative bg-black rounded-xl overflow-hidden aspect-square border border-white/15'>
        <video
          ref={videoRef}
          className='w-full h-full object-cover'
          muted
          playsInline
        />

        {!isScanning && !result && !error && (
          <div className='absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/60'>
            <Camera size={48} className='text-white/40' />
            <p className='text-white/50 text-sm'>Camera is off</p>
          </div>
        )}

        {/* Scan overlay — corner brackets */}
        {isScanning && (
          <div className='absolute inset-0 pointer-events-none'>
            <div className='absolute inset-8 border-2 border-stride-yellow-accent/50 rounded-lg' />
            <div className='absolute top-8 left-8 w-6 h-6 border-t-4 border-l-4 border-stride-yellow-accent rounded-tl-md' />
            <div className='absolute top-8 right-8 w-6 h-6 border-t-4 border-r-4 border-stride-yellow-accent rounded-tr-md' />
            <div className='absolute bottom-8 left-8 w-6 h-6 border-b-4 border-l-4 border-stride-yellow-accent rounded-bl-md' />
            <div className='absolute bottom-8 right-8 w-6 h-6 border-b-4 border-r-4 border-stride-yellow-accent rounded-br-md' />
            {processing && (
              <div className='absolute inset-0 flex items-center justify-center bg-black/50'>
                <Loader2 size={40} className='text-stride-yellow-accent animate-spin' />
              </div>
            )}
          </div>
        )}

        {/* Result overlay */}
        {result && (
          <div className='absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 p-6'>
            {result.success ? (
              <CheckCircle2 size={56} className='text-green-400' />
            ) : (
              <XCircle size={56} className='text-red-400' />
            )}
            <p className={`text-lg font-bold text-center ${result.success ? 'text-green-300' : 'text-red-300'}`}>
              {result.message}
            </p>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className='flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4'>
          <AlertCircle size={18} className='text-red-400 shrink-0 mt-0.5' />
          <p className='text-red-300 text-sm'>{error}</p>
        </div>
      )}

      {/* Action buttons */}
      {!isScanning && !result && (
        <button
          onClick={startCamera}
          className='w-full flex items-center justify-center gap-2 py-3 rounded-md bg-stride-yellow-accent text-stride-dark font-bold text-sm hover:bg-stride-yellow-accent/90 transition-colors min-h-11'
        >
          <Camera size={16} />
          Start Scanning
        </button>
      )}

      {isScanning && (
        <button
          onClick={stopCamera}
          className='w-full flex items-center justify-center gap-2 py-3 rounded-md bg-white/10 border border-white/15 hover:bg-white/15 text-white text-sm font-medium transition-colors min-h-11'
        >
          <CameraOff size={16} />
          Stop Camera
        </button>
      )}

      {result && (
        <button
          onClick={reset}
          className='w-full flex items-center justify-center gap-2 py-3 rounded-md bg-stride-yellow-accent text-stride-dark font-bold text-sm hover:bg-stride-yellow-accent/90 transition-colors min-h-11'
        >
          <Camera size={16} />
          Scan Another
        </button>
      )}

      {isScanning && (
        <p className='text-white/30 text-xs text-center'>Point the camera at a Stride QR ticket</p>
      )}
    </div>
  )
}
