'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Plus, X, Upload } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import type { GalleryImage } from '@/types/user'

const MAX_IMAGES = 6

type Props = {
  images: GalleryImage[]
  isOwnProfile: boolean
}

export function GallerySection({ images: initialImages, isOwnProfile }: Props) {
  const [images, setImages] = useState<GalleryImage[]>(initialImages)
  const [pending, setPending] = useState<{ src: string; file: File } | null>(null)
  const [caption, setCaption] = useState('')
  const [uploading, setUploading] = useState(false)
  const [deletingUrl, setDeletingUrl] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPending({ src: URL.createObjectURL(file), file })
    setCaption('')
    e.target.value = ''
  }

  async function handleUpload() {
    if (!pending) return
    setUploading(true)
    const form = new FormData()
    form.append('file', pending.file)
    if (caption.trim()) form.append('caption', caption.trim())

    const res = await fetch('/api/profile/gallery', { method: 'POST', body: form })
    setUploading(false)

    if (res.ok) {
      const { image } = await res.json() as { image: GalleryImage }
      setImages(prev => [...prev, image])
      URL.revokeObjectURL(pending.src)
      setPending(null)
      router.refresh()
    }
  }

  function cancelPending() {
    if (pending) URL.revokeObjectURL(pending.src)
    setPending(null)
    setCaption('')
  }

  async function handleDelete(url: string) {
    setDeletingUrl(url)
    await fetch(`/api/profile/gallery?url=${encodeURIComponent(url)}`, { method: 'DELETE' })
    setImages(prev => prev.filter(img => img.url !== url))
    setDeletingUrl(null)
    router.refresh()
  }

  const canAdd = images.length < MAX_IMAGES

  if (images.length === 0 && !isOwnProfile) return null

  return (
    <div className='bg-white/8 border border-white/10 rounded-2xl p-5 hover:border-white/15 transition-colors'>
      <div className='flex items-center justify-between mb-4'>
        <p className='text-white/40 text-[10px] uppercase tracking-widest font-medium'>
          Photos
          <span className='ml-1.5 text-white/20 normal-case tracking-normal'>({images.length}/{MAX_IMAGES})</span>
        </p>
        {isOwnProfile && canAdd && !pending && (
          <button
            onClick={() => inputRef.current?.click()}
            className='flex items-center gap-1 text-white/30 hover:text-white text-xs transition-colors'
          >
            <Plus size={13} /> Add photo
          </button>
        )}
      </div>

      {/* Upload preview panel */}
      {pending && (
        <div className='mb-4 bg-white/5 border border-white/12 rounded-xl p-4'>
          <div className='flex gap-3'>
            <div className='w-20 h-20 rounded-lg overflow-hidden shrink-0 bg-white/10'>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={pending.src} alt='Preview' className='w-full h-full object-cover' />
            </div>
            <div className='flex-1 space-y-2.5'>
              <input
                className='w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-stride-yellow-accent/50 transition-colors'
                placeholder='Add a caption (optional)…'
                value={caption}
                onChange={e => setCaption(e.target.value)}
                maxLength={100}
                autoFocus
                onKeyDown={e => e.key === 'Enter' && !uploading && handleUpload()}
              />
              <div className='flex gap-2'>
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className='flex items-center gap-1.5 bg-stride-yellow-accent text-copy-black text-xs font-semibold px-3 py-2 rounded-lg hover:bg-stride-yellow-accent/90 disabled:opacity-50 min-h-9'
                >
                  {uploading ? <Spinner className='w-3 h-3' /> : <Upload size={12} />}
                  {uploading ? 'Uploading…' : 'Upload'}
                </button>
                <button
                  onClick={cancelPending}
                  disabled={uploading}
                  className='flex items-center gap-1.5 text-white/40 hover:text-white text-xs px-3 py-2 rounded-lg border border-white/15 transition-colors min-h-9 disabled:opacity-40'
                >
                  <X size={12} /> Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Photo grid */}
      {images.length > 0 ? (
        <div className='grid grid-cols-2 sm:grid-cols-3 gap-2'>
          {images.map(img => (
            <div
              key={img.url}
              className='relative group rounded-xl overflow-hidden aspect-square bg-white/5'
            >
              <Image
                src={img.url}
                alt={img.caption ?? 'Profile photo'}
                fill
                className='object-cover transition-transform duration-300 group-hover:scale-105'
                sizes='(max-width: 640px) 50vw, 33vw'
              />

              {/* Caption slide-up overlay */}
              {img.caption && (
                <div className='absolute inset-x-0 bottom-0 bg-linear-to-t from-black/80 to-transparent px-2.5 py-2 translate-y-full group-hover:translate-y-0 transition-transform duration-200'>
                  <p className='text-white text-xs leading-snug line-clamp-2'>{img.caption}</p>
                </div>
              )}

              {/* Delete button */}
              {isOwnProfile && (
                <button
                  onClick={() => handleDelete(img.url)}
                  disabled={deletingUrl === img.url}
                  className='absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80 text-white disabled:opacity-50'
                  aria-label='Remove photo'
                >
                  {deletingUrl === img.url ? <Spinner className='w-3 h-3' /> : <X size={11} />}
                </button>
              )}
            </div>
          ))}

          {/* Empty add slot shown while grid has items */}
          {isOwnProfile && canAdd && !pending && (
            <button
              onClick={() => inputRef.current?.click()}
              className='aspect-square rounded-xl border-2 border-dashed border-white/12 hover:border-stride-yellow-accent/40 transition-colors flex flex-col items-center justify-center gap-2 text-white/20 hover:text-white/50'
            >
              <Plus size={20} />
              <span className='text-[9px] tracking-wide uppercase'>Add</span>
            </button>
          )}
        </div>
      ) : isOwnProfile ? (
        /* Empty state — full-width dashed button */
        <button
          onClick={() => inputRef.current?.click()}
          className='w-full py-10 rounded-xl border-2 border-dashed border-white/10 hover:border-stride-yellow-accent/30 transition-colors flex flex-col items-center gap-3 text-white/20 hover:text-white/40'
        >
          <Plus size={22} />
          <span className='text-xs'>Add up to {MAX_IMAGES} photos</span>
        </button>
      ) : null}

      <input
        ref={inputRef}
        type='file'
        accept='image/*'
        className='sr-only'
        onChange={handleFileSelect}
      />
    </div>
  )
}
