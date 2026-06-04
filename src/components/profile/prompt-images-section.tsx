'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Plus, X, ImagePlus, ChevronLeft, ChevronRight } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import { UploadProgress } from '@/components/ui/upload-progress'
import { uploadWithProgress } from '@/lib/utils/upload'
import type { PromptImage } from '@/types/user'

const MAX_IMAGES = 3
const MAX_FILE_BYTES = 10 * 1024 * 1024 // 10 MB — keep in sync with the API route

const PRESET_PROMPTS = [
  'On the start line',
  'Post-run glow',
  'My happy place to run',
  'Race-day fit',
  'Where I train',
  'Proudest finish',
  'My running crew',
  'Sunrise miles',
]

type Status = 'idle' | 'uploading' | 'error'

type Props = {
  promptImages: PromptImage[]
  isOwnProfile: boolean
}

export function PromptImagesSection({ promptImages: initial, isOwnProfile }: Props) {
  const [images, setImages] = useState<PromptImage[]>(initial)
  const [adding, setAdding] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [pending, setPending] = useState<{ src: string; file: File } | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [progress, setProgress] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')
  const [deletingUrl, setDeletingUrl] = useState<string | null>(null)
  const [viewer, setViewer] = useState<PromptImage | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const carouselRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Esc closes the full-view modal.
  useEffect(() => {
    if (!viewer) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setViewer(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [viewer])

  function scrollByCard(dir: 1 | -1) {
    const el = carouselRef.current
    if (!el) return
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: 'smooth' })
  }

  const uploading = status === 'uploading'
  const canAdd = images.length < MAX_IMAGES
  const usedPrompts = images.map(i => i.prompt)
  const availablePrompts = PRESET_PROMPTS.filter(p => !usedPrompts.includes(p))

  function startAdd() {
    setAdding(true)
    setPrompt(availablePrompts[0] ?? PRESET_PROMPTS[0]!)
    setPending(null)
    setStatus('idle')
    setErrorMsg('')
  }

  function cancelAdd() {
    if (pending) URL.revokeObjectURL(pending.src)
    setAdding(false)
    setPending(null)
    setPrompt('')
    setStatus('idle')
    setErrorMsg('')
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    // Catch oversized files before uploading — avoids a confusing platform-level
    // "payload too large" error and gives the user an actionable message.
    if (file.size > MAX_FILE_BYTES) {
      const mb = (file.size / (1024 * 1024)).toFixed(1)
      setStatus('error')
      setErrorMsg(`That image is ${mb} MB — too big. Please choose a smaller file (under 10 MB).`)
      return
    }
    if (pending) URL.revokeObjectURL(pending.src)
    setPending({ src: URL.createObjectURL(file), file })
    setStatus('idle')
    setErrorMsg('')
  }

  async function handleUpload() {
    if (!pending || !prompt.trim()) return
    setStatus('uploading')
    setProgress(0)
    setErrorMsg('')
    try {
      const { image } = await uploadWithProgress<{ image: PromptImage }>({
        url: '/api/profile/prompt-images',
        file: pending.file,
        fileName: pending.file.name,
        fields: { prompt: prompt.trim() },
        onProgress: setProgress,
      })
      setImages(prev => [...prev, image])
      URL.revokeObjectURL(pending.src)
      setPending(null)
      setAdding(false)
      setPrompt('')
      setStatus('idle')
      router.refresh()
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Upload failed. Please try again.')
      setStatus('error')
    }
  }

  async function handleDelete(url: string) {
    setDeletingUrl(url)
    await fetch(`/api/profile/prompt-images?url=${encodeURIComponent(url)}`, { method: 'DELETE' })
    setImages(prev => prev.filter(img => img.url !== url))
    setDeletingUrl(null)
    router.refresh()
  }

  return (
    <div className='bg-white/8 border border-white/10 rounded-2xl p-5 hover:border-white/15 transition-colors'>
      <div className='flex items-center justify-between mb-4'>
        <div className='flex items-center gap-2'>
          <div className='h-4 w-1 bg-stride-yellow-accent rounded-full' aria-hidden='true' />
          <h2 className='text-white font-semibold text-sm tracking-wide'>Prompt photos</h2>
          <span className='text-white/30 text-xs'>{images.length}/{MAX_IMAGES}</span>
        </div>
        {isOwnProfile && canAdd && !adding && (
          <button
            onClick={startAdd}
            className='flex items-center gap-1 text-white/30 hover:text-white text-xs transition-colors'
          >
            <Plus size={13} /> Add photo
          </button>
        )}
      </div>

      {/* Add panel */}
      {adding && (
        <div className='mb-4 bg-white/5 border border-white/12 rounded-xl p-4 space-y-3'>
          {/* Prompt picker */}
          <div className='flex flex-wrap gap-2'>
            {[...availablePrompts, ...(prompt && !availablePrompts.includes(prompt) ? [prompt] : [])].map(p => (
              <button
                key={p}
                onClick={() => setPrompt(p)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  prompt === p
                    ? 'bg-stride-yellow-accent/15 border-stride-yellow-accent text-stride-yellow-accent'
                    : 'border-white/15 text-white/50 hover:border-white/30'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <div className='flex gap-3'>
            {/* Image preview / picker */}
            <button
              onClick={() => inputRef.current?.click()}
              className='w-24 h-24 rounded-lg overflow-hidden shrink-0 bg-white/8 border border-white/15 flex flex-col items-center justify-center gap-1 text-white/35 hover:border-stride-yellow-accent/40 transition-colors'
            >
              {pending ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={pending.src} alt='Preview' className='w-full h-full object-cover' />
              ) : (
                <>
                  <ImagePlus size={20} />
                  <span className='text-[10px]'>Choose image</span>
                </>
              )}
            </button>

            <div className='flex-1 flex flex-col justify-between min-w-0'>
              <p className='text-white/40 text-xs leading-snug'>
                Pick a prompt, choose a photo, and it&apos;ll show with the prompt on your profile.
              </p>
              <div className='flex gap-2'>
                <button
                  onClick={handleUpload}
                  disabled={uploading || !pending || !prompt.trim()}
                  className='flex items-center gap-1.5 bg-stride-yellow-accent text-copy-black text-xs font-semibold px-3 py-2 rounded-lg hover:bg-stride-yellow-accent/90 disabled:opacity-50 disabled:cursor-not-allowed min-h-9'
                >
                  {uploading ? <Spinner className='w-3 h-3' /> : <Plus size={13} />}
                  {uploading ? 'Uploading…' : 'Add'}
                </button>
                <button
                  onClick={cancelAdd}
                  disabled={uploading}
                  className='flex items-center gap-1.5 text-white/40 hover:text-white text-xs px-3 py-2 rounded-lg border border-white/15 transition-colors min-h-9 disabled:opacity-40'
                >
                  <X size={12} /> Cancel
                </button>
              </div>
            </div>
          </div>

          {(status === 'uploading' || status === 'error') && (
            <UploadProgress
              status={status === 'error' ? 'error' : 'uploading'}
              progress={progress}
              message={errorMsg}
              onRetry={handleUpload}
            />
          )}
        </div>
      )}

      {/* Photos — carousel on mobile (swipe + buttons), grid on desktop */}
      {images.length > 0 ? (
        <div className='relative'>
          <div
            ref={carouselRef}
            className='flex sm:grid sm:grid-cols-3 gap-3 overflow-x-auto sm:overflow-visible snap-x snap-mandatory sm:snap-none scrollbar-hide -mx-1 px-1'
          >
            {images.map(img => (
              <button
                key={img.url}
                type='button'
                onClick={() => setViewer(img)}
                className='group relative rounded-xl overflow-hidden aspect-4/5 bg-white/5 shrink-0 w-[82%] sm:w-auto snap-center text-left'
              >
                <Image
                  src={img.url}
                  alt={img.prompt}
                  fill
                  className='object-cover transition-transform duration-500 group-hover:scale-105'
                  sizes='(max-width: 640px) 82vw, 33vw'
                />
                {/* Prompt caption — Libre serif, no label */}
                <div className='absolute inset-x-0 bottom-0 bg-linear-to-t from-black/85 via-black/40 to-transparent px-3.5 py-3'>
                  <p className='font-libre text-white text-base leading-snug line-clamp-2'>{img.prompt}</p>
                </div>
                {isOwnProfile && (
                  <span
                    role='button'
                    tabIndex={0}
                    onClick={(e) => { e.stopPropagation(); handleDelete(img.url) }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); handleDelete(img.url) } }}
                    className='absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80 text-white'
                    aria-label='Remove photo'
                  >
                    {deletingUrl === img.url ? <Spinner className='w-3 h-3' /> : <X size={13} />}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Carousel buttons — mobile only, shown when more than one photo */}
          {images.length > 1 && (
            <div className='sm:hidden'>
              <button
                type='button'
                onClick={() => scrollByCard(-1)}
                className='absolute left-1 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 backdrop-blur-sm border border-white/15 flex items-center justify-center text-white hover:bg-black/80 transition-colors'
                aria-label='Previous photo'
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type='button'
                onClick={() => scrollByCard(1)}
                className='absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 backdrop-blur-sm border border-white/15 flex items-center justify-center text-white hover:bg-black/80 transition-colors'
                aria-label='Next photo'
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>
      ) : isOwnProfile && !adding ? (
        <button
          onClick={startAdd}
          className='w-full py-10 rounded-xl border-2 border-dashed border-white/10 hover:border-stride-yellow-accent/30 transition-colors flex flex-col items-center gap-3 text-white/20 hover:text-white/40'
        >
          <ImagePlus size={22} />
          <span className='text-xs'>Add up to {MAX_IMAGES} prompt photos</span>
        </button>
      ) : !isOwnProfile && !adding ? (
        <div className='border border-dashed border-white/12 rounded-xl py-10 flex flex-col items-center gap-2 text-white/20'>
          <ImagePlus size={22} />
          <span className='text-xs'>No prompt photos yet.</span>
        </div>
      ) : null}

      <input ref={inputRef} type='file' accept='image/*' className='sr-only' onChange={handleFileSelect} />

      {/* Full-view modal */}
      {viewer && createPortal(
        <div
          className='fixed inset-0 z-100 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4'
          onClick={() => setViewer(null)}
        >
          <button
            type='button'
            onClick={() => setViewer(null)}
            className='absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors'
            aria-label='Close'
          >
            <X size={18} />
          </button>
          <div className='relative max-w-2xl w-full max-h-[85dvh] flex flex-col items-center gap-4' onClick={e => e.stopPropagation()}>
            <div className='relative w-full flex-1 min-h-0'>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={viewer.url}
                alt={viewer.prompt}
                className='mx-auto max-h-[72dvh] max-w-full w-auto object-contain rounded-xl'
              />
            </div>
            <p className='font-libre text-white text-lg sm:text-xl text-center leading-snug px-4'>{viewer.prompt}</p>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
