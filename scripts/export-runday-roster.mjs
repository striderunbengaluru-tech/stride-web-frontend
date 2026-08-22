// Build the roster CSV for the run-day send from an event's confirmed
// registrations. Every content field lives in config.json, so the roster is
// just the address list — email + name, ready to send as-is.
//
// Run:  node --env-file=.env.local scripts/export-runday-roster.mjs <event-slug> [out.csv]
// Needs: NEXT_PUBLIC_SUPABASE_URL, STRIDE_SUPABASE_SERVICE_ROLE_KEY
//
// The output holds real member emails and names. Keep it out of git and delete
// it once the send is done.

import { writeFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

const SLUG = process.argv[2]
const OUT = process.argv[3] ?? `${SLUG}-roster.csv`

if (!SLUG) {
  console.error('Usage: node --env-file=.env.local scripts/export-runday-roster.mjs <event-slug> [out.csv]')
  process.exit(1)
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.STRIDE_SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or STRIDE_SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

const { data: event, error: eventError } = await supabase
  .from('events')
  .select('id, name')
  .eq('slug', SLUG)
  .single()

if (eventError || !event) {
  console.error(`No event with slug "${SLUG}"${eventError ? `: ${eventError.message}` : ''}`)
  process.exit(1)
}

// CONFIRMED only. PENDING is an abandoned checkout and CANCELLED has given the
// spot back — neither should be told to turn up.
const { data: regs, error: regError } = await supabase
  .from('event_registrations')
  .select('created_at, users(email, full_name)')
  .eq('event_id', event.id)
  .eq('status', 'CONFIRMED')
  .order('created_at', { ascending: true })

if (regError) {
  console.error(`Could not read registrations: ${regError.message}`)
  process.exit(1)
}

/** Quote only when the value could break the field. */
const cell = (v) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)

const seen = new Set()
const rows = []
let missingEmail = 0
for (const reg of regs ?? []) {
  const email = reg.users?.email?.trim().toLowerCase()
  if (!email) { missingEmail++; continue }
  if (seen.has(email)) continue
  seen.add(email)
  rows.push([email, reg.users?.full_name?.trim() ?? ''])
}

writeFileSync(OUT, ['email,name', ...rows.map(r => r.map(cell).join(','))].join('\n') + '\n')

console.log(`✓ ${event.name} — ${rows.length} confirmed runner(s) → ${OUT}`)
if (missingEmail) console.log(`  ${missingEmail} skipped (no email on the account)`)
console.log('\n  Dry-run the send:')
console.log(`    node --env-file=.env.local scripts/send-slay-runday-emails.mjs ${OUT} config.json`)
