// Who registered after getting the MAP Fitness Festival mail.
//
// Run:  node --env-file=.env.local scripts/map-festival-report.mjs [--csv]
// Needs: NEXT_PUBLIC_SUPABASE_URL, STRIDE_SUPABASE_SERVICE_ROLE_KEY
//
// Web Analytics can only ever tell you how many people arrived; it is cookieless
// and aggregate by design. This joins the send log to the registrations table
// instead, which is the one source that can name a person: if an address was
// mailed at T and that member's registration was created after T, the mail is
// the plausible cause.
//
// Read it as attribution, not proof. Someone who saw the poster on Instagram and
// happened to have been mailed lands in the same bucket. The unmailed control
// group at the bottom is what keeps the number honest.

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const LOG_PATH = join(REPO_ROOT, 'map-festival.sent.json')
const EVENT_SLUG = 'map-fitness-rave'
const WANT_CSV = process.argv.includes('--csv')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.STRIDE_SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or STRIDE_SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
if (!existsSync(LOG_PATH)) {
  console.error(`No send log at ${LOG_PATH} — nothing to report on.`)
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
const log = JSON.parse(readFileSync(LOG_PATH, 'utf8'))

const PAGE = 1000
async function fetchAll(table, columns) {
  const rows = []
  for (let i = 0; i < 50; i++) {
    const { data, error } = await supabase
      .from(table).select(columns).order('id', { ascending: true })
      .range(i * PAGE, i * PAGE + PAGE - 1)
    if (error) { console.error(`${table}: ${error.message}`); process.exit(1) }
    if (!data?.length) return rows
    rows.push(...data)
    if (data.length < PAGE) return rows
  }
  console.error(`${table} hit the page ceiling; the numbers would be wrong.`)
  process.exit(1)
}

const { data: event } = await supabase
  .from('events').select('id, name').eq('slug', EVENT_SLUG).single()

const users = await fetchAll('users', 'id, email, full_name')
const registrations = await fetchAll('event_registrations', 'id, user_id, event_id, status, created_at')

const userByEmail = new Map(users.map(u => [(u.email ?? '').toLowerCase(), u]))
const thisEvent = registrations.filter(r => r.event_id === event.id)
const regByUser = new Map(thisEvent.map(r => [r.user_id, r]))

const ist = iso => new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true,
}).format(new Date(iso))

const converted = []
const alreadyHad = []

for (const entry of log.sent) {
  const user = userByEmail.get(entry.email.toLowerCase())
  if (!user) continue
  const reg = regByUser.get(user.id)
  if (!reg) continue
  const after = new Date(reg.created_at) > new Date(entry.sentAt)
  const row = {
    name: user.full_name ?? '(no name)',
    email: entry.email,
    sentAt: entry.sentAt,
    registeredAt: reg.created_at,
    status: reg.status,
    hoursAfter: ((new Date(reg.created_at) - new Date(entry.sentAt)) / 36e5).toFixed(1),
  }
  ;(after ? converted : alreadyHad).push(row)
}

converted.sort((a, b) => new Date(a.registeredAt) - new Date(b.registeredAt))

const mailedIds = new Set(
  log.sent.map(e => userByEmail.get(e.email.toLowerCase())?.id).filter(Boolean)
)
const unmailedSince = thisEvent.filter(r =>
  !mailedIds.has(r.user_id) && new Date(r.created_at) > new Date(log.sent[0].sentAt)
)

const pct = (n, d) => d === 0 ? '0.0' : ((n / d) * 100).toFixed(1)

console.log(`Event    : ${event.name}`)
console.log(`Campaign : ${log.campaign}`)
console.log(`Mailed   : ${log.sent.length} members, ${ist(log.sent[0].sentAt)} to ${ist(log.sent[log.sent.length - 1].sentAt)}`)
console.log(`Now      : ${ist(new Date().toISOString())}`)
console.log('')
console.log(`Registered after being mailed : ${converted.length}  (${pct(converted.length, log.sent.length)}% of those mailed)`)
console.log(`Registered by someone not mailed, same window : ${unmailedSince.length}`)
if (alreadyHad.length) console.log(`Had registered before the mail : ${alreadyHad.length}`)
console.log(`Total registrations for the event : ${thisEvent.length}`)

if (converted.length) {
  console.log('\nWho, in the order they registered:')
  for (const c of converted) {
    console.log(`  ${c.name.padEnd(26)} ${c.email.padEnd(36)} ${ist(c.registeredAt)}  (+${c.hoursAfter}h)  ${c.status}`)
  }
} else {
  console.log('\nNobody who was mailed has registered yet.')
}

if (WANT_CSV && converted.length) {
  const cell = v => `"${String(v ?? '').replace(/"/g, '""')}"`
  const csv = [
    ['Name', 'Email', 'Mailed at (IST)', 'Registered at (IST)', 'Hours after mail', 'Status'],
    ...converted.map(c => [c.name, c.email, ist(c.sentAt), ist(c.registeredAt), c.hoursAfter, c.status]),
  ].map(r => r.map(cell).join(',')).join('\r\n')
  const out = join(REPO_ROOT, 'map-festival-conversions-send.csv')
  writeFileSync(out, '﻿' + csv, 'utf8')
  console.log(`\nCSV written to ${out}`)
}
