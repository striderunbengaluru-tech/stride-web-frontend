// Send the MAP Fitness Festival promo mail to the club, one batch at a time.
//
// Run:  node --env-file=.env.local scripts/send-map-festival-emails.mjs [--batch=200] [--send]
// Needs: STRIDE_BREVO_API_KEY, NEXT_PUBLIC_SUPABASE_URL, STRIDE_SUPABASE_SERVICE_ROLE_KEY
//
// Dry run unless --send is passed. Run it dry first, every time: the dry run
// prints exactly who the next batch would reach and how many are left after it.
//
// ── The no-duplicates guarantee ──
//
// Every address that has been sent to is recorded in map-festival.sent.json at
// the repo root (gitignored by the *.sent.json rule). The next batch is the
// highest-ranked eligible people whose address is NOT in that file, so running
// this tomorrow, and the day after, keeps walking down the list without ever
// repeating anyone.
//
// That file IS the guarantee, so this script treats it as precious:
//   - it refuses to send at all if the file cannot be written
//   - each success is appended and flushed to disk immediately, so a crash
//     halfway through a batch loses at most the person in flight
//   - a batch containing the same address twice is rejected before sending
//   - the log is never rewritten from scratch, only appended to
//
// Losing the file means the next run would mail everyone again. Keep it.
//
// ── Audience ──
//
// Every user except the ADMIN accounts and anyone already registered for this
// event (a "Register now" mail to someone holding a ticket reads as a mistake).
// Ranked most-engaged first: runs completed, then past registrations, then id as
// a stable tiebreaker so the ordering never shifts between runs.

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'
import { render, PAIRING_NAME } from './map-festival-email.mjs'

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const LOG_PATH = join(REPO_ROOT, 'map-festival.sent.json')

const CAMPAIGN = 'map-fitness-festival-2026-08'
const EVENT_SLUG = 'map-fitness-rave'
const SUBJECT = 'A run, three workouts, and a gym dance party. This Sunday.'
const SENDER = { name: 'Stride Run Club', email: 'no-reply@strideclub.in' }

// Brevo's free plan allows 300 sends a day across promo AND the transactional
// welcome/confirmation mail. A batch larger than this is almost certainly a typo.
const MAX_BATCH = 250
const PACE_MS = 300 // ~3/sec, comfortably inside Brevo's rate limit

const LIVE = process.argv.includes('--send')
const batchArg = process.argv.find(a => a.startsWith('--batch='))
const BATCH = batchArg ? Number(batchArg.split('=')[1]) : 200

