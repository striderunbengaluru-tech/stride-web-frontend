'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Script from 'next/script'
import dynamic from 'next/dynamic'

// Lazy: react-markdown only loads when a modal with event T&C actually opens,
// keeping it out of the event page's initial JS.
const ReactMarkdown = dynamic(() => import('react-markdown'), { ssr: false })
import { X } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import { isChoiceFieldType, sumPackageAmountPaise, hasSpotBudget, resolveTierAvailability, type AdditionalField, type EventPackage } from '@/types/event'
import { dobError, requiresGuardianConsent } from '@/lib/utils/age'
import { formatRupees, priceLabel as priceOf } from '@/lib/utils/money'
import { reportFormError } from '@/lib/utils/form-errors'

// Razorpay checkout global — loaded via CDN Script below
declare global {
  interface Window {
    // justification: third-party Razorpay checkout SDK loaded from CDN
    Razorpay: new (options: Record<string, unknown>) => { open(): void }
  }
}

type Gender = 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY'

const GENDER_OPTIONS: { value: Gender; label: string; icon: string }[] = [
  { value: 'MALE',              label: 'Male',           icon: '♂' },
  { value: 'FEMALE',            label: 'Female',         icon: '♀' },
  { value: 'OTHER',             label: 'Other',          icon: '⚧' },
  { value: 'PREFER_NOT_TO_SAY', label: 'Prefer not to say', icon: '✕' },
]

const inputBase =
  'bg-white/8 border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-stride-yellow-accent/70 focus:bg-white/10 transition-colors w-full'

const checkboxBase = 'mt-0.5 accent-stride-yellow-accent w-4 h-4 shrink-0'
const inputErrorBorder = 'border-red-500/60 focus:border-red-500/60'

// Section heading inside the modal — plain and readable. Deliberately not the
// mono/uppercase/tracked treatment: at 10px it was the least legible label in a
// dialog whose whole job is informed consent.
const sectionHeading = 'text-white text-sm font-semibold'

// Markdown rendered inside the modal. prose-sm matches every other markdown
// block in the app (the previous `prose-xs` isn't a real typography size, so the
// terms silently rendered at prose *default* — 16px with 1.75 leading — and the
// per-element overrides were fighting it). Headings are capped near body size so
// an admin's `##` can't out-shout the modal's own headings, and links are
// underlined rather than distinguished by colour alone.
const termsProse =
  'prose prose-invert prose-sm max-w-none ' +
  'prose-p:text-white/85 prose-p:leading-relaxed prose-p:my-2 ' +
  'prose-headings:text-white prose-headings:font-semibold prose-headings:text-[13px] prose-headings:mt-4 prose-headings:mb-1.5 ' +
  'prose-a:text-stride-yellow-accent prose-a:underline prose-a:underline-offset-2 ' +
  'prose-strong:text-white prose-li:text-white/85 prose-li:my-0.5 ' +
  'prose-ul:my-2 prose-ol:my-2 prose-hr:border-white/10 ' +
  '[&_ul>li::marker]:text-stride-yellow-accent [&_ol>li::marker]:text-stride-yellow-accent ' +
  '[&>*:first-child]:mt-0 [&>*:last-child]:mb-0'

// Treat the scroll position as "at the end" a few px early — sub-pixel layout
// means scrollTop often lands just short of the exact bottom.
const SCROLL_END_SLOP_PX = 8

// Below this many spots left, a package says so. Mirrors the event page's own
// "Hurry!" threshold so the two surfaces agree on what counts as scarce.
const PACKAGE_SCARCITY_THRESHOLD = 10

// Per-field validators — shared by live (blur/change) validation and the
// submit-time backstop. Return a message, or null when valid.
const validateFullName = (v: string) =>
  v.trim().length < 2 ? 'Please enter your full name' : null
const validateDob = (v: string) => dobError(v)
const validatePhone = (v: string) =>
  !/^\d{10,11}$/.test(v) ? 'Enter a valid 10 or 11 digit number (digits only)' : null

function validateCustomField(field: AdditionalField, raw: string): string | null {
  const v = raw.trim()
  if (field.required && !v) return `Please answer: ${field.label}`
  if (!v) return null
  if (field.type === 'number' && Number.isNaN(Number(v))) return `"${field.label}" must be a number`
  if (field.type === 'link') {
    try { new URL(v) } catch { return `"${field.label}" must start with http:// or https://` }
  }
  // Choice answers must come from the event's own option list. The inputs make
  // that true already; this catches a stale form after an admin edits options.
  if (isChoiceFieldType(field.type) && !(field.options ?? []).includes(v)) {
    return `Please pick one of the listed options for "${field.label}"`
  }
  return null
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return <p className='text-red-400 text-[11px] mt-1.5'>{msg}</p>
}

/**
 * Spots left on a package, or null when it carries no budget (packages authored
 * before spots existed — those register against total event capacity alone).
 */
