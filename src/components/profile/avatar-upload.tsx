'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import ReactCrop, { centerCrop, makeAspectCrop, type Crop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { X } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'

type Props = {
  currentUrl: string | null
  displayName: string
}

export function AvatarUpload({ currentUrl, displayName }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const [src, setSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState<Crop>()
  const [uploading, setUploading] = useState(false)
  const [imgFailed, setImgFailed] = useState(false)
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  const router = useRouter()

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setSrc(reader.result as string)
    reader.readAsDataURL(file)
  }

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget
    const centeredCrop = centerCrop(makeAspectCrop({ unit: '%', width: 80 }, 1, width, height), width, height)
    setCrop(centeredCrop)
  }

  const getCroppedBlob = useCallback((): Promise<Blob | null> => {
    const img = imgRef.current
    if (!img || !crop) return Promise.resolve(null)

    const canvas = document.createElement('canvas')
    const size = 400
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) return Promise.resolve(null)

    const scaleX = img.naturalWidth / img.width
    const scaleY = img.naturalHeight / img.height
    const pixelCrop = {
      x: (crop.x / 100) * img.width * scaleX,
      y: (crop.y / 100) * img.height * scaleY,
      width: (crop.width / 100) * img.width * scaleX,
      height: (crop.height / 100) * img.height * scaleY,
    }

    ctx.drawImage(img, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, size, size)

    return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9))
  }, [crop])

  async function handleUpload() {
    const blob = await getCroppedBlob()
    if (!blob) return

    setUploading(true)
    const form = new FormData()
    form.append('file', blob, 'avatar.jpg')

    const res = await fetch('/api/profile/avatar', { method: 'POST', body: form })
    setUploading(false)

    if (res.ok) {
      setSrc(null)
      router.refresh()
    }
  }

  return (
    <>
      {/* Avatar with click-to-edit */}
      <div
        className='relative group cursor-pointer'
        onClick={() => inputRef.current?.click()}
        role='button'
        aria-label='Change profile photo'
      >
        {currentUrl && !imgFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentUrl}
            alt={displayName}
            className='w-28 h-28 sm:w-32 sm:h-32 rounded-xl object-cover border-4 border-stride-purple-primary'
            loading='lazy'
            fetchPriority='low'
            referrerPolicy='no-referrer'
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className='w-28 h-28 sm:w-32 sm:h-32 rounded-xl bg-stride-yellow-accent/20 border-4 border-stride-purple-primary flex items-center justify-center'>
            <span className='text-stride-yellow-accent text-4xl font-bold'>
              {displayName.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <div className='absolute inset-0 rounded-xl bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center'>
          <span className='opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs text-center leading-tight'>
            Change
          </span>
        </div>
        <input
          ref={inputRef}
          type='file'
          accept='image/*'
          className='sr-only'
          onChange={handleFileSelect}
        />
      </div>

      {/* Crop modal — portaled to body so it escapes any stacking context */}
      {src && mounted && createPortal(
        <div
          className='fixed inset-0 z-100 flex items-start sm:items-center justify-center bg-black/80 backdrop-blur-sm px-4 pt-24 sm:pt-6 pb-6'
          onClick={() => !uploading && setSrc(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className='bg-stride-purple-primary border border-white/15 rounded-2xl w-full max-w-md max-h-[calc(100dvh-7rem)] sm:max-h-[calc(100dvh-3rem)] overflow-hidden flex flex-col shadow-2xl'
          >
            {/* Header */}
            <div className='shrink-0 flex items-center justify-between gap-4 px-5 py-4 border-b border-white/10'>
              <div>
                <h2 className='text-white font-bold text-base leading-tight'>Crop your photo</h2>
                <p className='text-white/40 text-xs mt-0.5'>Drag to position · Square crop</p>
              </div>
              <button
                type='button'
                onClick={() => setSrc(null)}
                disabled={uploading}
                className='shrink-0 w-8 h-8 rounded-lg text-white/40 hover:text-white hover:bg-white/8 transition-colors flex items-center justify-center disabled:opacity-40'
                aria-label='Close'
              >
                <X size={16} />
              </button>
            </div>

            {/* Scrollable crop area */}
            <div className='overflow-y-auto px-5 py-4 flex-1 flex items-center justify-center'>
              <ReactCrop crop={crop} onChange={setCrop} aspect={1} keepSelection>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={imgRef}
                  src={src}
                  alt='Crop preview'
                  onLoad={onImageLoad}
                  className='max-h-[50vh] sm:max-h-[55vh] max-w-full object-contain block mx-auto'
                />
              </ReactCrop>
            </div>

            {/* Footer */}
            <div className='shrink-0 flex gap-3 px-5 py-4 border-t border-white/10'>
              <button
                onClick={() => setSrc(null)}
                disabled={uploading}
                className='px-4 py-2.5 rounded-md border border-white/15 text-white/70 text-sm hover:border-white/30 disabled:opacity-50 min-h-11'
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading}
                className='flex-1 bg-stride-yellow-accent text-copy-black font-semibold py-2.5 rounded-md text-sm disabled:opacity-50 min-h-11 flex items-center justify-center gap-2'
              >
                {uploading
                  ? <><Spinner /> Uploading…</>
                  : 'Save photo'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