if (!Number.isInteger(BATCH) || BATCH < 1 || BATCH > MAX_BATCH) {
  console.error(`--batch must be a whole number between 1 and ${MAX_BATCH} (got "${BATCH}")`)
  process.exit(1)
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.STRIDE_SUPABASE_SERVICE_ROLE_KEY
const BREVO_KEY = process.env.STRIDE_BREVO_API_KEY
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or STRIDE_SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
if (!BREVO_KEY) {
  console.error('Missing STRIDE_BREVO_API_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

// ── Send log ────────────────────────────────────────────────────────────────

function loadLog() {
  if (!existsSync(LOG_PATH)) return { campaign: CAMPAIGN, sent: [], failed: [] }
  const parsed = JSON.parse(readFileSync(LOG_PATH, 'utf8'))
  if (parsed.campaign !== CAMPAIGN) {
    console.error(`${LOG_PATH} belongs to campaign "${parsed.campaign}", not "${CAMPAIGN}".`)
    console.error('Refusing to touch it — move it aside if you really mean to start a new campaign.')
    process.exit(1)
  }
  return { campaign: parsed.campaign, sent: parsed.sent ?? [], failed: parsed.failed ?? [] }
}

// Written after every single send rather than once at the end: this file is the
// only thing standing between a crash and a duplicate mail tomorrow.
function saveLog(log) {
  writeFileSync(LOG_PATH, JSON.stringify(log, null, 2) + '\n', 'utf8')
}

const log = loadLog()

// Prove the log is writable BEFORE any mail goes out. A send we cannot record is
// worse than a send that does not happen.
try {
  saveLog(log)
} catch (err) {
  console.error(`Cannot write the send log at ${LOG_PATH}: ${err.message}`)
  console.error('Refusing to send — an unrecorded send is a duplicate tomorrow.')
  process.exit(1)
}

const alreadySent = new Set(log.sent.map(e => e.email.toLowerCase()))

// ── Audience ────────────────────────────────────────────────────────────────

// PostgREST stops an unpaged select at db.max_rows (1000) with no error, and the
// members table is past that, so both reads walk .range() windows.
const PAGE = 1000
async function fetchAll(table, columns) {
  const rows = []
  for (let i = 0; i < 50; i++) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .order('id', { ascending: true })
      .range(i * PAGE, i * PAGE + PAGE - 1)
    if (error) {
      console.error(`Reading ${table} failed at offset ${i * PAGE}: ${error.message}`)
      process.exit(1)
    }
    if (!data?.length) return rows
    rows.push(...data)
    if (data.length < PAGE) return rows
  }
  console.error(`Reading ${table} hit the page ceiling; refusing to send on a partial list.`)
  process.exit(1)
}

const { data: event, error: eventError } = await supabase
  .from('events').select('id, name').eq('slug', EVENT_SLUG).single()
if (eventError || !event) {
  console.error(`No event with slug "${EVENT_SLUG}"`)
  process.exit(1)
}

const users = await fetchAll('users', 'id, email, full_name, role, runs_completed')
const registrations = await fetchAll('event_registrations', 'id, user_id, event_id')

const registeredForThis = new Set(
  registrations.filter(r => r.event_id === event.id).map(r => r.user_id)
)
const pastRegistrations = new Map()
for (const r of registrations) {
  pastRegistrations.set(r.user_id, (pastRegistrations.get(r.user_id) ?? 0) + 1)
}

const VALID_EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

const eligible = users
  .filter(u => u.email && VALID_EMAIL.test(u.email))
  .filter(u => u.role !== 'ADMIN')
  .filter(u => !registeredForThis.has(u.id))
  // Most-engaged first. `id` last so the order is identical on every run, which
  // is what makes "the next 200" a well-defined thing.
  .sort((a, b) =>
    (b.runs_completed ?? 0) - (a.runs_completed ?? 0) ||
    (pastRegistrations.get(b.id) ?? 0) - (pastRegistrations.get(a.id) ?? 0) ||
    a.id.localeCompare(b.id)
  )

const remaining = eligible.filter(u => !alreadySent.has(u.email.toLowerCase()))
const batch = remaining.slice(0, BATCH)

// A duplicate inside one batch would slip past the log check entirely.
const batchAddresses = new Set(batch.map(u => u.email.toLowerCase()))
if (batchAddresses.size !== batch.length) {
  console.error('The same address appears twice in this batch. Refusing to send.')
  process.exit(1)
}

// ── Report ──────────────────────────────────────────────────────────────────

const firstName = u => (u.full_name ?? '').trim().split(/\s+/)[0] || 'there'

console.log(`Campaign : ${CAMPAIGN}`)
console.log(`Event    : ${event.name}`)
console.log(`Template : ${PAIRING_NAME}`)
console.log(`Subject  : ${SUBJECT}`)
console.log(`Sender   : ${SENDER.name} <${SENDER.email}>`)
console.log(`Log      : ${LOG_PATH}`)
console.log(`Mode     : ${LIVE ? 'LIVE SEND' : 'dry run'}`)
console.log('')
console.log(`Users            : ${users.length}`)
console.log(`  minus admins   : -${users.filter(u => u.role === 'ADMIN').length}`)
console.log(`  minus registered: -${registeredForThis.size}`)
console.log(`Eligible         : ${eligible.length}`)
console.log(`Already sent     : ${alreadySent.size}`)
console.log(`Still to reach   : ${remaining.length}`)
console.log(`This batch       : ${batch.length}`)
console.log(`Left after it    : ${remaining.length - batch.length}`)

if (batch.length === 0) {
  console.log('\nNothing left to send. Every eligible member has had this mail.')
  process.exit(0)
}

const runs = batch.map(u => u.runs_completed ?? 0)
console.log(`\nBatch engagement : ${runs.filter(r => r > 0).length} of ${batch.length} have completed a run (top ${Math.max(...runs)}, lowest ${Math.min(...runs)})`)
console.log('First three      : ' + batch.slice(0, 3).map(u => `${firstName(u)} (${u.runs_completed ?? 0} runs)`).join(', '))
console.log('Last three       : ' + batch.slice(-3).map(u => `${firstName(u)} (${u.runs_completed ?? 0} runs)`).join(', '))

if (!LIVE) {
  console.log('\nDry run — nothing sent. Re-run with --send to go.')
  process.exit(0)
}

// ── Send ────────────────────────────────────────────────────────────────────

console.log('')
let sent = 0
let failed = 0

for (const user of batch) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { accept: 'application/json', 'api-key': BREVO_KEY, 'content-type': 'application/json' },
    body: JSON.stringify({
      sender: SENDER,
      to: [{ email: user.email, name: user.full_name ?? undefined }],
      subject: SUBJECT,
      htmlContent: render(firstName(user)),
    }),
  }).catch(err => ({ ok: false, status: 0, _err: err.message }))

  if (res.ok) {
    const body = await res.json().catch(() => ({}))
    log.sent.push({
      email: user.email,
      name: user.full_name ?? null,
      sentAt: new Date().toISOString(),
      messageId: body.messageId ?? null,
    })
    saveLog(log) // flush now, not at the end
    sent++
    if (sent % 25 === 0) console.log(`  ${sent}/${batch.length} sent`)
  } else {
    const detail = res._err ?? await res.text?.().catch(() => '') ?? ''
    failed++
    log.failed.push({ email: user.email, at: new Date().toISOString(), status: res.status, detail: String(detail).slice(0, 300) })
    saveLog(log)
    console.error(`  FAILED ${user.email} — ${res.status} ${String(detail).slice(0, 200)}`)

    // A quota or credit refusal will reject every remaining message too. Stop
    // rather than burn through the rest of the batch logging failures.
    if (/credit|quota|limit|not enough/i.test(String(detail))) {
      console.error('\nBrevo is refusing on quota. Stopping here; the log records exactly who got through.')
      break
    }
  }

  await new Promise(r => setTimeout(r, PACE_MS))
}

console.log('')
console.log(`Sent    : ${sent}`)
console.log(`Failed  : ${failed}`)
console.log(`Recorded: ${log.sent.length} total for this campaign`)
console.log(`Left    : ${eligible.length - log.sent.length} eligible members still to reach`)
console.log(`\nLog written to ${LOG_PATH}`)
console.log('Keep that file. Without it the next run would mail everyone again.')
