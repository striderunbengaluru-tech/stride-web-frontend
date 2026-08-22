// Bulk-send the Slay Run Club run-day email — one mail per row of a roster CSV,
// rendered from the real template in src/lib/email/templates.ts so what lands
// in the inbox is exactly what the app would send.
//
// ── RUNBOOK ─────────────────────────────────────────────────────────────────
//
// The three scripts that make up a send, in order:
//
//   1. scripts/prepare-event-poster.mjs <slug>
//        Converts the event's first banner from WebP to JPEG and uploads it.
//        Outlook on Windows cannot decode WebP, so this step is not optional
//        if you want a poster. Prints the "posterUrl" to paste into config.
//
//   2. scripts/export-runday-roster.mjs <slug> [out.csv]
//        Writes email + name for every CONFIRMED registration. Holds real
//        member data — keep it out of the repo and delete it after the send.
//
//   3. this script, three times: dry run, then --preview-to, then --send.
//
// ── USAGE ───────────────────────────────────────────────────────────────────
//
//   Dry run (default — validates and renders, sends nothing):
//     node --env-file=.env.local scripts/send-slay-runday-emails.mjs roster.csv config.json
//
//   One test mail to yourself, subject prefixed [PREVIEW]:
//     node --env-file=.env.local scripts/send-slay-runday-emails.mjs roster.csv config.json --preview-to=you@example.com
//
//   Send for real:
//     node --env-file=.env.local scripts/send-slay-runday-emails.mjs roster.csv config.json --send
//
// Needs: STRIDE_BREVO_API_KEY
//
// roster.csv — header row required. `email` is mandatory, `name` optional.
// Column order does not matter; extra columns are ignored. The name is used
// only for the greeting ("Hey Asha,") — the sole per-person element in the mail.
//
//     email,name
//     asha@example.com,Asha Rao
//     devi@example.com,Devi Menon
//
// config.json — every content field, identical for every recipient.
//
//     {
//       "runName": "Curl Rox",
//       "runDate": "2026-08-23T07:30:00+00:00",
//       "reportingTime": "12:15 pm",
//       "location": "HYFIT, HSR Layout",
//       "locationUrl": "https://maps.app.goo.gl/...",
//       "posterUrl": "https://....jpg",
//       "whatsappUrl": "https://chat.whatsapp.com/XXXXXXXX",
//       "noteTitle": "Raceday check",
//       "note": "- Wear comfortable clothes and shoes.\n- No entry after 1:30 pm."
//     }
//
// `note` splits on blank lines into paragraphs, and any paragraph whose every
// line starts with a dash becomes a real bulleted list.

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { pathToFileURL } from 'url'
import { join } from 'path'
import { tmpdir } from 'os'
import ts from 'typescript'

// Brevo's free tier allows 300 transactional sends a day across the whole
// account — the same budget the confirmation-email toggle exists to protect.
const DAILY_CAP = 300
// Brevo rate-limits bursts; ~4/s with a small gap is comfortably inside it.
const GAP_MS = 250

const SENDER = { name: 'Slay Run Club', email: 'no-reply@strideclub.in' }

const [rosterPath, configPath] = process.argv.slice(2).filter(a => !a.startsWith('--'))
const flags = process.argv.slice(2).filter(a => a.startsWith('--'))
const LIVE = flags.includes('--send')
const previewTo = flags.find(f => f.startsWith('--preview-to='))?.split('=')[1]

if (!rosterPath || !configPath) {
  console.error('Usage: node --env-file=.env.local scripts/send-slay-wave-emails.mjs <roster.csv> <config.json> [--send | --preview-to=addr]')
  process.exit(1)
}

const API_KEY = process.env.STRIDE_BREVO_API_KEY
if ((LIVE || previewTo) && !API_KEY) {
  console.error('Missing STRIDE_BREVO_API_KEY — cannot send.')
  process.exit(1)
}

// ── Render the real template ────────────────────────────────────────────────
// templates.ts has no imports on purpose, so a standalone transpile is exact.
// join(tmpdir()), not a URL — the repo path contains a space and URL.pathname
// hands back the percent-encoded form, which writeFileSync takes literally.
const tmp = join(tmpdir(), 'slay-templates.mjs')
writeFileSync(tmp, ts.transpileModule(readFileSync('src/lib/email/templates.ts', 'utf8'), {
  compilerOptions: { module: 'ESNext', target: 'ES2020' },
}).outputText)
const { slayReportingTimeEmail } = await import(pathToFileURL(tmp).href)

// ── Parse inputs ────────────────────────────────────────────────────────────
const config = JSON.parse(readFileSync(configPath, 'utf8'))
for (const required of ['reportingTime', 'location', 'whatsappUrl']) {
  if (!config[required]?.trim()) {
    console.error(`config.json is missing "${required}"`)
    process.exit(1)
  }
}

/** Minimal RFC-4180 CSV reader: handles quoted fields, escaped quotes, CRLF. */
function parseCsv(text) {
  const rows = []
  let row = [], field = '', inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ } else inQuotes = false
      } else field += c
    } else if (c === '"') inQuotes = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = '' }
    else if (c !== '\r') field += c
  }
  if (field || row.length) { row.push(field); rows.push(row) }
  return rows.filter(r => r.some(cell => cell.trim() !== ''))
}

