'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import ReactCrop, { centerCrop, makeAspectCrop, type Crop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { X, Trash2, Pencil, Eye, ImageUp } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import { UploadProgress } from '@/components/ui/upload-progress'
import { uploadWithProgress } from '@/lib/utils/upload'

type Props = {
  currentUrl: string | null
  displayName: string
  /** Tier frame colour applied to the avatar border. */
  frameColor?: string
}

type Status = 'idle' | 'uploading' | 'error'

export function AvatarUpload({ currentUrl, displayName, frameColor }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const [src, setSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState<Crop>()
  const [status, setStatus] = useState<Status>('idle')
  const [progress, setProgress] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')
  const [imgFailed, setImgFailed] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [removeState, setRemoveState] = useState<'idle' | 'confirm' | 'removing'>('idle')
  const [removeError, setRemoveError] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [viewing, setViewing] = useState(false)
  // Local override so a change/removal shows instantly — router.refresh() still
  // runs to sync the rest of the page (navbar avatar etc.), but the profile
  // photo itself must not wait on that server round-trip.
  const [localUrl, setLocalUrl] = useState<string | null | undefined>(undefined)
  const menuAreaRef = useRef<HTMLDivElement>(null)

  const displayUrl = localUrl === undefined ? currentUrl : localUrl

  // Close the edit menu on any press outside the avatar area. A fixed-overlay
  // click-catcher can't work here: the profile card retains a transform from
  // its entrance animation, which turns it into the containing block for
  // position:fixed descendants.
  useEffect(() => {
    if (!menuOpen) return
    function onPointerDown(e: PointerEvent) {
      if (menuAreaRef.current && !menuAreaRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
        setRemoveState('idle')
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [menuOpen])
  const lastBlobRef = useRef<Blob | null>(null)
  useEffect(() => { setMounted(true) }, [])
  const router = useRouter()

  const uploading = status === 'uploading'

  async function handleRemovePhoto() {
    setRemoveState('removing')
    setRemoveError('')
    try {
      const res = await fetch('/api/profile/avatar', { method: 'DELETE' })
      if (!res.ok) throw new Error('Could not remove photo. Please try again.')
      setRemoveState('idle')
      setMenuOpen(false)
      setImgFailed(false)
      setLocalUrl(null)
      router.refresh()
    } catch (err) {
      setRemoveError(err instanceof Error ? err.message : 'Could not remove photo. Please try again.')
      setRemoveState('idle')
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setStatus('idle')
    setErrorMsg('')
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
    // Bail if the image hasn't decoded yet — drawing a 0×0 source produces a
    // blank canvas which, encoded as JPEG (no alpha), becomes a black image.
    if (!img || !img.naturalWidth || !img.naturalHeight) return Promise.resolve(null)

    const canvas = document.createElement('canvas')
    const size = 400
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) return Promise.resolve(null)

    const scaleX = img.naturalWidth / img.width
    const scaleY = img.naturalHeight / img.height

    // Compute the source rect in natural pixels. ReactCrop's onChange yields a
    // PIXEL crop after any drag but a '%' crop initially, so branch on the unit
    // (dividing by 100 unconditionally was the old bug). Fall back to a centred
    // square if the crop is missing or zero-sized.
    let sx: number, sy: number, sw: number, sh: number
    if (crop && crop.width > 0 && crop.height > 0) {
      const unit = crop.unit ?? 'px'
      const cropX = unit === '%' ? (crop.x / 100) * img.width : crop.x
      const cropY = unit === '%' ? (crop.y / 100) * img.height : crop.y
      const cropW = unit === '%' ? (crop.width / 100) * img.width : crop.width
      const cropH = unit === '%' ? (crop.height / 100) * img.height : crop.height
      sx = cropX * scaleX; sy = cropY * scaleY; sw = cropW * scaleX; sh = cropH * scaleY
    } else {
      const side = Math.min(img.naturalWidth, img.naturalHeight)
      sx = (img.naturalWidth - side) / 2
      sy = (img.naturalHeight - side) / 2
      sw = side; sh = side
    }

    // Clamp the source rect into the image's natural bounds so we never sample
    // off-image area (which renders transparent → black in a JPEG).
    sx = Math.max(0, Math.min(sx, img.naturalWidth - 1))
    sy = Math.max(0, Math.min(sy, img.naturalHeight - 1))
    sw = Math.max(1, Math.min(sw, img.naturalWidth - sx))
    sh = Math.max(1, Math.min(sh, img.naturalHeight - sy))

    // White backstop: guarantees a sane background even if drawing fails.
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, size, size)
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, size, size)

    return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9))
  }, [crop])

  const doUpload = useCallback(async (blob: Blob) => {
    lastBlobRef.current = blob
    setStatus('uploading')
    setProgress(0)
    setErrorMsg('')
    try {
      const res = await uploadWithProgress<{ url: string }>({
        url: '/api/profile/avatar',
        file: blob,
        fileName: 'avatar.jpg',
        onProgress: setProgress,
      })
      setStatus('idle')
      setSrc(null)
      if (res?.url) {
        setLocalUrl(res.url)
        setImgFailed(false)
      }
      router.refresh()
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Upload failed. Please try again.')
      setStatus('error')
    }
  }, [router])

  async function handleUpload() {
    const blob = await getCroppedBlob()
    if (!blob) return
    await doUpload(blob)
  }

  function handleRetry() {
    if (lastBlobRef.current) void doUpload(lastBlobRef.current)
  }

  return (
    <>
      {/* Avatar — w-fit + mx-auto so the box hugs the image and stays centered
          regardless of how wide sibling rows (e.g. the visibility toggle) are */}
      <div ref={menuAreaRef} className='relative w-fit mx-auto'>
        {displayUrl && !imgFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={displayUrl}
            alt={displayName}
            className='w-36 h-36 sm:w-44 sm:h-44 rounded-lg object-cover border-4 border-stride-purple-primary'
            style={frameColor ? { borderColor: frameColor } : undefined}
            loading='lazy'
            fetchPriority='low'
            referrerPolicy='no-referrer'
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div
            className='w-36 h-36 sm:w-44 sm:h-44 rounded-lg bg-stride-yellow-accent/20 border-4 border-stride-purple-primary flex items-center justify-center'
            style={frameColor ? { borderColor: frameColor } : undefined}
          >
            <span className='text-stride-yellow-accent text-5xl font-bold'>
              {displayName.charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        {/* Pencil — the single edit entry point on every screen size. With a
            photo it opens the View/Change/Remove menu; without one it goes
            straight to the file picker. */}
        <button
          type='button'
          onClick={() => (displayUrl ? setMenuOpen(o => !o) : inputRef.current?.click())}
          aria-label='Edit profile photo'
          aria-expanded={displayUrl ? menuOpen : undefined}
          className='absolute -bottom-2 -right-2 p-1 group'
        >
          <span className='flex items-center justify-center w-9 h-9 rounded-full bg-stride-yellow-accent text-copy-black border-[3px] border-stride-purple-primary shadow-lg group-hover:scale-105 group-active:scale-95 transition-transform'>
            <Pencil size={15} strokeWidth={2.25} />
          </span>
        </button>

        {/* Edit menu */}
        {menuOpen && displayUrl && (
          <div className='absolute left-1/2 -translate-x-1/2 top-full mt-3 z-20 w-48 rounded-xl bg-stride-purple-primary/95 backdrop-blur-xl border border-white/15 shadow-2xl py-1.5 text-left'>
              {removeState === 'confirm' || removeState === 'removing' ? (
                <div className='px-4 py-2.5'>
                  <p className='text-white/70 text-xs mb-2'>Remove this photo?</p>
                  <div className='flex items-center gap-3'>
                    <button
                      type='button'
                      onClick={handleRemovePhoto}
                      disabled={removeState === 'removing'}
                      className='inline-flex items-center gap-1.5 text-red-400 hover:text-red-300 text-xs font-semibold transition-colors min-h-11 disabled:opacity-50'
                    >
                      {removeState === 'removing' ? <><Spinner /> Removing…</> : 'Yes, remove'}
                    </button>
                    <button
                      type='button'
                      onClick={() => setRemoveState('idle')}
                      disabled={removeState === 'removing'}
                      className='text-white/50 hover:text-white text-xs transition-colors min-h-11 disabled:opacity-50'
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {!imgFailed && (
                    <button
                      type='button'
                      onClick={() => { setViewing(true); setMenuOpen(false) }}
                      className='w-full flex items-center gap-2.5 px-4 min-h-11 text-white/80 hover:text-white hover:bg-white/8 text-sm transition-colors'
                    >
                      <Eye size={15} /> View photo
                    </button>
                  )}
                  <button
                    type='button'
                    onClick={() => { setMenuOpen(false); inputRef.current?.click() }}
                    className='w-full flex items-center gap-2.5 px-4 min-h-11 text-white/80 hover:text-white hover:bg-white/8 text-sm transition-colors'
                  >
                    <ImageUp size={15} /> Change photo
                  </button>
                  <button
                    type='button'
                    onClick={() => setRemoveState('confirm')}
                    className='w-full flex items-center gap-2.5 px-4 min-h-11 text-red-400 hover:text-red-300 hover:bg-white/8 text-sm transition-colors'
                  >
                    <Trash2 size={15} /> Remove photo
                  </button>
                </>
              )}
            {removeError && (
              <p className='text-red-400 text-xs px-4 pb-2' role='alert'>{removeError}</p>
            )}
          </div>
        )}

        <input
          ref={inputRef}
          type='file'
          accept='image/*'
          className='sr-only'
          onChange={handleFileSelect}
        />
      </div>

      {/* View photo lightbox */}
      {viewing && displayUrl && mounted && createPortal(
        <div
          className='fixed inset-0 z-100 flex items-center justify-center bg-black/90 backdrop-blur-sm px-4 py-10'
          onClick={() => setViewing(false)}
          role='dialog'
          aria-label={`${displayName}'s profile photo`}
        >
          <button
            type='button'
            onClick={() => setViewing(false)}
            className='absolute top-4 right-4 w-11 h-11 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center'
            aria-label='Close'
          >
            <X size={20} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={displayUrl}
            alt={displayName}
            className='max-h-[80vh] max-w-[92vw] rounded-xl object-contain shadow-2xl'
            referrerPolicy='no-referrer'
            onClick={e => e.stopPropagation()}
          />
        </div>,
        document.body
      )}

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
            <div className='shrink-0 px-5 py-4 border-t border-white/10 space-y-3'>
              {(status === 'uploading' || status === 'error') && (
                <UploadProgress
                  status={status === 'error' ? 'error' : 'uploading'}
                  progress={progress}
                  message={errorMsg}
                  onRetry={handleRetry}
                />
              )}
              <div className='flex gap-3'>
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
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
