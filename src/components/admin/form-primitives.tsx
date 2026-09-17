'use client'

import { useFormStatus } from 'react-dom'
import { Spinner } from '@/components/ui/spinner'
import { HelpHint } from '@/components/ui/help-hint'

// Leaf controls shared by the admin forms (events, races). Pure presentation:
// nothing here closes over form state, so a form composes them freely and the
// pieces stay small enough to reason about on their own.

export type Status = 'DRAFT' | 'PUBLISHED' | 'CANCELLED'

export const inputBase =
  'bg-white/8 border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-stride-yellow-accent/70 focus:bg-white/10 transition-colors w-full'

/** Input types that need the iOS overflow fix — see `.date-input-fix`. */
export const TEMPORAL_INPUT_TYPES = new Set(['date', 'datetime-local', 'time', 'month', 'week'])

export function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type='submit'
      disabled={pending}
      className='bg-stride-yellow-accent text-copy-black font-semibold px-6 py-3 rounded-md hover:bg-stride-yellow-accent/90 transition-colors text-sm min-h-11 flex items-center gap-2 disabled:opacity-70'
    >
      {pending && <Spinner />}
      {pending ? 'Saving…' : label}
    </button>
  )
}

export function Widget({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className='bg-white/4 border border-white/10 rounded-2xl px-4 py-4 sm:px-5 sm:py-5'>
      <div className='flex items-center gap-2 mb-4'>
        <span className='inline-flex w-7 h-7 rounded-lg bg-stride-yellow-accent/10 text-stride-yellow-accent items-center justify-center'>
          {icon}
        </span>
        <h2 className='text-white font-bold text-sm font-mono uppercase tracking-widest'>{title}</h2>
      </div>
      {children}
    </section>
  )
}

export function StatusPill({
  active, onClick, icon, label, tone,
}: { value: Status; active: boolean; onClick: () => void; icon: React.ReactNode; label: string; tone: 'green' | 'yellow' | 'red' }) {
  const activeStyles =
    tone === 'green'
      ? 'bg-green-500/15 border-green-500 text-green-400 shadow-[0_0_0_3px_rgba(34,197,94,0.10)]'
      : tone === 'yellow'
      ? 'bg-stride-yellow-accent/15 border-stride-yellow-accent text-stride-yellow-accent shadow-[0_0_0_3px_rgba(225,208,63,0.10)]'
      : 'bg-red-500/15 border-red-500 text-red-400 shadow-[0_0_0_3px_rgba(239,68,68,0.10)]'

  return (
    <button
      type='button'
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-bold transition-all duration-200 border ${
        active
          ? activeStyles
          : 'bg-white/5 border-white/15 text-white/55 hover:border-white/25 hover:text-white/85'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}

export type FieldProps = {
  icon?: React.ReactNode
  label: string
  name: string
  type?: string
  as?: 'input' | 'textarea'
  defaultValue?: string
  value?: string
  onChange?: (v: string) => void
  required?: boolean
  rows?: number
  placeholder?: string
  help?: string
  /** Id of a <datalist> offering suggestions for a text input. */
  list?: string
}

export function Field({ icon, label, name, type = 'text', as = 'input', defaultValue = '', value, onChange, required, rows, placeholder, help, list }: FieldProps) {
  const controlled = value !== undefined && onChange !== undefined
  return (
    <div className='flex flex-col gap-1.5 min-w-0'>
      <div className='flex items-center gap-1.5'>
        {icon && <span className='text-white/40'>{icon}</span>}
        <label className='text-white/70 text-sm font-medium'>
          {label}
          {required && <span className='text-stride-yellow-accent ml-0.5'>*</span>}
        </label>
        {help && <HelpHint text={help} />}
      </div>
      {as === 'textarea' ? (
        <textarea
          name={name}
          defaultValue={controlled ? undefined : defaultValue}
          value={controlled ? value : undefined}
          onChange={controlled ? e => onChange(e.target.value) : undefined}
          required={required}
          rows={rows ?? 3}
          placeholder={placeholder}
          className={inputBase}
        />
      ) : (
        <input
          type={type}
          name={name}
          list={list}
          defaultValue={controlled ? undefined : defaultValue}
          value={controlled ? value : undefined}
          onChange={controlled ? e => onChange(e.target.value) : undefined}
          required={required}
          placeholder={placeholder}
          // date-input-fix only for the temporal types: it sets
          // `appearance: none`, which on a number input would also strip the
          // spinner arrows the capacity and price fields rely on.
          className={`${inputBase} scheme-dark ${TEMPORAL_INPUT_TYPES.has(type) ? 'date-input-fix' : ''}`}
        />
      )}
    </div>
  )
}
