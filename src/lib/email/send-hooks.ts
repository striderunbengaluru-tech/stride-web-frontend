import { adminClient } from '@/lib/supabase/admin'
import { sendEmail } from './brevo'
import { registrationConfirmedEmail, welcomeEmail } from './templates'
import { buildGoogleCalendarUrl, calendarDescription } from '@/lib/google-calendar'
import { PRODUCTION_SITE_URL } from '@/lib/site-url'

// Emails are read long after the deployment that sent them, and go to real
// inboxes — so every link uses the canonical origin rather than whichever
// environment happened to trigger the send.
const SITE_URL = PRODUCTION_SITE_URL

/**
 * Send the welcome email exactly once per user. The conditional UPDATE is an
 * atomic claim on `welcome_email_sent_at` — safe to call on every sign-in;
 * existing users are backfilled with a timestamp so only new users match.
 * Never throws.
 */
export async function sendWelcomeEmailOnce(userId: string): Promise<void> {
  try {
    const { data: claimed, error } = await adminClient
      .from('users')
      .update({ welcome_email_sent_at: new Date().toISOString() })
      .eq('id', userId)
      .is('welcome_email_sent_at', null)
      .select('email, full_name, username')

    if (error) {
      console.error('[Email] Welcome claim failed', error)
      return
    }

    const user = claimed?.[0] as { email: string | null; full_name: string | null; username: string } | undefined
    if (!user?.email) return

    const { subject, htmlContent } = welcomeEmail({
      fullName: user.full_name,
      username: user.username,
      siteUrl: SITE_URL,
    })
    await sendEmail({ to: user.email, toName: user.full_name, subject, htmlContent })
  } catch (err) {
    console.error('[Email] Welcome email failed', err)
  }
}

/**
 * Send the booking-confirmation email exactly once per registration. A paid
 * registration can be confirmed by both the verify-payment route and the
 * Razorpay webhook — the atomic claim on `confirmation_email_sent_at`
 * guarantees whichever runs second claims zero rows and no-ops.
 * Never throws.
 */
export async function sendConfirmationEmailOnce(registrationId: string): Promise<void> {
  try {
    const { data: claimed, error } = await adminClient
      .from('event_registrations')
      .update({ confirmation_email_sent_at: new Date().toISOString() })
      .eq('id', registrationId)
      .eq('status', 'CONFIRMED')
      .is('confirmation_email_sent_at', null)
      .select('id')

    if (error) {
      console.error('[Email] Confirmation claim failed', error)
      return
    }
    if (!claimed?.length) return

    const { data: reg } = await adminClient
      .from('event_registrations')
      .select('id, amount_paid_paise, razorpay_payment_id, users(email, full_name, runner_tag), events(name, slug, event_date, end_date, location, location_url, banner_images)')
      .eq('id', registrationId)
      .single()

    const user = reg?.users as unknown as { email: string | null; full_name: string | null; runner_tag: string | null } | null
    const event = reg?.events as unknown as {
      name: string
      slug: string
      event_date: string | null
      end_date: string | null
      location: string | null
      location_url: string | null
      banner_images: string | null
    } | null
    if (!user?.email || !event) return

    let bannerUrl: string | null = null
    try { bannerUrl = (JSON.parse(event.banner_images ?? '[]') as string[])[0] ?? null } catch { /* keep null */ }

    const calendarUrl = event.event_date
      ? buildGoogleCalendarUrl({
          eventName: event.name,
          startIso: event.event_date,
          endIso: event.end_date,
          location: event.location,
          description: calendarDescription({
            siteUrl: SITE_URL,
            eventSlug: event.slug,
            registrationId,
            runnerTag: user.runner_tag,
            location: event.location,
          }),
        })
      : null

    const { subject, htmlContent } = registrationConfirmedEmail({
      fullName: user.full_name,
      eventName: event.name,
      eventDate: event.event_date,
      location: event.location,
      locationUrl: event.location_url,
      bannerUrl,
      runnerTag: user.runner_tag,
      calendarUrl,
      confirmationUrl: `${SITE_URL}/events/${event.slug}/confirmation/${registrationId}`,
      amountPaidPaise: reg?.amount_paid_paise ?? null,
      paymentId: reg?.razorpay_payment_id ?? null,
    })
    await sendEmail({ to: user.email, toName: user.full_name, subject, htmlContent })
  } catch (err) {
    console.error('[Email] Confirmation email failed', err)
  }
}