function spotsLeftFor(pkg: EventPackage, taken: Record<string, number>): number | null {
  if (!hasSpotBudget(pkg)) return null
  return Math.max(0, (pkg.spotsTotal ?? 0) - (taken[pkg.id] ?? 0))
}

function defaultPackageSelection(
  packages: EventPackage[],
  enabled: boolean,
  multiSelect: boolean,
  taken: Record<string, number>,
  progressive: boolean,
): string[] {
  if (!enabled || multiSelect) return []
  // The first tier the runner may actually pick. Under progressive pricing that
  // is the one tier currently open, not simply the first with spots left.
  const open = new Set(
    resolveTierAvailability(packages, taken, progressive).filter(t => t.selectable).map(t => t.id)
  )
  const first = packages.find(pkg => open.has(pkg.id))
  return first ? [first.id] : []
}

type Props = {
  open: boolean
  onClose: () => void
  eventId: string
  pricePaise: number
  initial: {
    fullName: string | null
    dateOfBirth: string | null
    gender: string | null
    contactNumber: string | null
    emergencyContactNumber: string | null
  }
  additionalFields?: AdditionalField[]
  termsAndConditions?: string | null
  /** Priced tiers. Only meaningful when packagesEnabled. */
  packages?: EventPackage[]
  packagesEnabled?: boolean
  packagesMultiSelect?: boolean
  /** Opens one tier at a time — see resolveTierAvailability. */
  packagesProgressive?: boolean
  /**
   * Spots already taken per package id. Drives the "N left" hint and disables
   * sold-out tiers. Advisory only — register_for_event re-checks every budget
   * under a row lock, so a stale count here can't oversell anything.
   */
  packageSpotsTaken?: Record<string, number>
  razorpayKeyId?: string
  /** Needed for the redirect — the register route echoes it back, but only on success. */
  eventSlug?: string
  /**
   * Submitting is an APPLICATION, not a registration. No payment, no packages,
   * and the runner is told plainly that a spot isn't guaranteed.
   */
  inviteOnly?: boolean
}

