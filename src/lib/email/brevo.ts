const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email'

// Sender domain must match the Brevo-authenticated domain (apex strideclub.in;
// mail.strideclub.in is Brevo's branding CNAME, not a valid sender domain).
const SENDER = { name: 'Stride Run Club', email: 'no-reply@strideclub.in' }

type SendEmailParams = {
  to: string
  toName?: string | null
  subject: string
  htmlContent: string
  /** Display name only — the address must stay on the authenticated domain. */
  senderName?: string
}

/**
 * Send a transactional email via Brevo. Never throws — email failure must
 * never break signup or registration. When STRIDE_BREVO_API_KEY is unset
 * (e.g. local dev without the key) this is a logged no-op.
 *
 * Resolves true only when Brevo accepted the message, for the callers that must
 * not record a send that never happened (the Slay approval). Everyone else can
 * keep ignoring the result.
 */
export async function sendEmail({ to, toName, subject, htmlContent, senderName }: SendEmailParams): Promise<boolean> {
  const apiKey = process.env.STRIDE_BREVO_API_KEY
  if (!apiKey) {
    console.warn('[Brevo] STRIDE_BREVO_API_KEY not set — skipping email send')
    return false
  }

  try {
    const res = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: senderName ? { ...SENDER, name: senderName } : SENDER,
        to: [toName ? { email: to, name: toName } : { email: to }],
        subject,
        htmlContent,
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      console.error(`[Brevo] Send failed (${res.status}) to ${to}: ${body}`)
      return false
    }
    return true
  } catch (err) {
    console.error(`[Brevo] Send failed to ${to}`, err)
    return false
  }
}
