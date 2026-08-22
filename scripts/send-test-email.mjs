// Send ONE transactional email to a test address, rendered from the real
// template in src/lib/email/templates.ts, so a change can be checked in a live
// inbox rather than only in the browser preview.
//
// Run:  node --env-file=.env.local scripts/send-test-email.mjs <recipient> [template]
//
//   template: welcome | confirmation | selected | slay   (default: confirmation)
//
//   e.g. node --env-file=.env.local scripts/send-test-email.mjs you@example.com slay
//
// Needs: STRIDE_BREVO_API_KEY
//
// The subject is prefixed [TEST] so it can never be mistaken for a real send.
// For a browser-only check that costs nothing, use build-email-preview.mjs.
// For a real bulk send, use send-slay-runday-emails.mjs.

import { readFileSync, writeFileSync } from 'fs'
import { pathToFileURL } from 'url'
import { join } from 'path'
import { tmpdir } from 'os'
import ts from 'typescript'

const TO = process.argv[2]
const TEMPLATE = process.argv[3] ?? 'confirmation'

// No default recipient: the address is the one thing worth being explicit
// about, and a baked-in default is how a stray run emails the wrong person.
if (!TO || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(TO)) {
  console.error('Usage: node --env-file=.env.local scripts/send-test-email.mjs <recipient> [welcome|confirmation|selected|slay]')
  process.exit(1)
}

const API_KEY = process.env.STRIDE_BREVO_API_KEY
if (!API_KEY) {
  console.error('Missing STRIDE_BREVO_API_KEY')
  process.exit(1)
}

// templates.ts has no imports on purpose, so a standalone transpile is exact.
const tmp = join(tmpdir(), 'stride-templates-test.mjs')
writeFileSync(tmp, ts.transpileModule(readFileSync('src/lib/email/templates.ts', 'utf8'), {
  compilerOptions: { module: 'ESNext', target: 'ES2020' },
}).outputText)
const {
  welcomeEmail, registrationConfirmedEmail, selectedForEventEmail, slayReportingTimeEmail,
} = await import(pathToFileURL(tmp).href)

const SITE = 'https://www.strideclub.in'
const STORAGE = 'https://ienotcjldormdxrzukpk.supabase.co/storage/v1/object/public/stride-assets'

// Synthetic sample data — never a real member's details.
const ticket = {
  fullName: 'Asha Rao',
  eventName: 'Stride Sunday Long Run — Cubbon Park',
  eventDate: '2026-09-06T06:00:00+05:30',
  location: 'Cubbon Park, Bengaluru',
  locationUrl: 'https://maps.google.com/?q=Cubbon+Park+Bengaluru',
  routeUrl: 'https://www.strava.com/routes/example',
  bannerUrl: `${STORAGE}/images/web-assets/email-posters/curl-rox.jpg`,
  runnerTag: 'A617',
  calendarUrl: 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=Stride',
  confirmationUrl: `${SITE}/events/sunday-long-run/confirmation/example`,
  amountPaidPaise: 59900, // exercises the paid Amount/Payment row
  paymentId: 'pay_ExampleId123',
  selectedPackages: [{ id: 'p1', name: 'Early Bird', amountPaise: 59900 }],
}

const BUILDERS = {
  welcome: () => welcomeEmail({ fullName: 'Asha Rao', username: 'asharao', siteUrl: SITE }),
  confirmation: () => registrationConfirmedEmail(ticket),
  selected: () => selectedForEventEmail(ticket),
  slay: () => slayReportingTimeEmail({
    fullName: 'Asha Rao',
    reportingTime: '12:15 pm',
    runName: 'Curl Rox',
    runDate: '2026-08-23T07:30:00+00:00',
    location: 'HYFIT, HSR Layout',
    locationUrl: 'https://maps.app.goo.gl/example',
    posterUrl: `${STORAGE}/images/web-assets/email-posters/curl-rox.jpg`,
    whatsappUrl: 'https://chat.whatsapp.com/example',
    noteTitle: 'Raceday check',
    note: [
      '- Wear comfortable clothes and shoes.',
      '- No entry is permitted after 1:30 p.m.',
      '- Waves will start every 20 minutes from 1 p.m.',
      '- Take care of your belongings.',
    ].join('\n'),
  }),
}

const build = BUILDERS[TEMPLATE]
if (!build) {
  console.error(`Unknown template "${TEMPLATE}". Pick one of: ${Object.keys(BUILDERS).join(', ')}`)
  process.exit(1)
}

// Slay's mails come from its own display name; the rest are Stride. The address
// stays the Brevo-authenticated apex domain either way.
const sender = TEMPLATE === 'slay'
  ? { name: 'Slay Run Club', email: 'no-reply@strideclub.in' }
  : { name: 'Stride Run Club', email: 'no-reply@strideclub.in' }

const { subject, htmlContent } = build()

const res = await fetch('https://api.brevo.com/v3/smtp/email', {
  method: 'POST',
  headers: { accept: 'application/json', 'api-key': API_KEY, 'content-type': 'application/json' },
  body: JSON.stringify({
    sender,
    to: [{ email: TO, name: 'Asha Rao' }],
    subject: `[TEST] ${subject}`,
    htmlContent,
  }),
})

if (!res.ok) {
  console.error(`Brevo send failed (${res.status}): ${await res.text()}`)
  process.exit(1)
}

const body = await res.json().catch(() => ({}))
console.log(`✓ [TEST] "${TEMPLATE}" sent to ${TO} (messageId: ${body.messageId ?? '—'})`)
