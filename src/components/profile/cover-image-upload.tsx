'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { UploadProgress } from '@/components/ui/upload-progress'
import { uploadWithProgress } from '@/lib/utils/upload'

type Props = {
  currentUrl: string | null
}

type Status = 'idle' | 'uploading' | 'error'

export function CoverImageUpload({ currentUrl }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [progress, setProgress] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')
  const lastFileRef = useRef<File | null>(null)
  const router = useRouter()

  const uploading = status === 'uploading'

  async function doUpload(file: File) {
    lastFileRef.current = file
    setStatus('uploading')
    setProgress(0)
    setErrorMsg('')
    try {
      await uploadWithProgress({
        url: '/api/profile/cover',
        file,
        fileName: file.name,
        onProgress: setProgress,
      })
      setStatus('idle')
      router.refresh()
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Upload failed. Please try again.')
      setStatus('error')
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    void doUpload(file)
  }

  function handleRetry() {
    if (lastFileRef.current) void doUpload(lastFileRef.current)
  }

  return (
    <div
      className='absolute inset-0 group cursor-pointer'
      onClick={() => !uploading && inputRef.current?.click()}
      role='button'
      aria-label='Change cover image'
    >
      {/* Hover overlay (idle) */}
      {status === 'idle' && (
        <div className='absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center'>
          <span className='opacity-0 group-hover:opacity-100 transition-opacity text-white text-sm font-medium bg-black/60 px-4 py-2 rounded-md'>
            {currentUrl ? 'Change cover' : 'Add cover image'}
          </span>
        </div>
      )}

      {/* Progress / error overlay */}
      {(status === 'uploading' || status === 'error') && (
        <div
          className='absolute inset-0 bg-black/55 flex items-center justify-center px-4'
          onClick={e => e.stopPropagation()}
        >
          <div className='w-full max-w-xs'>
            <UploadProgress
              status={status === 'error' ? 'error' : 'uploading'}
              progress={progress}
              message={errorMsg}
              onRetry={handleRetry}
            />
          </div>
        </div>
      )}

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
