'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  currentUrl: string | null
}

export function CoverImageUpload({ currentUrl }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const router = useRouter()

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const form = new FormData()
    form.append('file', file)

    const res = await fetch('/api/profile/cover', { method: 'POST', body: form })
    setUploading(false)

    if (res.ok) {
      router.refresh()
    }
  }

  return (
    <div
      className='absolute inset-0 group cursor-pointer'
      onClick={() => inputRef.current?.click()}
      role='button'
      aria-label='Change cover image'
    >
      {/* Overlay on hover */}
      <div className='absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center'>
        <span className='opacity-0 group-hover:opacity-100 transition-opacity text-white text-sm font-medium bg-black/60 px-4 py-2 rounded-md'>
          {uploading ? 'Uploading…' : currentUrl ? 'Change cover' : 'Add cover image'}
        </span>
      </div>
      <input
        ref={inputRef}
        type='file'
        accept='image/*'
        className='sr-only'
        onChange={handleChange}
        disabled={uploading}
      />
    </div>
  )
}
