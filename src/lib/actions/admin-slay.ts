'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { adminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/actions/require-admin'
import { sendEmail } from '@/lib/email/brevo'
import { slayInviteApprovedEmail } from '@/lib/email/templates'

const ADMIN_SLAY_PATH = '/admin/slay'

/**
 * The Slay WhatsApp community invite link. An env var, not a constant: it is
 * only ever meant to reach approved applicants, so it stays out of the repo and
 * out of every client bundle.
 */
const WHATSAPP_URL_ENV = 'STRIDE_SLAY_WHATSAPP_URL'
const WHATSAPP_INVITE_PREFIX = 'https://chat.whatsapp.com/'

const inviteIdSchema = z.uuid()

export type SlayReviewResult = { ok: true } | { error: string }

/**
 * Approves a pending application and emails the WhatsApp community link.
 *
 * Claim, then send: the row moves PENDING → APPROVED in one conditional update,
 * so two admins clicking at once can't both send. If the email then fails, the
 * row goes back to PENDING and the admin is told — an APPROVED row must mean
 * the applicant actually has the link.
 */
export async function approveSlayInviteAction(inviteId: string): Promise<SlayReviewResult> {
  const { actorName } = await requireAdmin()

  const id = inviteIdSchema.safeParse(inviteId)
  if (!id.success) return { error: 'That application could not be found.' }

  const whatsappUrl = process.env[WHATSAPP_URL_ENV]?.trim()
  if (!whatsappUrl?.startsWith(WHATSAPP_INVITE_PREFIX)) {
    return { error: `The Slay WhatsApp invite link isn't configured. Set ${WHATSAPP_URL_ENV} in Vercel, then try again.` }
  }

  const { data: claimed, error: claimError } = await adminClient
    .from('slay_invites')
    .update({ status: 'APPROVED', reviewed_at: new Date().toISOString(), reviewed_by: actorName })
    .eq('id', id.data)
    .eq('status', 'PENDING')
    .select('full_name, email')
    .maybeSingle()

  if (claimError) {
    console.error('[slay] approve: claiming the application failed:', claimError.message)
    return { error: 'Could not approve right now. Please try again.' }
  }
  if (!claimed) return { error: 'This application has already been reviewed.' }

  const { subject, htmlContent } = slayInviteApprovedEmail({ fullName: claimed.full_name, whatsappUrl })
  const sent = await sendEmail({
    to: claimed.email,
    toName: claimed.full_name,
    subject,
    htmlContent,
    senderName: 'Slay Run Club',
  })

  if (!sent) {
    await adminClient
      .from('slay_invites')
      .update({ status: 'PENDING', reviewed_at: null, reviewed_by: null })
      .eq('id', id.data)
    return { error: 'The invite email could not be sent, so the application is still pending. Please try again.' }
  }

  revalidatePath(ADMIN_SLAY_PATH)
  return { ok: true }
}

/** Rejects a pending application. No email is sent. */
export async function rejectSlayInviteAction(inviteId: string): Promise<SlayReviewResult> {
  const { actorName } = await requireAdmin()

  const id = inviteIdSchema.safeParse(inviteId)
  if (!id.success) return { error: 'That application could not be found.' }

  const { data: updated, error } = await adminClient
    .from('slay_invites')
    .update({ status: 'REJECTED', reviewed_at: new Date().toISOString(), reviewed_by: actorName })
    .eq('id', id.data)
    .eq('status', 'PENDING')
    .select('id')
    .maybeSingle()

  if (error) {
    console.error('[slay] reject failed:', error.message)
    return { error: 'Could not reject right now. Please try again.' }
  }
  if (!updated) return { error: 'This application has already been reviewed.' }

  revalidatePath(ADMIN_SLAY_PATH)
  return { ok: true }
}
