const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email'

// Sender domain must match the Brevo-authenticated domain (apex strideclub.in;
// mail.strideclub.in is Brevo's branding CNAME, not a valid sender domain).
const SENDER = { name: 'Stride Run Club', email: 'no-reply@strideclub.in' }

type SendEmailParams = {
  to: string
  toName?: string | null
  subject: string
  htmlContent: string
}

/**
 * Send a transactional email via Brevo. Never throws — email failure must
 * never break signup or registration. When STRIDE_BREVO_API_KEY is unset
 * (e.g. local dev without the key) this is a logged no-op.
 */
export async function sendEmail({ to, toName, subject, htmlContent }: SendEmailParams): Promise<void> {
  const apiKey = process.env.STRIDE_BREVO_API_KEY
  if (!apiKey) {
    console.warn('[Brevo] STRIDE_BREVO_API_KEY not set — skipping email send')
    return
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
        sender: SENDER,
        to: [toName ? { email: to, name: toName } : { email: to }],
        subject,
        htmlContent,
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      console.error(`[Brevo] Send failed (${res.status}) to ${to}: ${body}`)
    }
  } catch (err) {
    console.error(`[Brevo] Send failed to ${to}`, err)
  }
}