const csv = parseCsv(readFileSync(rosterPath, 'utf8'))
const header = csv[0].map(h => h.trim().toLowerCase().replace(/\s+/g, '_'))
const col = (name) => header.indexOf(name)
const iEmail = col('email')
if (iEmail === -1) {
  console.error(`roster needs an "email" column — found: ${header.join(', ')}`)
  process.exit(1)
}
const iName = col('name')

const seen = new Set()
const rows = [], problems = []
csv.slice(1).forEach((cells, idx) => {
  const line = idx + 2
  const email = (cells[iEmail] ?? '').trim().toLowerCase()
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return problems.push(`line ${line}: bad email "${email}"`)
  if (seen.has(email)) return problems.push(`line ${line}: duplicate ${email} — skipped`)
  seen.add(email)
  rows.push({ email, fullName: (cells[iName] ?? '').trim() || null })
})

if (problems.length) {
  console.log(`\n⚠ ${problems.length} row problem(s):`)
  for (const p of problems) console.log(`   ${p}`)
}

if (rows.length === 0) { console.error('\nNo sendable rows.'); process.exit(1) }
if (rows.length > DAILY_CAP) {
  console.error(`\n${rows.length} recipients exceeds the ${DAILY_CAP}/day Brevo cap. Split the roster and send across days.`)
  process.exit(1)
}

const build = (row) => slayReportingTimeEmail({
  fullName: row.fullName,
  reportingTime: config.reportingTime,
  runName: config.runName ?? null,
  runDate: config.runDate ?? null,
  location: config.location,
  locationUrl: config.locationUrl ?? null,
  posterUrl: config.posterUrl ?? null,
  whatsappUrl: config.whatsappUrl,
  note: config.note ?? null,
  noteTitle: config.noteTitle ?? null,
})

// ── Resume log ──────────────────────────────────────────────────────────────
// A bulk send that dies at row 120 must not re-mail the first 119 on retry.
const LOG = `${rosterPath.replace(/\.csv$/i, '')}.sent.json`
const alreadySent = new Set(existsSync(LOG) ? JSON.parse(readFileSync(LOG, 'utf8')).sent ?? [] : [])
const sent = [...alreadySent], failed = []
const saveLog = () => writeFileSync(LOG, JSON.stringify({ sent, failed }, null, 2))

async function send(to, toName, subject, htmlContent) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { accept: 'application/json', 'api-key': API_KEY, 'content-type': 'application/json' },
    body: JSON.stringify({ sender: SENDER, to: [toName ? { email: to, name: toName } : { email: to }], subject, htmlContent }),
  })
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`)
}

// ── Preview: one mail, first row's data, your address ───────────────────────
if (previewTo) {
  const { subject, htmlContent } = build(rows[0])
  await send(previewTo, 'Preview', `[PREVIEW] ${subject}`, htmlContent)
  console.log(`\n✓ Preview sent to ${previewTo} — reporting time ${config.reportingTime}`)
  process.exit(0)
}

// ── Dry run ─────────────────────────────────────────────────────────────────
const pending = rows.filter(r => !alreadySent.has(r.email))
console.log(`\n${config.runName ?? 'Slay Run Club'} · ${rows.length} recipient(s)${alreadySent.size ? ` · ${alreadySent.size} already sent (skipping)` : ''}`)
console.log(`Subject preview: ${build(rows[0]).subject}\n`)

if (!LIVE) {
  for (const r of pending.slice(0, 10)) {
    console.log(`   ${r.email.padEnd(36)} ${r.fullName ?? '—'}`)
  }
  if (pending.length > 10) console.log(`   … and ${pending.length - 10} more`)
  const html = build(rows[0]).htmlContent
  const out = `${rosterPath.replace(/\.csv$/i, '')}.preview.html`
  writeFileSync(out, html)
  console.log(`\nDRY RUN — nothing sent. ${pending.length} would go out.`)
  console.log(`Rendered row 1 to ${out} — open it, then re-run with --send.`)
  process.exit(0)
}

// ── Live send ───────────────────────────────────────────────────────────────
console.log(`Sending ${pending.length}…\n`)
for (const [i, row] of pending.entries()) {
  const { subject, htmlContent } = build(row)
  try {
    await send(row.email, row.fullName, subject, htmlContent)
    sent.push(row.email)
    console.log(`  ✓ ${String(i + 1).padStart(3)}/${pending.length}  ${row.email}`)
  } catch (err) {
    failed.push({ email: row.email, error: String(err.message) })
    console.error(`  ✗ ${String(i + 1).padStart(3)}/${pending.length}  ${row.email} — ${err.message}`)
  }
  saveLog()
  if (i < pending.length - 1) await new Promise(r => setTimeout(r, GAP_MS))
}

console.log(`\nDone — ${sent.length - alreadySent.size} sent, ${failed.length} failed. Log: ${LOG}`)
if (failed.length) console.log('Re-run the same command to retry only the failures.')
