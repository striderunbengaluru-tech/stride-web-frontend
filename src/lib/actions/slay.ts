'use server'

import { headers } from 'next/headers'
import { adminClient } from '@/lib/supabase/admin'
import { checkRateLimit, type RateLimitConfig } from '@/lib/rate-limit'
import {
  slayApplicationSchema,
  type SlayApplication,
  type SlayApplicationField,
} from '@/lib/validations/slay'

/**
 * Two layers. Per visitor: a handful of honest retries, then cut off — but the
 * counter lives in memory per server instance, so a sender spread across cold
 * starts gets more. Site-wide: a cap on applications stored in the last few
 * minutes, counted in the database, so it holds across every instance. Real
 * demand is a few a day; the cap only bites on a flood.
 */
const SLAY_APPLY_LIMIT: RateLimitConfig = { limit: 5, windowMs: 10 * 60_000 }
const FLOOD_CAP = { max: 30, windowMs: 10 * 60_000 }

/** Bots fill every field; people never see this one. */
const HONEYPOT_FIELD = 'company'

export type SlayApplyState =
  | { status: 'idle' }
  | { status: 'success' }
  | {
      status: 'error'
      message: string
      fieldErrors: Partial<Record<SlayApplicationField, string>>
      /** What was submitted, so the form can refill itself — React resets it after every action. */
      values: Record<SlayApplicationField, string>
    }

/** Postgres unique_violation — this email or WhatsApp number has already applied. */
const UNIQUE_VIOLATION = '23505'

/**
 * Stores one application in public.slay_invites (see
 * supabase-migrations/2026-11-07-slay-invites.sql).
 *
 * adminClient is deliberate and safe here: the table has RLS on, no policies
 * and no anon grants, so the service role is the only way in. This action only
 * ever INSERTs a row built from the Zod-validated input above — it reads nothing
 * back, so the elevated client exposes no data to the public caller.
 *
 * A repeat application from the same email or WhatsApp number is a success,
 * not an error: the
 * applicant is already in the queue, and telling them otherwise would also tell
 * a stranger which emails have applied.
 */
/** True when the site-wide cap is reached. Reads a count only — never row data. */
async function isFlooded(): Promise<boolean> {
  const since = new Date(Date.now() - FLOOD_CAP.windowMs).toISOString()
  const { count, error } = await adminClient
    .from('slay_invites')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', since)
  if (error) throw new Error(error.message)
  return (count ?? 0) >= FLOOD_CAP.max
}

async function saveSlayApplication(application: SlayApplication): Promise<void> {
  const { error } = await adminClient.from('slay_invites').insert({
    full_name: application.fullName,
    email: application.email,
    whatsapp: application.whatsapp,
    instagram: application.instagram,
    reason: application.reason,
  })
  if (error && error.code !== UNIQUE_VIOLATION) throw new Error(error.message)
}

// Failures are returned rather than thrown — Next.js masks thrown server-action
// messages in production, and these have to reach the applicant verbatim.
export async function submitSlayApplicationAction(
  _previous: SlayApplyState,
  formData: FormData,
): Promise<SlayApplyState> {
  // Pretend success, so a bot learns nothing about why it was ignored.
  if (formData.get(HONEYPOT_FIELD)) return { status: 'success' }

  const values: Record<SlayApplicationField, string> = {
    fullName: String(formData.get('fullName') ?? ''),
    email: String(formData.get('email') ?? ''),
    whatsapp: String(formData.get('whatsapp') ?? ''),
    instagram: String(formData.get('instagram') ?? ''),
    reason: String(formData.get('reason') ?? ''),
  }

  const limit = checkRateLimit(new Request('https://strideclub.in/join-slay', { headers: await headers() }), SLAY_APPLY_LIMIT)
  if (!limit.ok) {
    return {
      status: 'error',
      message: `Too many attempts. Please try again in ${Math.ceil(limit.retryAfterSeconds / 60)} minutes.`,
      fieldErrors: {},
      values,
    }
  }

  const parsed = slayApplicationSchema.safeParse(values)

  if (!parsed.success) {
    const fieldErrors: Partial<Record<SlayApplicationField, string>> = {}
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as SlayApplicationField
      fieldErrors[field] ??= issue.message
    }
    return { status: 'error', message: 'Please fix the highlighted fields.', fieldErrors, values }
  }

  try {
    if (await isFlooded()) {
      return {
        status: 'error',
        message: "We're getting a lot of applications right now. Please try again in a few minutes.",
        fieldErrors: {},
        values,
      }
    }
    await saveSlayApplication(parsed.data)
  } catch (err) {
    // The error only — never the application, which is personal data.
    console.error('[slay] saving application failed:', err instanceof Error ? err.message : 'unknown error')
    return { status: 'error', message: 'Something went wrong on our side. Please try again in a minute.', fieldErrors: {}, values }
  }

  return { status: 'success' }
}