export function ParticipantDetailsModal({ open, onClose, eventId, eventSlug, pricePaise, initial, additionalFields = [], termsAndConditions, packages = [], packagesEnabled = false, packagesMultiSelect = false, packagesProgressive = false, packageSpotsTaken = {}, razorpayKeyId, inviteOnly = false }: Props) {
  const router = useRouter()

  const [fullName, setFullName] = useState(initial.fullName ?? '')
  const [dateOfBirth, setDateOfBirth] = useState(initial.dateOfBirth ?? '')
  const [gender, setGender] = useState<Gender | ''>(
    (initial.gender as Gender) ?? ''
  )
  const [contactNumber, setContactNumber] = useState(initial.contactNumber ?? '')
  const [emergencyContactNumber, setEmergencyContactNumber] = useState(initial.emergencyContactNumber ?? '')
  const [customResponses, setCustomResponses] = useState<Record<string, string>>(
    () => Object.fromEntries(additionalFields.map(f => [f.id, '']))
  )
  // Single-select defaults to the first package that still has spots, so the
  // common path is one tap and a sold-out first tier doesn't pre-select a choice
  // the server would immediately reject. Multi-select starts empty — pre-ticking
  // something they'd be charged for isn't a default we get to make for them.
  const [selectedPackageIds, setSelectedPackageIds] = useState<string[]>(
    () => defaultPackageSelection(packages, packagesEnabled, packagesMultiSelect, packageSpotsTaken, packagesProgressive)
  )
  const [accepted, setAccepted] = useState(false)
  // Terms scroll state. `atEnd` is transient and drives the fade at the bottom
  // edge (scroll back up and there genuinely is more below again); `read` is
  // sticky and drives the header's confirmation. Both start true when the terms
  // are short enough not to scroll, so the UI never asks for a scroll that
  // isn't possible.
  const [termsAtEnd, setTermsAtEnd] = useState(false)
  const [termsRead, setTermsRead] = useState(false)
  const [agreedPolicies, setAgreedPolicies] = useState(false)
  const [agreedGuardian, setAgreedGuardian] = useState(false)
  const [agreedSafety, setAgreedSafety] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Live validation — a field validates on blur once it's dirty (the user
  // actually typed in it), and re-validates on every change while it has an
  // error so the message clears the moment the input becomes valid.
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [dirtyFields, setDirtyFields] = useState<Record<string, boolean>>({})

  function setFieldError(key: string, msg: string | null) {
    setFieldErrors(prev => {
      const next = { ...prev }
      if (msg) next[key] = msg
      else delete next[key]
      return next
    })
  }
  function markFieldDirty(key: string) {
    setDirtyFields(prev => (prev[key] ? prev : { ...prev, [key]: true }))
  }

  /**
   * The single failure path. Keeps the persistent messages (banner + inline text
   * under the control) and adds a toast plus a scroll-to-focus on the offending
   * field — the banner sits above the submit button and was easy to miss on a
   * phone, where the failing input is often several screens up.
   */
  function fail(message: string, field?: string) {
    setError(message)
    if (field) setFieldError(field, message)
    reportFormError({ message, field })
  }

  // Measured on attach rather than in an effect — terms that fit without
  // scrolling are already fully read.
  function measureTerms(el: HTMLDivElement | null) {
    if (el && el.scrollHeight - el.clientHeight <= SCROLL_END_SLOP_PX) {
      setTermsAtEnd(true)
      setTermsRead(true)
    }
  }
  function handleTermsScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget
    const atEnd = el.scrollHeight - el.scrollTop - el.clientHeight <= SCROLL_END_SLOP_PX
    setTermsAtEnd(atEnd)
    if (atEnd) setTermsRead(true)
  }

  // Emergency number is valid only if well-formed AND different from the
  // primary contact — needs both values, so it can't be a module validator.
  const validateEmergency = (v: string, contact: string) =>
    validatePhone(v) ?? (v === contact ? 'Emergency number must be different from your contact number' : null)

  // With packages the amount depends on what's selected, so it's derived rather
  // than taken from the pricePaise prop. This total is for DISPLAY only — the
  // server recomputes it from the event's own package rows and never trusts
  // anything the client sends about money.
  const hasPackages = !inviteOnly && packagesEnabled && packages.length > 0

  // Which tiers may be picked right now, keyed by id. Computed with the very
  // same function the register route enforces with, so the modal can never
  // offer something the server would turn away.
  const tierState = useMemo(() => {
    const byId = new Map<string, { selectable: boolean; soldOut: boolean }>()
    for (const tier of resolveTierAvailability(packages, packageSpotsTaken, packagesProgressive)) {
      byId.set(tier.id, { selectable: tier.selectable, soldOut: tier.soldOut })
    }
    return byId
  }, [packages, packageSpotsTaken, packagesProgressive])
  const selectedPackages = hasPackages
    ? packages.filter(pkg => selectedPackageIds.includes(pkg.id))
    : []
  const totalPaise = hasPackages ? sumPackageAmountPaise(selectedPackages) : pricePaise
  // Applying is always free, whatever the event's stored price says — so the
  // Razorpay script never loads and the button never offers to charge.
  const isPaid = !inviteOnly && totalPaise > 0

  const hasTerms = !!termsAndConditions && termsAndConditions.trim().length > 0

  function togglePackage(id: string) {
    setSelectedPackageIds(prev => {
      if (!packagesMultiSelect) return [id]
      return prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    })
    setFieldError('packages', null)
  }

  // Guardian-consent checkbox appears only once a plausible date of birth is on
  // the form AND it belongs to someone under 18. An empty field, a partial entry
  // or a nonsense year (the native picker opens on the current one, which
  // computes to age 0) all count as "not set" and keep the checkbox hidden.
  const isMinor = requiresGuardianConsent(dateOfBirth)

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setError(null)
      setLoading(false)
      setAccepted(false)
      setAgreedPolicies(false)
      setAgreedGuardian(false)
      setAgreedSafety(false)
      setFieldErrors({})
      setDirtyFields({})
      // Back to the default selection, not to whatever they last picked — a
      // reopened modal should read the same as a fresh one.
      setSelectedPackageIds(
        defaultPackageSelection(packages, packagesEnabled, packagesMultiSelect, packageSpotsTaken, packagesProgressive)
      )
    }
    // packages is a fresh array identity on every server render of the parent, so
    // it's intentionally not a dependency — only `open` should drive this reset.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Esc key to close
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !loading) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, loading, onClose])

  // Portal target — guard against SSR where document is undefined
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  if (!open || !mounted) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    // Submit-time backstop — same validators as the live blur/change checks,
    // and the failing field gets its inline error highlighted too.
    const submitChecks: [key: string, msg: string | null][] = [
      ['fullName', validateFullName(fullName)],
      ['dateOfBirth', validateDob(dateOfBirth)],
      ['contactNumber', validatePhone(contactNumber)],
      ['emergencyContactNumber', validateEmergency(emergencyContactNumber, contactNumber)],
      ...additionalFields.map((field): [string, string | null] =>
        [field.id, validateCustomField(field, customResponses[field.id] ?? '')]
      ),
    ]
    for (const [key, msg] of submitChecks) {
      if (msg) return fail(msg, key)
    }
    if (!gender) return fail('Please select your gender', 'gender')

    if (hasPackages && selectedPackageIds.length === 0) {
      return fail(packagesMultiSelect ? 'Please choose at least one package' : 'Please choose a package', 'packages')
    }
    // A tier can sell out while the modal is open. The server re-checks under a
    // lock either way; catching it here saves a round trip and names the tier.
    const unavailable = packages.find(pkg =>
      selectedPackageIds.includes(pkg.id) && !(tierState.get(pkg.id)?.selectable ?? true)
    )
    if (unavailable) {
      const isSoldOut = tierState.get(unavailable.id)?.soldOut ?? false
      return fail(
        isSoldOut
          ? `"${unavailable.name}" is sold out — please pick another package.`
          : `"${unavailable.name}" isn't open right now — please pick another package.`,
        'packages',
      )
    }

    if (hasTerms && !accepted) return fail('Please accept the terms & conditions to continue', 'acceptedTerms')
    if (!agreedPolicies) return fail('Please agree to the Privacy Policy and Terms of Service', 'agreedPolicies')
    if (isMinor && !agreedGuardian) return fail('Please confirm you have your guardian’s consent to attend', 'agreedGuardian')
    if (!agreedSafety) return fail('Please accept the safety declaration to continue', 'agreedSafety')

    setLoading(true)
    try {
      const res = await fetch('/api/events/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          fullName: fullName.trim(),
          dateOfBirth,
          gender,
          contactNumber: contactNumber.trim(),
          emergencyContactNumber: emergencyContactNumber.trim(),
          acceptedTerms: hasTerms ? accepted : undefined,
          customResponses,
          // Ids only. The server looks up each one on the event and sums the
          // amounts itself — sending prices from here would be a price the
          // client got to choose.
          selectedPackageIds,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        // The route names the offending control: `field` for the package list,
        // `fieldId` for a custom question. Either one gets scrolled into view.
        fail(data.error ?? 'Registration failed', data.field ?? data.fieldId)
        setLoading(false)
        return
      }

      // Free registration, or an invite-only application. Both land on the
      // confirmation page — it renders the "awaiting a decision" state for an
      // application and the ticket for a confirmed registration.
      if (!data.razorpayOrderId) {
        router.push(`/events/${data.slug ?? eventSlug}/confirmation/${data.registrationId}`)
        return
      }

      // Paid event — open Razorpay
      const rzp = new window.Razorpay({
        key: razorpayKeyId ?? '',
        amount: data.amount,
        currency: data.currency,
        name: 'Stride Run Club',
        description: data.eventName ?? 'Event Registration',
        order_id: data.razorpayOrderId,
        handler: async (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
          setLoading(true)
          try {
            const verifyRes = await fetch('/api/events/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                registrationId: data.registrationId,
              }),
            })
            const verifyData = await verifyRes.json()
            if (verifyRes.ok && verifyData.success) {
              router.push(`/events/${data.slug}/confirmation/${data.registrationId}`)
            } else {
              fail(verifyData.error ?? 'Payment verification failed. Please contact support.')
              setLoading(false)
            }
          } catch {
            fail('Verification error. Please contact support.')
            setLoading(false)
          }
        },
        prefill: { name: fullName.trim(), email: data.userEmail, contact: contactNumber.trim() },
        theme: { color: '#E1D03F' },
        modal: {
          ondismiss: () => setLoading(false),
        },
      })
      rzp.open()
    } catch {
      fail('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return createPortal(
    <>
      {isPaid && (
        <Script src='https://checkout.razorpay.com/v1/checkout.js' strategy='lazyOnload' />
      )}
      <div
        className='fixed inset-0 z-[100] flex items-start sm:items-center justify-center bg-stride-purple-primary/40 backdrop-blur-xl px-4 pt-24 sm:pt-6 pb-6'
        onClick={() => !loading && onClose()}
      >
        <div
          onClick={e => e.stopPropagation()}
          className='relative w-full max-w-md max-h-[calc(100dvh-7rem)] sm:max-h-[calc(100dvh-3rem)]'
        >
          {/* Ambient glow behind the card */}
          <div className='pointer-events-none absolute -top-10 -left-10 w-40 h-40 rounded-full bg-stride-yellow-accent/20 blur-[80px]' aria-hidden='true' />
          <div className='pointer-events-none absolute -bottom-8 -right-8 w-32 h-32 rounded-full bg-stride-yellow-accent/10 blur-[70px]' aria-hidden='true' />

          {/* Yellow corner accents (echoes become-a-member design) */}
          <div className='pointer-events-none absolute -top-px -left-px w-14 h-14 border-t-2 border-l-2 border-stride-yellow-accent/50 rounded-tl-2xl z-10' aria-hidden='true' />
          <div className='pointer-events-none absolute -bottom-px -right-px w-14 h-14 border-b-2 border-r-2 border-stride-yellow-accent/50 rounded-br-2xl z-10' aria-hidden='true' />

          {/* Glass shell */}
          <div className='relative bg-stride-purple-primary/80 backdrop-blur-2xl border border-white/15 rounded-2xl overflow-hidden max-h-[calc(100dvh-7rem)] sm:max-h-[calc(100dvh-3rem)] flex flex-col'>

            {/* Header */}
            <div className='shrink-0 px-6 pt-6 pb-4 border-b border-white/8'>
              <div className='flex items-start justify-between gap-3'>
                <div className='min-w-0'>
                  <h2 className='text-white font-bold text-xl leading-tight'>
                    {inviteOnly ? 'Apply to join' : 'Tell us about you'}
                  </h2>
                  <p className='text-white/50 text-sm mt-1 leading-snug'>
                    {inviteOnly
                      ? 'Free to apply. Stride reviews every application.'
                      : 'Quick details to join the run.'}
                  </p>
                </div>
                <button
                  type='button'
                  onClick={onClose}
                  disabled={loading}
                  className='shrink-0 w-8 h-8 -mr-1 rounded-lg text-white/40 hover:text-white hover:bg-white/8 transition-colors flex items-center justify-center disabled:opacity-40'
                  aria-label='Close'
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Scrollable form area */}
            <form onSubmit={handleSubmit} className='overflow-y-auto px-6 py-5 space-y-4 flex-1'>

            {/* Full name */}
            <div>
              <label className='block text-white/70 text-xs font-medium mb-1.5'>Full name *</label>
              <input
                type='text'
                data-field='fullName'
                value={fullName}
                onChange={e => {
                  setFullName(e.target.value)
                  markFieldDirty('fullName')
                  if (fieldErrors.fullName) setFieldError('fullName', validateFullName(e.target.value))
                }}
                onBlur={() => { if (dirtyFields.fullName) setFieldError('fullName', validateFullName(fullName)) }}
                placeholder='Your full name'
                className={`${inputBase} ${fieldErrors.fullName ? inputErrorBorder : ''}`}
                required
              />
              <FieldError msg={fieldErrors.fullName} />
            </div>

            {/* Date of birth */}
            <div className='min-w-0'>
              <label className='block text-white/70 text-xs font-medium mb-1.5'>Date of birth *</label>
              <input
                type='date'
                data-field='dateOfBirth'
                value={dateOfBirth}
                onChange={e => {
                  setDateOfBirth(e.target.value)
                  markFieldDirty('dateOfBirth')
                  if (fieldErrors.dateOfBirth) setFieldError('dateOfBirth', validateDob(e.target.value))
                }}
                onBlur={() => { if (dirtyFields.dateOfBirth) setFieldError('dateOfBirth', validateDob(dateOfBirth)) }}
                max={new Date().toISOString().split('T')[0]}
                className={`${inputBase} scheme-dark date-input-fix ${fieldErrors.dateOfBirth ? inputErrorBorder : ''}`}
                required
              />
              <FieldError msg={fieldErrors.dateOfBirth} />
            </div>

            {/* Gender */}
            <div>
              <label className='block text-white/70 text-xs font-medium mb-1.5'>Gender *</label>
              <div data-field='gender' tabIndex={-1} className='grid grid-cols-4 gap-1.5'>
                {GENDER_OPTIONS.map(opt => {
                  const active = gender === opt.value
                  return (
                    <button
                      key={opt.value}
                      type='button'
                      onClick={() => { setGender(opt.value); setFieldError('gender', null) }}
                      aria-pressed={active}
                      className={`relative flex flex-col items-center justify-center gap-1 px-2 py-3 rounded-xl text-[11px] font-medium leading-tight text-center transition-all duration-200 border ${
                        active
                          ? 'bg-stride-yellow-accent/15 border-stride-yellow-accent text-stride-yellow-accent shadow-[0_0_0_3px_rgba(225,208,63,0.08)]'
                          : 'bg-white/5 border-white/15 text-white/55 hover:bg-white/10 hover:border-white/25 hover:text-white/85'
                      }`}
                    >
                      <span className='text-base'>{opt.icon}</span>
                      <span className='line-clamp-2'>{opt.label}</span>
                    </button>
                  )
                })}
              </div>
              <FieldError msg={fieldErrors.gender} />
            </div>

            {/* Contact number */}
            <div>
              <label className='block text-white/70 text-xs font-medium mb-1.5'>Contact number *</label>
              <input
                type='tel'
                data-field='contactNumber'
                value={contactNumber}
                onChange={e => {
                  const v = e.target.value.replace(/\D/g, '')
                  setContactNumber(v)
                  markFieldDirty('contactNumber')
                  if (fieldErrors.contactNumber) setFieldError('contactNumber', validatePhone(v))
                  // The "must differ" rule depends on this value too
                  if (fieldErrors.emergencyContactNumber) {
                    setFieldError('emergencyContactNumber', validateEmergency(emergencyContactNumber, v))
                  }
                }}
                onBlur={() => { if (dirtyFields.contactNumber) setFieldError('contactNumber', validatePhone(contactNumber)) }}
                placeholder='9876543210'
                inputMode='numeric'
                pattern='\d*'
                maxLength={11}
                className={`${inputBase} ${fieldErrors.contactNumber ? inputErrorBorder : ''}`}
                required
              />
              <FieldError msg={fieldErrors.contactNumber} />
            </div>

            {/* Emergency contact number */}
            <div>
              <label className='block text-white/70 text-xs font-medium mb-1.5'>Emergency contact number *</label>
              <input
                type='tel'
                data-field='emergencyContactNumber'
                value={emergencyContactNumber}
                onChange={e => {
                  const v = e.target.value.replace(/\D/g, '')
                  setEmergencyContactNumber(v)
                  markFieldDirty('emergencyContactNumber')
                  if (fieldErrors.emergencyContactNumber) setFieldError('emergencyContactNumber', validateEmergency(v, contactNumber))
                }}
                onBlur={() => {
                  if (dirtyFields.emergencyContactNumber) {
                    setFieldError('emergencyContactNumber', validateEmergency(emergencyContactNumber, contactNumber))
                  }
                }}
                placeholder='9876543210'
                inputMode='numeric'
                pattern='\d*'
                maxLength={11}
                className={`${inputBase} ${fieldErrors.emergencyContactNumber ? inputErrorBorder : ''}`}
                required
              />
              <FieldError msg={fieldErrors.emergencyContactNumber} />
              <p className='text-white/30 text-[11px] mt-1.5'>Someone we can reach if anything happens during the run.</p>
            </div>

            {/* Package selection — the runner builds their own total here */}
            {hasPackages && (
              <div className='pt-5 mt-2 border-t border-white/10'>
                <h3 className={sectionHeading}>
                  Choose your package <span className='text-stride-yellow-accent'>*</span>
                </h3>
                <p className='text-white/40 text-[11px] mt-1 mb-3'>
                  {packagesMultiSelect
                    ? 'Pick as many as you like — you’ll pay the total.'
                    : 'Pick the one you want.'}
                </p>

                <div
                  role={packagesMultiSelect ? 'group' : 'radiogroup'}
                  aria-label='Event packages'
                  data-field='packages'
                  tabIndex={-1}
                  className='flex flex-col gap-2'
                >
                  {packages.map(pkg => {
                    const checked = selectedPackageIds.includes(pkg.id)
                    const left = spotsLeftFor(pkg, packageSpotsTaken)
                    const state = tierState.get(pkg.id)
                    const soldOut = state?.soldOut ?? left === 0
                    // Closed by progressive pricing reads exactly like sold out:
                    // greyed, unpickable, price still shown. Deliberately no
                    // explanation — a runner does not need the club's pricing
                    // mechanics narrated at them.
                    const disabled = !(state?.selectable ?? true)
                    return (
                      <label
                        key={pkg.id}
                        aria-disabled={disabled}
                        className={`flex items-start gap-2.5 min-h-11 px-3.5 py-3 rounded-lg border transition-colors ${
                          disabled
                            ? 'border-white/10 bg-white/3 cursor-not-allowed'
                            : 'border-white/15 bg-white/6 cursor-pointer hover:border-white/30 has-checked:border-stride-yellow-accent/70 has-checked:bg-stride-yellow-accent/10'
                        }`}
                      >
                        <input
                          type={packagesMultiSelect ? 'checkbox' : 'radio'}
                          name={packagesMultiSelect ? `package-${pkg.id}` : 'event-package'}
                          value={pkg.id}
                          checked={checked}
                          disabled={disabled}
                          onChange={() => togglePackage(pkg.id)}
                          className='accent-stride-yellow-accent w-4 h-4 shrink-0 mt-0.5 disabled:opacity-40'
                        />
                        <span className={`min-w-0 flex-1 ${disabled ? 'opacity-45' : ''}`}>
                          <span className='flex items-baseline justify-between gap-3'>
                            <span className='text-white/90 text-sm font-medium'>{pkg.name}</span>
                            <span className='text-white text-sm font-semibold font-mono shrink-0'>
                              {priceOf(pkg.amountPaise)}
                            </span>
                          </span>
                          {/* Spots are shown once a tier is genuinely scarce, or
                              when it's gone. A cheerful "40 left" on an empty run
                              is noise; "3 left" is the thing worth saying. */}
                          {soldOut ? (
                            <span className='block mt-1 text-red-400/90 text-[11px] font-semibold'>Sold out</span>
                          ) : left !== null && left <= PACKAGE_SCARCITY_THRESHOLD ? (
                            <span className='block mt-1 text-stride-yellow-accent text-[11px] font-semibold tabular-nums'>
                              Only {left} {left === 1 ? 'spot' : 'spots'} left
                            </span>
                          ) : null}
                          {pkg.details.trim() && (
                            <span className={`block mt-1.5 ${termsProse}`}>
                              <ReactMarkdown>{pkg.details}</ReactMarkdown>
                            </span>
                          )}
                        </span>
                      </label>
                    )
                  })}
                </div>

                <FieldError msg={fieldErrors.packages} />

                {/* The confirmation of what they're about to be charged. */}
                <div className='flex items-center justify-between gap-3 mt-3 pt-3 border-t border-white/10'>
                  <span className='text-white/60 text-sm'>
                    {selectedPackages.length > 1 ? `Total · ${selectedPackages.length} packages` : 'Total'}
                  </span>
                  <span className='text-white font-bold text-lg font-mono'>{priceOf(totalPaise)}</span>
                </div>
              </div>
            )}

            {/* Event-specific custom fields */}
            {additionalFields.length > 0 && (
              <div className='pt-5 mt-2 border-t border-white/10 space-y-4'>
                <h3 className={sectionHeading}>A few event questions</h3>
                {additionalFields.map(field => {
                  const err = fieldErrors[field.id]
                  const handleChange = (value: string) => {
                    setCustomResponses(prev => ({ ...prev, [field.id]: value }))
                    markFieldDirty(field.id)
                    if (fieldErrors[field.id]) setFieldError(field.id, validateCustomField(field, value))
                  }
                  const handleBlur = () => {
                    if (dirtyFields[field.id]) setFieldError(field.id, validateCustomField(field, customResponses[field.id] ?? ''))
                  }
                  const className = `${inputBase} ${err ? inputErrorBorder : ''}`
                  return (
                    // data-field: the register route reports a failing custom
                    // question by its id, and the controls inside don't carry it
                    // as a `name` — this wrapper is what focusField scrolls to.
                    <div key={field.id} data-field={field.id} tabIndex={-1}>
                      <label className='block text-white/70 text-xs font-medium mb-1.5'>
                        {field.label || 'Untitled'} {field.required && <span className='text-stride-yellow-accent'>*</span>}
                      </label>
                      {field.type === 'mcq' ? (
                        <div
                          role='radiogroup'
                          aria-label={field.label || 'Untitled'}
                          className='flex flex-col gap-2'
                        >
                          {(field.options ?? []).map(option => (
                            <label
                              key={option}
                              className='flex items-center gap-2.5 min-h-11 px-3.5 rounded-lg border border-white/15 bg-white/6 cursor-pointer hover:border-white/30 has-checked:border-stride-yellow-accent/70 has-checked:bg-stride-yellow-accent/10 transition-colors'
                            >
                              <input
                                type='radio'
                                name={`custom-${field.id}`}
                                value={option}
                                checked={customResponses[field.id] === option}
                                onChange={() => handleChange(option)}
                                className='accent-stride-yellow-accent w-4 h-4 shrink-0'
                                required={field.required}
                              />
                              <span className='text-white/85 text-sm'>{option}</span>
                            </label>
                          ))}
                        </div>
                      ) : field.type === 'dropdown' ? (
                        <select
                          value={customResponses[field.id] ?? ''}
                          onChange={e => handleChange(e.target.value)}
                          onBlur={handleBlur}
                          className={`${className} cursor-pointer`}
                          required={field.required}
                        >
                          <option value='' className='bg-stride-purple-primary'>
                            Select an option
                          </option>
                          {(field.options ?? []).map(option => (
                            <option key={option} value={option} className='bg-stride-purple-primary'>
                              {option}
                            </option>
                          ))}
                        </select>
                      ) : field.type === 'number' ? (
                        <input
                          type='number'
                          inputMode='numeric'
                          value={customResponses[field.id] ?? ''}
                          onChange={e => handleChange(e.target.value)}
                          onBlur={handleBlur}
                          placeholder={field.placeholder ?? ''}
                          className={className}
                          required={field.required}
                        />
                      ) : field.type === 'link' ? (
                        <input
                          type='url'
                          inputMode='url'
                          value={customResponses[field.id] ?? ''}
                          onChange={e => handleChange(e.target.value)}
                          onBlur={handleBlur}
                          placeholder={field.placeholder ?? 'https://...'}
                          className={className}
                          required={field.required}
                        />
                      ) : (
                        <input
                          type='text'
                          value={customResponses[field.id] ?? ''}
                          onChange={e => handleChange(e.target.value)}
                          onBlur={handleBlur}
                          placeholder={field.placeholder ?? ''}
                          className={className}
                          required={field.required}
                        />
                      )}
                      <FieldError msg={err} />
                    </div>
                  )
                })}
              </div>
            )}

            {/* Terms & conditions — a document to read, then attest to.
                The copy sits in a recessed well (darker than the modal's glass,
                so it reads as inset rather than a card stacked on a card) and
                fades at its bottom edge while there's more below, so "keep
                reading" is shown rather than implied. */}
            {hasTerms && (
              <div className='pt-5 mt-2 border-t border-white/10'>
                <div className='flex items-baseline justify-between gap-3 mb-2'>
                  <h3 className={sectionHeading}>Event terms</h3>
                  {/* Only the prompt, never a "Read" confirmation: once they've
                      scrolled through, the acknowledgement that matters is the
                      checkbox below, and a second badge saying so was noise. */}
                  {!termsRead && (
                    <span aria-live='polite' className='text-[11px] text-white/40'>
                      Scroll to read
                    </span>
                  )}
                </div>

                <div
                  ref={measureTerms}
                  onScroll={handleTermsScroll}
                  tabIndex={0}
                  role='region'
                  aria-label='Event terms and conditions'
                  className={`max-h-48 overflow-y-auto overscroll-contain rounded-lg border border-white/10 bg-black/20 px-4 py-3.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stride-yellow-accent/70 ${
                    termsAtEnd ? '' : 'mask-b-from-88% mask-b-to-100%'
                  } ${termsProse}`}
                >
                  <ReactMarkdown>{termsAndConditions ?? ''}</ReactMarkdown>
                </div>

                <label className='mt-1 flex min-h-11 items-center gap-2.5 cursor-pointer select-none group'>
                  <input
                    type='checkbox'
                    data-field='acceptedTerms'
                    checked={accepted}
                    onChange={e => setAccepted(e.target.checked)}
                    className='accent-stride-yellow-accent w-4 h-4 shrink-0 rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stride-yellow-accent'
                  />
                  <span className='text-white/70 text-xs leading-snug group-hover:text-white/85 transition-colors duration-150 motion-reduce:transition-none'>
                    I have read and agree to the terms &amp; conditions for this event.
                  </span>
                </label>
              </div>
            )}

            {/* Consent declarations — all required before registering */}
            <div className='pt-4 mt-2 border-t border-white/8 space-y-3'>
              <label className='flex items-start gap-2.5 cursor-pointer select-none'>
                <input
                  type='checkbox'
                  data-field='agreedPolicies'
                  checked={agreedPolicies}
                  onChange={e => setAgreedPolicies(e.target.checked)}
                  className={checkboxBase}
                />
                <span className='text-white/70 text-xs leading-snug'>
                  I agree to the{' '}
                  <Link href='/privacy-policy' target='_blank' className='text-stride-yellow-accent hover:underline underline-offset-2'>
                    Privacy Policy
                  </Link>
                  {' '}and{' '}
                  <Link href='/terms-of-service' target='_blank' className='text-stride-yellow-accent hover:underline underline-offset-2'>
                    Terms of Service
                  </Link>.
                </span>
              </label>

              {isMinor && (
                <label className='flex items-start gap-2.5 cursor-pointer select-none'>
                  <input
                    type='checkbox'
                    data-field='agreedGuardian'
                    checked={agreedGuardian}
                    onChange={e => setAgreedGuardian(e.target.checked)}
                    className={checkboxBase}
                  />
                  <span className='text-white/70 text-xs leading-snug'>
                    I am under 18 and have the consent of my parent/guardian to attend this event.
                  </span>
                </label>
              )}

              <label className='flex items-start gap-2.5 cursor-pointer select-none'>
                <input
                  type='checkbox'
                  data-field='agreedSafety'
                  checked={agreedSafety}
                  onChange={e => setAgreedSafety(e.target.checked)}
                  className={checkboxBase}
                />
                <span className='text-white/70 text-xs leading-snug'>
                  I am solely responsible for my safety and health during the entire experience, and the organisers are not responsible for the same.
                </span>
              </label>
            </div>

            {/* Error — also announced as a toast by fail(), which is what
                actually gets noticed on a phone where this sits below the fold. */}
            {error && (
              <div role='alert' className='bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2.5 text-red-400 text-xs'>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type='submit'
              disabled={loading || (hasTerms && !accepted) || !agreedPolicies || !agreedSafety || (isMinor && !agreedGuardian)}
              className='w-full py-3 rounded-md bg-stride-yellow-accent text-copy-black font-bold text-sm hover:bg-stride-yellow-accent/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed min-h-11 flex items-center justify-center gap-2'
            >
              {loading ? (
                <><Spinner /> Processing…</>
              ) : isPaid ? (
                <>
                  Pay {formatRupees(totalPaise)} securely via
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src='https://ienotcjldormdxrzukpk.supabase.co/storage/v1/object/public/stride-assets/images/web-assets/razorpay-full-icon.webp'
                    alt='Razorpay'
                    className='h-5 w-auto'
                  />
                </>
              ) : inviteOnly ? (
                'Submit application'
              ) : (
                'Confirm registration'
              )}
            </button>

            {/* Last thing before the button, so nobody submits believing they
                have a spot. Repeated verbatim on the confirmation page. */}
            {inviteOnly && (
              <p className='text-amber-200/80 text-[11px] text-center leading-relaxed'>
                Submitting does not guarantee your participation — Stride selects the athletes for this run.
              </p>
            )}

            <p className='text-white/30 text-[11px] text-center'>
              Your details are saved to your Stride profile, so you won&apos;t need to fill this in again.
            </p>
            </form>
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}
