'use client'

import { useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import ReactCrop, { centerCrop, makeAspectCrop, type Crop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'

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
            className='w-32 h-32 rounded-full object-cover border-4 border-stride-purple-primary'
            loading='lazy'
            fetchPriority='low'
            referrerPolicy='no-referrer'
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className='w-32 h-32 rounded-full bg-stride-yellow-accent/20 border-4 border-stride-purple-primary border-stride-yellow-accent/40 flex items-center justify-center'>
            <span className='text-stride-yellow-accent text-4xl font-bold'>
              {displayName.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <div className='absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center'>
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

      {/* Crop modal */}
      {src && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4'>
          <div className='bg-stride-purple-primary border border-white/15 rounded-xl p-6 max-w-sm w-full'>
            <h2 className='text-white font-semibold mb-4'>Crop your photo</h2>
            <ReactCrop crop={crop} onChange={setCrop} aspect={1} circularCrop>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img ref={imgRef} src={src} alt='Crop preview' onLoad={onImageLoad} className='max-h-64 w-full object-contain' />
            </ReactCrop>
            <div className='flex gap-3 mt-4'>
              <button
                onClick={handleUpload}
                disabled={uploading}
                className='flex-1 bg-stride-yellow-accent text-stride-dark font-semibold py-2.5 rounded-md text-sm disabled:opacity-50'
              >
                {uploading ? 'Uploading…' : 'Save photo'}
              </button>
              <button
                onClick={() => setSrc(null)}
                className='px-4 py-2.5 rounded-md border border-white/15 text-white/70 text-sm hover:border-white/30'
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
