'use client'

import { useActionState, useEffect, useId } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import clsx from 'clsx'
import { submitSlayApplicationAction, type SlayApplyState } from '@/lib/actions/slay'
import type { SlayApplicationField } from '@/lib/validations/slay'
import { fireConfetti } from '@/components/ui/confetti-burst'
import { SLAY_CONFETTI_COLORS } from '@/content/slay'
import { SLAY_LOGOS } from '@/content/slay-photos'
import { PHONE_DIGITS } from '@/lib/utils/phone'

// Mirrors the Zod schema's limits for instant feedback; the server is the
// authority. Repeated rather than imported so zod stays out of this bundle.
const NAME_MAX = 80
const REASON_MIN = 10
const REASON_MAX = 500

const INITIAL_STATE: SlayApplyState = { status: 'idle' }

type FieldProps = {
  name: SlayApplicationField
  label: string
  hint?: string
  error?: string
  children: (props: { id: string; 'aria-invalid': boolean; 'aria-describedby'?: string; className: string }) => React.ReactNode
}

function Field({ name, label, hint, error, children }: FieldProps) {
  const id = `${useId()}-${name}`
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined

  return (
    <div>
      <label htmlFor={id} className='mb-2 block font-mono text-xs font-semibold uppercase tracking-widest'>
        {label}
      </label>
      {children({
        id,
        'aria-invalid': Boolean(error),
        'aria-describedby': describedBy,
        className: clsx(
          'w-full rounded-2xl border-2 bg-copy-white px-4 py-3 text-base text-copy-black placeholder:text-copy-black/40 focus:outline-none focus:ring-4',
          error ? 'border-slay-pink-ink focus:ring-slay-pink/40' : 'border-copy-black/15 focus:border-copy-black focus:ring-slay-lime',
        ),
      })}
      {hint && !error && <p id={`${id}-hint`} className='mt-1.5 text-sm text-copy-black/60'>{hint}</p>}
      {error && <p id={`${id}-error`} className='mt-1.5 text-sm font-semibold text-slay-pink-ink'>{error}</p>}
    </div>
  )
}

export function SlayJoinForm() {
  const [state, formAction, pending] = useActionState(submitSlayApplicationAction, INITIAL_STATE)
  const fieldErrors = state.status === 'error' ? state.fieldErrors : {}
  const values = state.status === 'error' ? state.values : undefined

  useEffect(() => {
    if (state.status === 'success') void fireConfetti(SLAY_CONFETTI_COLORS)
  }, [state.status])

  if (state.status === 'success') {
    return (
      <div role='status' className='flex flex-col items-center gap-5 py-8 text-center'>
        <Image src={SLAY_LOGOS.boltPink.src} width={SLAY_LOGOS.boltPink.width} height={SLAY_LOGOS.boltPink.height} alt='' className='w-20' />
        <h3 className='font-slay text-4xl uppercase leading-none'>You&apos;re on the list!</h3>
        <p className='max-w-sm text-lg leading-relaxed text-copy-black/80'>
          We will reach out to you via email to get you added to the Slay Run Club WhatsApp community.
        </p>
        <p className='max-w-sm text-base leading-relaxed text-copy-black/80'>
          Till then, become a member of Stride Run Club, our sister community.
        </p>
        <Link
          href='/become-a-member'
          className='inline-flex min-h-14 items-center justify-center rounded-full bg-copy-black px-8 font-slay text-xl uppercase tracking-wide text-slay-lime transition-transform hover:scale-[1.02] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-copy-black'
        >
          Become a Stride member
        </Link>
      </div>
    )
  }

  return (
    <form action={formAction} className='flex flex-col gap-5'>
      <Field name='fullName' label='Full name' error={fieldErrors.fullName}>
        {(props) => <input {...props} name='fullName' defaultValue={values?.fullName} autoComplete='name' required minLength={2} maxLength={NAME_MAX} placeholder='Your full name' />}
      </Field>
      <Field name='email' label='Email' hint='We send your WhatsApp invite here' error={fieldErrors.email}>
        {(props) => <input {...props} name='email' type='email' inputMode='email' autoComplete='email' autoCapitalize='none' spellCheck={false} required maxLength={254} defaultValue={values?.email} placeholder='you@example.com' />}
      </Field>
      <Field name='whatsapp' label='WhatsApp number' hint={`${PHONE_DIGITS} digits, no country code`} error={fieldErrors.whatsapp}>
        {(props) => (
          <input
            {...props}
            name='whatsapp'
            defaultValue={values?.whatsapp}
            type='tel'
            inputMode='numeric'
            autoComplete='tel-national'
            required
            pattern={`\\d{${PHONE_DIGITS}}`}
            maxLength={PHONE_DIGITS}
            placeholder='98XXXXXXXX'
          />
        )}
      </Field>
      <Field name='instagram' label='Instagram ID' error={fieldErrors.instagram}>
        {(props) => <input {...props} name='instagram' defaultValue={values?.instagram} autoComplete='off' autoCapitalize='none' spellCheck={false} required maxLength={31} placeholder='@yourhandle' />}
      </Field>
      <Field name='reason' label='Why do you want to join Slay?' error={fieldErrors.reason}>
        {(props) => (
          <textarea
            {...props}
            name='reason'
            defaultValue={values?.reason}
            required
            rows={4}
            minLength={REASON_MIN}
            maxLength={REASON_MAX}
            placeholder='New to running? Looking for your people? Tell us.'
            className={clsx(props.className, 'resize-y')}
          />
        )}
      </Field>

      {/* Honeypot: off-screen, unfocusable, unlabelled for people. */}
      <input type='text' name='company' tabIndex={-1} autoComplete='off' aria-hidden className='absolute -left-[9999px] size-px opacity-0' />

      {state.status === 'error' && (
        <p role='alert' className='rounded-2xl bg-slay-pink/15 px-4 py-3 text-sm font-semibold text-slay-pink-ink'>{state.message}</p>
      )}

      <button
        type='submit'
        disabled={pending}
        className='mt-2 inline-flex min-h-14 items-center justify-center rounded-full bg-copy-black px-8 font-slay text-xl uppercase tracking-wide text-slay-lime transition-transform hover:scale-[1.02] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-copy-black disabled:cursor-wait disabled:opacity-60'
      >
        {pending ? 'Sending…' : 'Apply to join'}
      </button>
      <p className='text-sm leading-relaxed text-copy-black/70'>
        Slay is a women-only community. We use these details only to review your application and email you an invite to our
        WhatsApp community. See our{' '}
        <Link href='/privacy-policy' className='font-semibold underline underline-offset-2'>Privacy Policy</Link>.
      </p>
    </form>
  )
}
