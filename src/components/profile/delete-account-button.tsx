'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Trash2, AlertTriangle, X } from 'lucide-react'
import { deleteAccountAction } from '@/lib/actions/account'
import { Spinner } from '@/components/ui/spinner'

const CONFIRM_PHRASE = 'DELETE'

export function DeleteAccountButton() {
  const [open, setOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  // Reset state on close
  useEffect(() => {
    if (!open) {
      setConfirmText('')
      setError(null)
    }
  }, [open])

  // Esc to close
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !submitting) setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, submitting])

  const canDelete = confirmText.trim().toUpperCase() === CONFIRM_PHRASE

  async function handleDelete() {
    if (!canDelete || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const result = await deleteAccountAction()
      // Server action redirects on success — a return value means it refused.
      if (result?.error) {
        setError(result.error)
        setSubmitting(false)
      }
    } catch (err) {
      // Next's redirect() throws a NEXT_REDIRECT — that's expected, swallow it
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      if (msg.includes('NEXT_REDIRECT')) return
      setError(msg)
      setSubmitting(false)
    }
  }

  return (
    <>
      <button
        type='button'
        onClick={() => setOpen(true)}
        className='flex-1 flex items-center justify-center gap-2 text-red-400/80 hover:text-red-400 text-sm font-medium transition-colors min-h-11 px-4 rounded-lg border border-red-500/20 hover:border-red-500/45 hover:bg-red-500/5'
      >
        <Trash2 size={15} />
        Delete account
      </button>

      {open && mounted && createPortal(
        <div
          className='fixed inset-0 z-100 flex items-start sm:items-center justify-center bg-black/75 backdrop-blur-sm px-4 pt-24 sm:pt-6 pb-6'
          onClick={() => !submitting && setOpen(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className='bg-stride-purple-primary border border-white/15 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden'
          >
            {/* Header */}
            <div className='flex items-start justify-between gap-4 px-5 pt-5 pb-3'>
              <div className='flex items-center gap-3'>
                <div className='shrink-0 w-10 h-10 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center'>
                  <AlertTriangle size={18} className='text-red-400' />
                </div>
                <div>
                  <h2 className='text-white font-bold text-lg leading-tight'>Delete your account?</h2>
                  <p className='text-red-400/80 text-xs font-semibold font-mono uppercase tracking-widest mt-0.5'>This is irreversible</p>
                </div>
              </div>
              <button
                type='button'
                onClick={() => setOpen(false)}
                disabled={submitting}
                className='shrink-0 w-8 h-8 rounded-lg text-white/40 hover:text-white hover:bg-white/8 transition-colors flex items-center justify-center disabled:opacity-40'
                aria-label='Close'
              >
                <X size={15} />
              </button>
            </div>

            {/* Body */}
            <div className='px-5 pb-5 space-y-4'>
              <div className='space-y-2 text-sm leading-relaxed'>
                <p className='text-white/75'>
                  Deleting your account will <span className='text-white font-semibold'>permanently remove</span> everything tied to it:
                </p>
                <ul className='text-white/65 text-sm space-y-1.5 pl-1'>
                  <li className='flex items-start gap-2'>
                    <span className='text-red-400 mt-0.5'>•</span>
                    Your profile, photos, gallery, and bio
                  </li>
                  <li className='flex items-start gap-2'>
                    <span className='text-red-400 mt-0.5'>•</span>
                    Your Stride Tag and all run history
                  </li>
                  <li className='flex items-start gap-2'>
                    <span className='text-red-400 mt-0.5'>•</span>
                    All your event registrations (past and upcoming)
                  </li>
                  <li className='flex items-start gap-2'>
                    <span className='text-red-400 mt-0.5'>•</span>
                    Your sign-in credentials
                  </li>
                </ul>
                <p className='text-white/55 text-xs pt-1'>
                  You&apos;ll lose all your progress. If you change your mind later, you&apos;ll need to create a new account from scratch.
                </p>
              </div>

              {/* Confirm input */}
              <div>
                <label className='block text-white/70 text-xs font-medium mb-1.5'>
                  Type <span className='font-mono font-bold text-red-400'>{CONFIRM_PHRASE}</span> below to confirm
                </label>
                <input
                  type='text'
                  value={confirmText}
                  onChange={e => setConfirmText(e.target.value)}
                  placeholder={CONFIRM_PHRASE}
                  autoComplete='off'
                  autoCorrect='off'
                  spellCheck={false}
                  className='w-full bg-white/8 border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm font-mono tracking-wider placeholder:text-white/20 focus:outline-none focus:border-red-500/60 transition-colors'
                  disabled={submitting}
                />
              </div>

              {error && (
                <div className='bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2.5 text-red-400 text-xs'>
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className='flex gap-3 pt-1'>
                <button
                  type='button'
                  onClick={() => setOpen(false)}
                  disabled={submitting}
                  className='flex-1 py-2.5 rounded-md border border-white/15 text-white/70 text-sm hover:border-white/30 transition-colors disabled:opacity-50 min-h-11'
                >
                  Keep my account
                </button>
                <button
                  type='button'
                  onClick={handleDelete}
                  disabled={!canDelete || submitting}
                  className='flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-md bg-red-500 hover:bg-red-600 text-white font-semibold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed min-h-11'
                >
                  {submitting ? <><Spinner /> Deleting…</> : <><Trash2 size={14} /> Delete forever</>}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
