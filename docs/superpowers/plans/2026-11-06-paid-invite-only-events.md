# Paid Invite-Only Events Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an invite-only event carry a fee. An approved runner sits in `AWAITING_PAYMENT`, gets a "pay to confirm" mail, pays on the event page, and only then becomes `CONFIRMED` and gets the normal participation mail.

**Architecture:** One new registration status, `AWAITING_PAYMENT`, which holds a seat. `approve_registrations` sends paid events there and snapshots the price into `amount_due_paise`. A new route, `POST /api/events/pay-approved`, creates the Razorpay order for that row. The existing verify-payment route and webhook confirm it through `confirm_registration`, which now accepts the new status.

**Tech Stack:** Next.js 16 App Router, TypeScript strict, Supabase Postgres (plpgsql functions run by hand in the SQL Editor), Razorpay, Brevo, Tailwind v4, Zod.

**Spec:** `docs/superpowers/specs/2026-11-06-paid-invite-only-events-design.md`

**Testing note:** this repo has no test runner, and adding one is a new dependency that needs approval. Each task is therefore verified with `npx tsc --noEmit`, `yarn lint <files>` and the manual checks listed. `yarn lint` already fails with about 14 errors on staging. Judge only the files you touched.

---

## File map

| File | Change |
|---|---|
| `supabase-migrations/2026-11-06-paid-invite-only.sql` | **Create.** Status check, email claim column, `approve_registrations`, `confirm_registration`, `register_for_event` seat predicate |
| `src/lib/events/invite-only.ts` | Add `AWAITING_PAYMENT` and `PAYMENT_DUE_LABEL`; fix the doc comment that says applications are always free |
| `src/lib/actions/admin.ts` | Approve: split free and paid outcomes and send the right mail. New `revokeApprovalsAction`. Seat count includes awaiting rows |
| `src/lib/email/templates.ts` | New `selectedPaymentDueEmail` |
| `src/lib/email/send-hooks.ts` | New `sendPaymentDueEmailOnce` |
| `src/app/api/events/pay-approved/route.ts` | **Create.** Razorpay order for an approved row |
| `src/app/api/events/verify-payment/route.ts` | Accept `AWAITING_PAYMENT` as a confirmable status |
| `src/app/api/events/[eventId]/viewer-state/route.ts` | New `awaiting_payment` state plus `amountDuePaise` |
| `src/components/events/registration-cta.tsx` | Pass the new state and amount through; status line |
| `src/components/events/register-button.tsx` | "Pay ₹X to confirm spot" branch |
| `src/components/events/pay-approved-modal.tsx` | **Create.** "Ready to pay" popup that opens Razorpay |
| `src/app/events/[slug]/confirmation/[regId]/page.tsx` | Redirect `AWAITING_PAYMENT` to the event page |
| `src/app/my-runs/page.tsx`, `src/components/profile/my-runs-client.tsx` | "Selected. Payment pending" chip; the row links to the event page |
| `src/types/admin-registrations.ts`, `src/lib/admin/event-registrations.ts`, `src/components/admin/event-registrations-panel.tsx` | Awaiting-payment count, pill, and per-row Revoke |

The webhook (`src/app/api/webhooks/razorpay/route.ts`) needs **no change**. It confirms any non-`CONFIRMED` row through `confirm_registration` and checks the captured amount against `amount_due_paise`.

---

### Task 1: SQL migration

**Files:**
- Create: `supabase-migrations/2026-11-06-paid-invite-only.sql`

- [ ] **Step 1: Check the live functions against the repo copies**

The repo's SQL has drifted from the live DB before. In the Supabase SQL Editor run:

```sql
select pg_get_functiondef('public.register_for_event(text, text, text, text, text, text, text, int, text, int, int)'::regprocedure);
select pg_get_functiondef('public.approve_registrations(text, text[], text)'::regprocedure);
select pg_get_functiondef('public.confirm_registration(text, text, int)'::regprocedure);
select pg_get_viewdef('public.admin_registrations_flat'::regclass, true);
select pg_get_viewdef('public.admin_event_summary'::regclass, true);
```

Expected: `register_for_event` matches `supabase-migrations/2026-08-26-event-coupons.sql` lines 98–293, `approve_registrations` matches `2026-08-06-invite-only-events.sql`, `confirm_registration` matches `2026-07-26-razorpay-payment-hardening.sql`, and neither view has a `where status` filter. **If any differs, stop and report the difference before continuing.**

- [ ] **Step 2: Write the migration header, status check and claim column**

Create `supabase-migrations/2026-11-06-paid-invite-only.sql`:

```sql
-- ─────────────────────────────────────────────────────────────────────────────
-- Paid invite-only events — run this whole file in the Supabase SQL Editor
-- BEFORE deploying the app code. Idempotent: safe to re-run.
--
-- What it does:
--   1. Widens event_registrations.status with AWAITING_PAYMENT.
--   2. Adds payment_due_email_sent_at, the once-only claim for the
--      "selected, pay to confirm" mail.
--   3. approve_registrations: a paid event's approval lands on AWAITING_PAYMENT
--      with the price snapshotted into amount_due_paise. A free one confirms,
--      exactly as before.
--   4. confirm_registration: also confirms AWAITING_PAYMENT rows. Their seat is
--      already held, so they skip the capacity check.
--   5. register_for_event: AWAITING_PAYMENT rows hold a seat.
--
-- AWAITING_PAYMENT holds a seat indefinitely. There is no expiry: an admin
-- revokes an unpaid approval by hand (revokeApprovalsAction), which moves the
-- row back to APPLIED.
-- ─────────────────────────────────────────────────────────────────────────────

-- ═══ 1 ── status check ═══════════════════════════════════════════════════════
-- Named by 2026-08-06-invite-only-events.sql, so it can be dropped by name.
alter table public.event_registrations drop constraint if exists event_registrations_status_check;
alter table public.event_registrations
  add constraint event_registrations_status_check
  check (status in ('PENDING', 'CONFIRMED', 'CANCELLED', 'APPLIED', 'REJECTED', 'AWAITING_PAYMENT'));

-- ═══ 2 ── payment-due mail claim ═════════════════════════════════════════════
-- Same pattern as confirmation_email_sent_at: a conditional UPDATE on a null
-- column is the atomic "send exactly once" guard.
alter table public.event_registrations add column if not exists payment_due_email_sent_at timestamptz;
```

- [ ] **Step 3: Append `approve_registrations`**

Append this to the same file. Compared with the 2026-08-06 version, the changes are: `price_paise` is read under the lock, the seat count includes `AWAITING_PAYMENT`, the `UPDATE` branches on price, and there is a new `APPROVED_PAYMENT_DUE` outcome.

```sql
-- ═══ 3 ── approve_registrations ══════════════════════════════════════════════
-- Lock ordering vs confirm_registration is still safe: this function only ever
-- updates status='APPLIED' rows, and confirm_registration only takes the event
-- lock on its PENDING path. The AWAITING_PAYMENT path locks the registration
-- row alone. Do not relax `and er.status = 'APPLIED'` below.
--
-- Returns one row per requested id:
--   'APPROVED' (free, now CONFIRMED) | 'APPROVED_PAYMENT_DUE' (paid, now
--   AWAITING_PAYMENT) | 'ALREADY_CONFIRMED' | 'NOT_APPLIED' | 'CAPACITY_FULL'
--   | 'NOT_FOUND' | 'EVENT_NOT_FOUND' | 'EVENT_NOT_PUBLISHED' | 'EVENT_CONCLUDED'
create or replace function public.approve_registrations(
  p_event_id         text,
  p_registration_ids text[],
  p_decided_by       text
)
returns table (registration_id text, outcome text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_capacity  int;
  v_status    text;
  v_ends_at   timestamptz;
  v_price     int;
  v_held      int;
  v_remaining int;
  v_blocked   text;
begin
  if p_registration_ids is null or array_length(p_registration_ids, 1) is null then
    return;
  end if;

  select e.capacity, e.status, coalesce(e.end_date, e.event_date), coalesce(e.price_paise, 0)
    into v_capacity, v_status, v_ends_at, v_price
  from public.events e
  where e.id = p_event_id
  for update;

  if not found then
    return query select unnest(p_registration_ids), 'EVENT_NOT_FOUND'::text;
    return;
  end if;

  v_blocked := case
    when v_status <> 'PUBLISHED' then 'EVENT_NOT_PUBLISHED'
    when v_ends_at is not null and v_ends_at < now() - interval '24 hours' then 'EVENT_CONCLUDED'
  end;

  if v_blocked is not null then
    return query select unnest(p_registration_ids), v_blocked;
    return;
  end if;

  -- An unpaid approval holds its seat, so it counts against the budget exactly
  -- like a confirmed one.
  select count(*) into v_held
  from public.event_registrations
  where event_id = p_event_id and status in ('CONFIRMED', 'AWAITING_PAYMENT');

  v_remaining := case when v_capacity is null then null
                      else greatest(v_capacity - v_held, 0) end;

  return query
  with wanted as (
    select er.id, er.status, er.created_at
    from public.event_registrations er
    where er.event_id = p_event_id
      and er.id = any (p_registration_ids)
  ),
  ranked as (
    select id, row_number() over (order by created_at, id) as rn
    from wanted
    where status = 'APPLIED'
  ),
  -- Price is snapshotted here, under the event lock: a later edit to the
  -- event's price must not change what an approved runner was told to pay.
  promoted as (
    update public.event_registrations er
    set status           = case when v_price > 0 then 'AWAITING_PAYMENT' else 'CONFIRMED' end,
        amount_due_paise = v_price,
        decided_at       = now(),
        decided_by       = p_decided_by,
        updated_at       = now()
    from ranked r
    where er.id     = r.id
      and er.status = 'APPLIED'
      and (v_remaining is null or r.rn <= v_remaining)
    returning er.id
  )
  select q.id,
         (case
            when p.id is not null and v_price > 0 then 'APPROVED_PAYMENT_DUE'
            when p.id is not null                 then 'APPROVED'
            when w.id is null                     then 'NOT_FOUND'
            when w.status = 'CONFIRMED'           then 'ALREADY_CONFIRMED'
            when w.status <> 'APPLIED'            then 'NOT_APPLIED'
            else 'CAPACITY_FULL'
          end)::text
  from (select distinct unnest(p_registration_ids) as id) q
  left join wanted   w on w.id = q.id
  left join promoted p on p.id = q.id;
end;
$$;

revoke all    on function public.approve_registrations(text, text[], text) from public;
revoke all    on function public.approve_registrations(text, text[], text) from anon;
revoke all    on function public.approve_registrations(text, text[], text) from authenticated;
grant  execute on function public.approve_registrations(text, text[], text) to service_role;
```

- [ ] **Step 4: Append `confirm_registration`**

```sql
-- ═══ 4 ── confirm_registration ═══════════════════════════════════════════════
-- Still the single PENDING/AWAITING_PAYMENT → CONFIRMED transition, called by
-- both verify-payment and the Razorpay webhook. Still idempotent.
create or replace function public.confirm_registration(
  p_registration_id     text,
  p_razorpay_payment_id text,
  p_amount_paid_paise   int
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id  text;
  v_status    text;
  v_capacity  int;
  v_held      int;
begin
  select event_id, status into v_event_id, v_status
  from public.event_registrations
  where id = p_registration_id
  for update;

  if not found then
    return 'NOT_FOUND';
  end if;
  if v_status = 'CONFIRMED' then
    return 'ALREADY_CONFIRMED';
  end if;
  if v_status not in ('PENDING', 'AWAITING_PAYMENT') then
    return 'NOT_PENDING';
  end if;

  -- An approved runner's seat was reserved at approval, so there is nothing to
  -- re-check — and refusing here would strand money that was already taken.
  if v_status = 'PENDING' then
    select capacity into v_capacity
    from public.events
    where id = v_event_id
    for update;

    if v_capacity is not null then
      select count(*) into v_held
      from public.event_registrations
      where event_id = v_event_id and status in ('CONFIRMED', 'AWAITING_PAYMENT');

      if v_held >= v_capacity then
        return 'CAPACITY_FULL';
      end if;
    end if;
  end if;

  update public.event_registrations
  set status              = 'CONFIRMED',
      razorpay_payment_id = p_razorpay_payment_id,
      amount_paid_paise   = p_amount_paid_paise,
      updated_at          = now()
  where id = p_registration_id;

  return 'CONFIRMED';
end;
$$;

revoke all    on function public.confirm_registration(text, text, int) from public;
revoke all    on function public.confirm_registration(text, text, int) from anon;
revoke all    on function public.confirm_registration(text, text, int) from authenticated;
grant  execute on function public.confirm_registration(text, text, int) to service_role;
```

- [ ] **Step 5: Append `register_for_event`, generated from the latest version**

The function is about 190 lines. Generate it from the repo copy with only the two seat predicates changed:

```bash
python3 - <<'EOF'
import pathlib, re
src = pathlib.Path('supabase-migrations/2026-08-26-event-coupons.sql').read_text()
start = src.index('create or replace function public.register_for_event(')
end_marker = 'grant  execute on function public.register_for_event(text, text, text, text, text, text, text, int, text, int, int) to service_role;'
end = src.index(end_marker) + len(end_marker)
body = src[start:end]
body, n = re.subn(r"status = 'CONFIRMED'(\s+or \(status = 'PENDING')", r"status in ('CONFIRMED', 'AWAITING_PAYMENT')\1", body)
assert n == 2, n
header = (
    "\n-- ═══ 5 ── register_for_event: AWAITING_PAYMENT holds a seat ════════════════\n"
    "-- Copied verbatim from 2026-08-26-event-coupons.sql; the ONLY change is the two\n"
    "-- reserved-seat predicates, which now count AWAITING_PAYMENT. Signature unchanged.\n"
)
out = pathlib.Path('supabase-migrations/2026-11-06-paid-invite-only.sql')
out.write_text(out.read_text() + header + body + "\n")
print('ok', n)
EOF
```

Expected output: `ok 2`

- [ ] **Step 6: Review the generated file**

Run: `grep -n "AWAITING_PAYMENT" supabase-migrations/2026-11-06-paid-invite-only.sql`
Expected: hits in sections 1, 3, 4 and two in section 5.

- [ ] **Step 7: Commit (do NOT run it in the SQL Editor yet. That happens in Task 11)**

```bash
git add supabase-migrations/2026-11-06-paid-invite-only.sql
git commit -m "feat(db): AWAITING_PAYMENT status for paid invite-only approvals"
```

---

### Task 2: Shared vocabulary

**Files:**
- Modify: `src/lib/events/invite-only.ts`

- [ ] **Step 1: Add the status, the label and fix the free-only comment**

In the header comment, replace

```ts
 * publicly listed and carries a badge. What changes is that registering
 * becomes a free application an admin has to approve.
```

with

```ts
 * publicly listed and carries a badge. What changes is that registering
 * becomes a free application an admin has to approve. On a paid event the
 * approval lands on AWAITING_PAYMENT, and the runner pays to confirm.
```

Replace the `REGISTRATION_STATUSES` array with:

```ts
export const REGISTRATION_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'CANCELLED',
  'APPLIED',
  'REJECTED',
  'AWAITING_PAYMENT',
] as const
```

Below `export const REJECTED…` add:

```ts
/**
 * Approved on a paid invite-only event, not yet paid. Holds a seat until the
 * runner pays or an admin revokes the approval. Never clearable by the
 * register route.
 */
export const AWAITING_PAYMENT: RegistrationStatus = 'AWAITING_PAYMENT'
```

Below `export const NOT_SELECTED_LABEL…` add:

```ts
export const PAYMENT_DUE_LABEL = 'Selected. Payment pending'
```

Leave `VIEWABLE_REGISTRATION_STATUSES` and `CLEARABLE_REGISTRATION_STATUSES` unchanged. The confirmation page redirects this status itself (Task 9), and the register route must never delete an approved row.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/lib/events/invite-only.ts
git commit -m "feat(events): AWAITING_PAYMENT status vocabulary"
```

---

### Task 3: Payment-due email template

**Files:**
- Modify: `src/lib/email/templates.ts` (add after `selectedForEventEmail`, around line 520)

- [ ] **Step 1: Add the template**

Insert directly after the `selectedForEventEmail` function:

```ts
type PaymentDueEmailParams = {
  fullName: string | null
  eventName: string
  eventDate: string | null
  location: string | null
  locationUrl: string | null
  routeUrl: string | null
  bannerUrl: string | null
  amountDuePaise: number
  /** The event page, UTM-tagged. Where the Pay button lives. */
  payUrl: string
}

/**
 * A paid invite-only application was approved. Not a ticket: no Stride Tag, no
 * calendar button, no wallet pass. The spot only becomes a booking once the
 * runner pays, and the copy says so twice. No em dashes in runner copy.
 */
export function selectedPaymentDueEmail(params: PaymentDueEmailParams): EmailContent {
  const { fullName, eventName, eventDate, location, locationUrl, routeUrl, bannerUrl, amountDuePaise, payUrl } = params
  const event = escapeHtml(eventName)
  const amount = formatRupees(amountDuePaise)
  const ctaLabel = `Pay ${amount} to confirm spot`

  const posterRow = bannerUrl
    ? `
            <tr>
              <td class="pad" style="${PAPER_PAD}padding-bottom:28px;">
                <a href="${payUrl}" target="_blank" style="display:block;">
                  <img src="${bannerUrl}" alt="${event}" width="528" style="display:block;width:100%;max-width:528px;height:auto;border-radius:12px;">
                </a>
              </td>
            </tr>`
    : ''

  const whenRow = paperDetailRow(
    'When',
    eventDate
      ? `${escapeHtml(formatEventDayIST(eventDate))}${paperDetailSub(`${escapeHtml(formatEventTimeIST(eventDate))} IST`)}`
      : `<span style="color:${PAPER_MUTED};font-weight:400;">To be announced</span>`,
    true,
  )
  const whereRow = location
    ? paperDetailRow(
        'Where',
        `${escapeHtml(location)}${locationUrl ? paperDetailSub(paperLink(escapeHtml(locationUrl), 'Open in Maps')) : ''}`,
      )
    : ''
  const routeRow = routeUrl
    ? paperDetailRow('Route', paperLink(escapeHtml(routeUrl), 'View the run route'))
    : ''
  const amountRow = paperDetailRow('Amount due', amount)

  const sheet = `${paperMasthead()}
            <tr>
              <td class="pad" align="center" style="${PAPER_PAD}padding-bottom:20px;text-align:center;">
                <h1 class="h1" style="margin:0;font-family:${DISPLAY_FONT};font-weight:${DISPLAY_WEIGHT};font-size:38px;line-height:1.14;letter-spacing:0.02em;color:${PAPER_INK};text-align:center;">You&#39;re selected</h1>
                <p style="margin:10px 0 0;font-family:${PAPER_FONT};font-size:17px;line-height:1.5;color:${PAPER_BODY};text-align:center;">${event}</p>
              </td>
            </tr>
            <tr>
              <td class="pad" style="${PAPER_PAD}padding-bottom:24px;">
                <p style="margin:0 0 14px;font-family:${PAPER_FONT};font-size:16px;line-height:1.65;color:${PAPER_INK};font-weight:600;">Hey ${firstName(fullName)},</p>
                <p style="margin:0 0 14px;font-family:${PAPER_FONT};font-size:16px;line-height:1.68;color:${PAPER_BODY};">We loved your application and you have been shortlisted.</p>
                <p style="margin:0;font-family:${PAPER_FONT};font-size:16px;line-height:1.68;color:${PAPER_INK};font-weight:600;">Your spot is confirmed only after you pay ${amount}. Until then it is not a booking.</p>
              </td>
            </tr>
            ${posterRow}
            <tr>
              <td class="pad" style="${PAPER_PAD}padding-bottom:28px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${PAPER_INK};border-bottom:1px solid ${PAPER_RULE};">${whenRow}${whereRow}${routeRow}${amountRow}</table>
              </td>
            </tr>
            <tr>
              <td class="pad" style="${PAPER_PAD}padding-bottom:32px;">
                ${paperCta(payUrl, ctaLabel)}
                <p style="margin:14px 0 0;font-family:${PAPER_FONT};font-size:13px;line-height:1.55;color:${PAPER_MUTED};text-align:center;">Once your payment goes through, we will send your confirmation with your Stride Tag.</p>
              </td>
            </tr>
            ${paperFooter()}`

  return {
    subject: `You're selected. Complete payment to confirm your spot at ${eventName}`,
    htmlContent: paperDocument({
      title: `You're selected for ${eventName}`,
      preheader: `Pay ${amount} to confirm your spot at ${event}.`,
      sheet,
    }),
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no output. If `PAPER_MUTED`, `PAPER_RULE`, `DISPLAY_FONT` or `DISPLAY_WEIGHT` is reported missing, check their exact names with `grep -n "^const PAPER_\|^const DISPLAY_" src/lib/email/templates.ts` and use those. They are already used by `registrationConfirmedEmail`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/email/templates.ts
git commit -m "feat(email): selected, pay to confirm template"
```

---

### Task 4: Payment-due email sender

**Files:**
- Modify: `src/lib/email/send-hooks.ts`

- [ ] **Step 1: Import the template**

Change line 3 to:

```ts
import { registrationConfirmedEmail, selectedForEventEmail, selectedPaymentDueEmail, welcomeEmail } from './templates'
```

- [ ] **Step 2: Add the sender at the end of the file**

```ts
/** GA4 campaign tags on the pay link. Matches the scripts/ campaign mails. */
const PAYMENT_DUE_UTM = 'utm_source=brevo&utm_medium=email&utm_campaign=invite_payment_due'

/**
 * Send the "you're selected, pay to confirm" mail exactly once per approval.
 * The atomic claim on `payment_due_email_sent_at` makes a double-click on
 * Approve harmless.
 *
 * Deliberately NOT gated on `confirmation_email_enabled`. That switch exists to
 * save Brevo quota on big open runs; this mail is the only way an approved
 * runner learns they must act, so skipping it would strand their seat.
 *
 * Never throws.
 */
export async function sendPaymentDueEmailOnce(registrationId: string): Promise<void> {
  let claimedStamp = false

  try {
    const { data: claimed, error } = await adminClient
      .from('event_registrations')
      .update({ payment_due_email_sent_at: new Date().toISOString() })
      .eq('id', registrationId)
      .eq('status', 'AWAITING_PAYMENT')
      .is('payment_due_email_sent_at', null)
      .select('amount_due_paise, users(email, full_name), events(name, slug, event_date, location, location_url, strava_route_url, banner_images)')

    if (error) {
      console.error('[Email] Payment-due claim failed', error)
      return
    }
    const row = claimed?.[0]
    if (!row) return
    claimedStamp = true

    const user = row.users as unknown as { email: string | null; full_name: string | null } | null
    const event = row.events as unknown as {
      name: string
      slug: string
      event_date: string | null
      location: string | null
      location_url: string | null
      strava_route_url: string | null
      banner_images: string | null
    } | null
    if (!user?.email || !event || !row.amount_due_paise) return

    let bannerUrl: string | null = null
    try { bannerUrl = (JSON.parse(event.banner_images ?? '[]') as string[])[0] ?? null } catch { /* keep null */ }

    const { subject, htmlContent } = selectedPaymentDueEmail({
      fullName: user.full_name,
      eventName: event.name,
      eventDate: event.event_date,
      location: event.location,
      locationUrl: event.location_url,
      routeUrl: event.strava_route_url,
      bannerUrl,
      amountDuePaise: row.amount_due_paise,
      payUrl: `${SITE_URL}/events/${event.slug}?${PAYMENT_DUE_UTM}&utm_content=${encodeURIComponent(event.slug)}`,
    })
    await sendEmail({ to: user.email, toName: user.full_name, subject, htmlContent })
  } catch (err) {
    console.error('[Email] Payment-due email failed', err)
    if (claimedStamp) {
      await adminClient
        .from('event_registrations')
        .update({ payment_due_email_sent_at: null })
        .eq('id', registrationId)
        .not('payment_due_email_sent_at', 'is', null)
    }
  }
}
```

- [ ] **Step 3: Typecheck and commit**

Run: `npx tsc --noEmit` → no output.

```bash
git add src/lib/email/send-hooks.ts
git commit -m "feat(email): send the payment-due mail once per approval"
```

---

### Task 5: Admin actions (approve split and revoke)

**Files:**
- Modify: `src/lib/actions/admin.ts` (DecisionResult ~line 379, eventDecisionContext ~line 418, approveRegistrationsAction ~line 446, new action after rejectRegistrationsAction)

- [ ] **Step 1: Import the sender**

Find the existing `import { sendConfirmationEmailOnce } from '@/lib/email/send-hooks'` and change it to:

```ts
import { sendConfirmationEmailOnce, sendPaymentDueEmailOnce } from '@/lib/email/send-hooks'
```

- [ ] **Step 2: Extend `DecisionResult`**

Inside the `ok: true` branch, below `decided: string[]`, add:

```ts
      /** Subset of `decided` that is now AWAITING_PAYMENT (paid event). Approve only. */
      awaitingPayment: string[]
```

- [ ] **Step 3: Count held seats in `eventDecisionContext`**

Replace `.eq('status', 'CONFIRMED'),` inside `eventDecisionContext` with:

```ts
      .in('status', ['CONFIRMED', 'AWAITING_PAYMENT']),
```

- [ ] **Step 4: Split the approve outcome and the mail**

In `approveRegistrationsAction`, replace

```ts
  const approved = withOutcome('APPROVED')
```

with

```ts
  const approved = withOutcome('APPROVED')
  const awaitingPayment = withOutcome('APPROVED_PAYMENT_DUE')
```

Replace the whole `if (approved.length > 0) { after(…) }` block with:

```ts
  // Only ids THIS call promoted. Free approvals get the ticket ("selected")
  // mail; paid ones get the pay-to-confirm mail and their ticket after payment.
  // Chunked so a 50-row approve doesn't hammer Brevo at once.
  const sends: (() => Promise<void>)[] = [
    ...approved.map(id => () => sendConfirmationEmailOnce(id, 'selected')),
    ...awaitingPayment.map(id => () => sendPaymentDueEmailOnce(id)),
  ]
  if (sends.length > 0) {
    after(async () => {
      for (let i = 0; i < sends.length; i += 5) {
        await Promise.allSettled(sends.slice(i, i + 5).map(send => send()))
      }
    })
  }
```

Replace the returned object's first line `decided: approved,` with:

```ts
    decided: [...approved, ...awaitingPayment],
    awaitingPayment,
```

- [ ] **Step 5: Add `awaitingPayment: []` to the reject result**

In `rejectRegistrationsAction`'s returned object, below `decided: rejected,` add:

```ts
    awaitingPayment: [],
```

- [ ] **Step 6: Add `revokeApprovalsAction` after `rejectRegistrationsAction`**

```ts
/**
 * Take back an approval nobody paid for. AWAITING_PAYMENT → APPLIED, which
 * frees the seat and puts the runner back in the review queue, where the
 * existing Reject can turn them down.
 *
 * Compare-and-swap on status, same as reject: a runner who paid a moment ago
 * is CONFIRMED and is left alone. Clears the order id and the payment-due
 * claim, so a re-approval issues a fresh order and a fresh mail.
 */
export async function revokeApprovalsAction(eventId: string, ids: string[]): Promise<DecisionResult> {
  const pre = await decisionPreflight(eventId, ids)
  if (!pre.ok) return pre

  const now = new Date().toISOString()
  const { data, error } = await adminClient
    .from('event_registrations')
    .update({
      status: 'APPLIED',
      amount_due_paise: 0,
      razorpay_order_id: null,
      payment_due_email_sent_at: null,
      decided_at: now,
      decided_by: pre.actorName,
      updated_at: now,
    })
    .eq('event_id', eventId)
    .in('id', pre.ids)
    .eq('status', 'AWAITING_PAYMENT')
    .select('id')

  if (error) {
    console.error('[Admin] revoke approvals failed', error)
    return { ok: false, error: 'Could not revoke those approvals. Please try again.' }
  }

  const revoked = (data ?? []).map(r => r.id as string)
  const revokedSet = new Set(revoked)

  // A seat came free, so the public spots-left figure moved.
  updateTag(eventRegsTag(eventId))
  const context = await eventDecisionContext(eventId)
  if (context.slug) revalidatePath(`/events/${context.slug}`)
  revalidatePath('/admin/events')

  return {
    ok: true,
    decided: revoked,
    awaitingPayment: [],
    alreadyDecided: pre.ids.filter(id => !revokedSet.has(id)),
    skippedCapacity: [],
    capacity: context.capacity,
    confirmedAfter: context.confirmed,
  }
}
```

`amount_due_paise: 0` matches what `register_for_event` writes on an invite-only application.

- [ ] **Step 7: Typecheck and commit**

Run: `npx tsc --noEmit` → no output.

```bash
git add src/lib/actions/admin.ts
git commit -m "feat(admin): paid approvals await payment; revoke unpaid approvals"
```

---

### Task 6: `POST /api/events/pay-approved`

**Files:**
- Create: `src/app/api/events/pay-approved/route.ts`

- [ ] **Step 1: Write the route**

```ts
import { NextResponse } from 'next/server'
import { z } from 'zod'
import Razorpay from 'razorpay'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rate-limit'

/**
 * Start checkout for an invite-only approval on a paid event.
 *
 * The row is already AWAITING_PAYMENT with its price snapshotted at approval,
 * so this only creates a Razorpay order for that amount and links it. The
 * amount is read from the row, never from the request. Confirmation happens
 * in verify-payment / the webhook, through confirm_registration, exactly as
 * for an ordinary paid registration.
 *
 * Every click creates a fresh order. A stale order paid in an old tab is still
 * recovered: the receipt is the registration id, which is what the webhook's
 * receipt fallback looks up.
 */

const BodySchema = z.object({ registrationId: z.string().min(1).max(64) })

/** Checkout starts are cheap to retry and expensive to spam. */
const PAY_LIMIT = { limit: 10, windowMs: 60_000 }

/** Same grace the approve function and check-in use. */
const CONCLUDED_GRACE_MS = 24 * 60 * 60 * 1000

export async function POST(request: Request) {
  if (!checkRateLimit(request, PAY_LIMIT).ok) {
    return NextResponse.json({ error: 'Too many attempts. Please wait a minute and try again.' }, { status: 429 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = BodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  const { registrationId } = parsed.data

  const { data: reg } = await adminClient
    .from('event_registrations')
    .select('id, user_id, status, amount_due_paise, events(name, slug, event_date, end_date)')
    .eq('id', registrationId)
    .maybeSingle()

  // Someone else's id reads as missing, not forbidden: no existence oracle.
  if (!reg || reg.user_id !== user.id) {
    return NextResponse.json({ error: 'Registration not found' }, { status: 404 })
  }
  if (reg.status !== 'AWAITING_PAYMENT') {
    return NextResponse.json({ error: 'There is nothing to pay for this registration.' }, { status: 409 })
  }

  const event = reg.events as unknown as { name: string; slug: string; event_date: string | null; end_date: string | null } | null
  const endsAt = event?.end_date ?? event?.event_date
  if (endsAt && new Date(endsAt).getTime() < Date.now() - CONCLUDED_GRACE_MS) {
    return NextResponse.json({ error: 'This event has concluded.' }, { status: 409 })
  }

  const amount = reg.amount_due_paise ?? 0
  if (amount <= 0) {
    console.error('[pay-approved] AWAITING_PAYMENT row with no amount due', { registrationId })
    return NextResponse.json({ error: 'Could not start payment. Please contact support.' }, { status: 500 })
  }

  const razorpay = new Razorpay({
    key_id: process.env.STRIDE_RAZORPAY_KEY_ID ?? '',
    key_secret: process.env.STRIDE_RAZORPAY_KEY_SECRET ?? '',
  })

  let order
  try {
    order = await razorpay.orders.create({ amount, currency: 'INR', receipt: registrationId })
  } catch (err) {
    console.error('[pay-approved] Razorpay order creation failed', err)
    return NextResponse.json({ error: 'Payment initialisation failed' }, { status: 500 })
  }

  // Status stays AWAITING_PAYMENT; the compare-and-swap means a row revoked a
  // moment ago is not given an order.
  const { data: linked, error: linkError } = await adminClient
    .from('event_registrations')
    .update({ razorpay_order_id: order.id, updated_at: new Date().toISOString() })
    .eq('id', registrationId)
    .eq('status', 'AWAITING_PAYMENT')
    .select('id')

  if (linkError || !linked?.length) {
    if (linkError) console.error('[pay-approved] Failed to attach order id', linkError)
    return NextResponse.json({ error: 'Payment initialisation failed' }, { status: 409 })
  }

  return NextResponse.json({
    registrationId,
    slug: event?.slug ?? null,
    razorpayOrderId: order.id,
    amount,
    currency: 'INR',
    eventName: event?.name ?? null,
    userEmail: user.email ?? null,
  })
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit` → no output.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/events/pay-approved/route.ts
git commit -m "feat(api): pay-approved route starts checkout for approved runners"
```

---

### Task 7: verify-payment accepts approved rows

**Files:**
- Modify: `src/app/api/events/verify-payment/route.ts:38-40,65`

- [ ] **Step 1: Widen the status guard**

Replace

```ts
  if (registration.status !== 'PENDING') {
```

with

```ts
  // PENDING = an ordinary checkout; AWAITING_PAYMENT = an invite-only approval
  // being paid for. Both confirm through confirm_registration below.
  if (registration.status !== 'PENDING' && registration.status !== 'AWAITING_PAYMENT') {
```

and in the comment at lines 38–40 replace `and be PENDING.` with `and be PENDING or AWAITING_PAYMENT.`

- [ ] **Step 2: Typecheck and commit**

Run: `npx tsc --noEmit` → no output.

```bash
git add src/app/api/events/verify-payment/route.ts
git commit -m "feat(payments): verify-payment confirms paid invite-only approvals"
```

---

### Task 8: Viewer state and the event-page CTA

**Files:**
- Modify: `src/app/api/events/[eventId]/viewer-state/route.ts`
- Modify: `src/components/events/registration-cta.tsx`
- Modify: `src/components/events/register-button.tsx`
- Create: `src/components/events/pay-approved-modal.tsx`

- [ ] **Step 1: viewer-state returns the new state and the amount**

Change the registration select from `.select('id, status')` to `.select('id, status, amount_due_paise')`.

Replace the `viewerState` ternary and the `hasReceipt` block with:

```ts
  const status = reg?.status ?? null
  const viewerState =
    status === 'CONFIRMED' ? 'confirmed'
    : status === 'APPLIED' ? 'applied'
    : status === 'AWAITING_PAYMENT' ? 'awaiting_payment'
    : status === 'REJECTED' ? 'rejected'
    : 'none'

  // The id rides along for the receipt link (confirmed, applied) and for
  // starting checkout (awaiting_payment). A REJECTED runner is sent to the
  // event page instead.
  const exposesId = viewerState === 'confirmed' || viewerState === 'applied' || viewerState === 'awaiting_payment'
```

Replace the response body with:

```ts
    {
      isLoggedIn: true,
      viewerState,
      registrationId: exposesId ? reg!.id : null,
      amountDuePaise: viewerState === 'awaiting_payment' ? (reg!.amount_due_paise ?? null) : null,
      initial,
    },
```

and the anonymous response body with:

```ts
      { isLoggedIn: false, viewerState: 'none', registrationId: null, amountDuePaise: null, initial: EMPTY_INITIAL },
```

- [ ] **Step 2: registration-cta passes it through**

In `src/components/events/registration-cta.tsx`:

Replace `export type ViewerState = 'none' | 'applied' | 'confirmed' | 'rejected'` with:

```ts
export type ViewerState = 'none' | 'applied' | 'awaiting_payment' | 'confirmed' | 'rejected'
```

In `ViewerPayload`, below `registrationId: string | null`, add:

```ts
  /** Locked at approval. Set only for `awaiting_payment`. */
  amountDuePaise: number | null
```

In `ANONYMOUS`, below `registrationId: null,` add `amountDuePaise: null,`.

In `statusText`, below the `applied` line add:

```ts
  if (opts.viewerState === 'awaiting_payment') return "You're selected. Pay to confirm your spot."
```

In BOTH `<RegisterButton …/>` usages (desktop and mobile), below `registrationId={viewer.registrationId}` add:

```tsx
        amountDuePaise={viewer.amountDuePaise}
```

- [ ] **Step 3: Create the pay modal**

Create `src/components/events/pay-approved-modal.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import Script from 'next/script'
import { toast } from 'sonner'
import { formatRupees } from '@/lib/utils/money'
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock'

type Props = {
  open: boolean
  onClose: () => void
  registrationId: string
  amountDuePaise: number
  razorpayKeyId?: string
}

type PayResponse = {
  registrationId: string
  slug: string | null
  razorpayOrderId: string
  amount: number
  currency: string
  eventName: string | null
  userEmail: string | null
  error?: string
}

/**
 * "Ready to pay" confirmation for an approved invite-only runner. One sentence
 * of stakes, the amount, one button. Uses the window.Razorpay global declared
 * in participant-details-modal.tsx.
 */
export function PayApprovedModal({ open, onClose, registrationId, amountDuePaise, razorpayKeyId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  useBodyScrollLock(open)

  if (!open) return null

  const amount = formatRupees(amountDuePaise)

  function fail(message: string) {
    toast.error(message)
    setLoading(false)
  }

  async function pay() {
    setLoading(true)
    try {
      const res = await fetch('/api/events/pay-approved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationId }),
      })
      const data = (await res.json()) as PayResponse
      if (!res.ok) return fail(data.error ?? 'Could not start payment. Please try again.')

      const rzp = new window.Razorpay({
        key: razorpayKeyId ?? '',
        amount: data.amount,
        currency: data.currency,
        name: 'Stride Run Club',
        description: data.eventName ?? 'Event Registration',
        order_id: data.razorpayOrderId,
        handler: async (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
          setLoading(true)
          try {
            const verifyRes = await fetch('/api/events/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...response, registrationId }),
            })
            const verifyData = (await verifyRes.json()) as { success?: boolean; error?: string }
            if (verifyRes.ok && verifyData.success) {
              router.push(`/events/${data.slug}/confirmation/${registrationId}`)
            } else {
              fail(verifyData.error ?? 'Payment verification failed. Please contact support.')
            }
          } catch {
            fail('Verification error. Please contact support.')
          }
        },
        prefill: { email: data.userEmail ?? undefined },
        theme: { color: '#E1D03F' },
        modal: { ondismiss: () => setLoading(false) },
      })
      rzp.open()
    } catch {
      fail('Something went wrong. Please try again.')
    }
  }

  return createPortal(
    <>
      <Script src='https://checkout.razorpay.com/v1/checkout.js' strategy='lazyOnload' />
      <div
        className='fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-stride-purple-primary/80 backdrop-blur-xl px-4 pb-6 sm:pb-0'
        onClick={() => !loading && onClose()}
      >
        <div
          role='dialog'
          aria-modal='true'
          aria-labelledby='pay-approved-title'
          className='w-full max-w-sm bg-white/10 backdrop-blur-md border border-white/15 rounded-xl p-6'
          onClick={e => e.stopPropagation()}
        >
          <h2 id='pay-approved-title' className='text-white text-xl font-bold'>Ready to pay?</h2>
          <p className='text-white/70 text-sm mt-2 leading-relaxed'>
            You&apos;re selected. Your spot is confirmed only after payment.
          </p>
          <p className='text-white text-3xl font-bold font-mono mt-5'>{amount}</p>
          <button
            type='button'
            onClick={pay}
            disabled={loading}
            className='mt-6 w-full py-3.5 rounded-md bg-stride-yellow-accent text-copy-black font-bold text-sm min-h-11 hover:bg-stride-yellow-accent/90 transition-colors disabled:opacity-60'
          >
            {loading ? 'Opening payment…' : `Proceed to pay ${amount}`}
          </button>
          <button
            type='button'
            onClick={onClose}
            disabled={loading}
            className='mt-2 w-full py-3 rounded-md text-white/60 text-sm min-h-11 hover:text-white transition-colors'
          >
            Not now
          </button>
        </div>
      </div>
    </>,
    document.body,
  )
}
```

Before committing, check that `useBodyScrollLock` takes a boolean: `grep -n "export function useBodyScrollLock" -A3 src/hooks/use-body-scroll-lock.ts`. If its signature differs, call it the same way `participant-details-modal.tsx` does.

- [ ] **Step 4: RegisterButton renders the pay branch**

In `src/components/events/register-button.tsx`:

Add imports:

```ts
import { PayApprovedModal } from '@/components/events/pay-approved-modal'
import { formatRupees } from '@/lib/utils/money'
```

In `Props`, below `registrationId?: string | null` add:

```ts
  /** Locked at approval. Set only when viewerState is 'awaiting_payment'. */
  amountDuePaise?: number | null
```

Add `amountDuePaise,` to the destructured parameters, below `registrationId,`.

Add a second piece of state below the existing `modalOpen` state:

```ts
  const [payOpen, setPayOpen] = useState(false)
```

Insert this branch directly **after** the `if (isPast) { … }` block and **before** `if (isFull)`. An approved runner already holds a seat, so a full event must not hide their Pay button.

```tsx
  if (viewerState === 'awaiting_payment' && registrationId && amountDuePaise) {
    return (
      <>
        <button
          type='button'
          onClick={() => setPayOpen(true)}
          className='relative w-full py-3.5 rounded-md bg-stride-yellow-accent text-copy-black font-bold text-sm hover:bg-stride-yellow-accent/90 transition-colors min-h-11 overflow-hidden cta-shimmer'
        >
          <span className='relative z-10'>Pay {formatRupees(amountDuePaise)} to confirm spot</span>
        </button>
        <PayApprovedModal
          open={payOpen}
          onClose={() => setPayOpen(false)}
          registrationId={registrationId}
          amountDuePaise={amountDuePaise}
          razorpayKeyId={razorpayKeyId}
        />
      </>
    )
  }
```

Update `settled` (used for auto-open) to include the new state:

```ts
  const settled = viewerState === 'confirmed' || viewerState === 'applied' || viewerState === 'awaiting_payment'
```

- [ ] **Step 5: Typecheck and lint the touched files**

Run: `npx tsc --noEmit` → no output.
Run: `yarn lint src/components/events/register-button.tsx src/components/events/registration-cta.tsx src/components/events/pay-approved-modal.tsx 'src/app/api/events/[eventId]/viewer-state/route.ts'`
Expected: no new errors in these files.

- [ ] **Step 6: Commit**

```bash
git add src/components/events 'src/app/api/events/[eventId]/viewer-state/route.ts'
git commit -m "feat(events): Pay ₹X to confirm spot CTA and ready-to-pay popup"
```

---

### Task 9: Confirmation page and My Runs

**Files:**
- Modify: `src/app/events/[slug]/confirmation/[regId]/page.tsx:84-91`
- Modify: `src/app/my-runs/page.tsx`
- Modify: `src/components/profile/my-runs-client.tsx`

- [ ] **Step 1: The confirmation page redirects an unpaid approval to the event page**

Directly **before** the `if (!registration || registration.user_id !== userId …` block, insert:

```ts
  // An approval not yet paid for has no receipt. Its old "View my application"
  // link lands here, so send it to the event page where the Pay button is.
  if (registration?.user_id === userId && registration.status === 'AWAITING_PAYMENT') {
    const linked = Array.isArray(registration.events) ? registration.events[0] : registration.events
    if (linked?.slug) redirect(`/events/${linked.slug}`)
  }
```

`redirect` is already imported on line 2.

- [ ] **Step 2: My Runs maps the new status**

In `src/app/my-runs/page.tsx`, replace the `state` ternary with:

```ts
    const state: MyRun['state'] =
      r.status === 'REJECTED' ? 'rejected'
      : r.status === 'APPLIED' ? (isPastEvent ? 'rejected' : 'applied')
      : r.status === 'AWAITING_PAYMENT' ? (isPastEvent ? 'rejected' : 'payment_due')
      : 'active'
```

Replace `const UPCOMING_STATUSES = new Set(['CONFIRMED', 'PENDING', 'APPLIED'])` with:

```ts
  const UPCOMING_STATUSES = new Set(['CONFIRMED', 'PENDING', 'APPLIED', 'AWAITING_PAYMENT'])
```

`confirmationRegId` stays `CONFIRMED || APPLIED` only, so an unpaid row links to the event page, where the Pay button is.

- [ ] **Step 3: My Runs chip**

In `src/components/profile/my-runs-client.tsx`:

Change the import to:

```ts
import { AWAITING_LABEL, NOT_SELECTED_LABEL, PAYMENT_DUE_LABEL } from '@/lib/events/invite-only'
```

Change `CalendarDays, MapPin, CheckCircle2, ChevronRight, Hourglass, X` to add `CreditCard`:

```ts
import { CalendarDays, MapPin, CheckCircle2, ChevronRight, Hourglass, X, CreditCard } from 'lucide-react'
```

Change the `state` type to:

```ts
  state: 'active' | 'applied' | 'payment_due' | 'rejected'
```

and add `` `payment_due` = selected on a paid run, not yet paid, `` to its doc comment.

In the chip ternary, insert a branch after the `run.state === 'applied' ? (…)` branch:

```tsx
                        ) : run.state === 'payment_due' ? (
                          <span className='inline-flex items-center gap-1 text-xs font-medium text-stride-yellow-accent bg-stride-yellow-accent/10 border border-stride-yellow-accent/30 rounded-md px-2 py-0.5'>
                            <CreditCard size={11} aria-hidden='true' /> {PAYMENT_DUE_LABEL}
                          </span>
```

- [ ] **Step 4: Typecheck and commit**

Run: `npx tsc --noEmit` → no output.

```bash
git add 'src/app/events/[slug]/confirmation/[regId]/page.tsx' src/app/my-runs/page.tsx src/components/profile/my-runs-client.tsx
git commit -m "feat(my-runs): Selected. Payment pending state; unpaid approvals open the event page"
```

---

### Task 10: Admin panel

**Files:**
- Modify: `src/types/admin-registrations.ts`
- Modify: `src/lib/admin/event-registrations.ts:~224`
- Modify: `src/components/admin/event-registrations-panel.tsx`

- [ ] **Step 1: Count**

In `src/types/admin-registrations.ts`, below `rejected_count: number`, add:

```ts
  /** Approved on a paid event, not yet paid. Holds a seat. */
  awaiting_payment_count: number
```

In `src/lib/admin/event-registrations.ts`, below the `rejected_count:` line add:

```ts
      awaiting_payment_count: attendees.filter(a => a.status === 'AWAITING_PAYMENT').length,
```

- [ ] **Step 2: Pill, label and stats**

In `src/components/admin/event-registrations-panel.tsx`:

Add to `STATUS_PILL`:

```ts
  AWAITING_PAYMENT: 'bg-sky-400/15 text-sky-300',
```

Below `STATUS_PILL`, add:

```ts
/** Display text where the raw status would read badly. */
const STATUS_TEXT: Record<string, string> = { AWAITING_PAYMENT: 'AWAITING PAYMENT' }
```

Replace `{a.status}` inside the status pill `<span>` with `{STATUS_TEXT[a.status] ?? a.status}`.

In `ApplicationStats`, replace

```ts
    ? Math.max(0, event.capacity - event.confirmed_count)
```

with

```ts
    ? Math.max(0, event.capacity - event.confirmed_count - event.awaiting_payment_count)
```

and replace the Total tile's hint with:

```ts
      hint: `Every application received: ${event.confirmed_count} accepted, ${event.awaiting_payment_count} awaiting payment, ${event.applied_count} awaiting review, ${event.rejected_count} rejected.`,
```

- [ ] **Step 3: Per-row Revoke**

Change the actions import to:

```ts
import { approveRegistrationsAction, rejectRegistrationsAction, revokeApprovalsAction } from '@/lib/actions/admin'
```

Below the `decisionPending` state, add:

```ts
  const [revokingId, setRevokingId] = useState<string | null>(null)

  async function revoke(registrationId: string) {
    setRevokingId(registrationId)
    try {
      const result = await revokeApprovalsAction(event.id, [registrationId])
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      if (result.decided.length === 0) {
        toast.error('Nothing to revoke. They may have just paid.')
        return
      }
      toast.success('Approval revoked. The runner is back in review and the seat is free.')
      router.refresh()
    } catch {
      toast.error('Could not revoke that approval. Please try again.')
    } finally {
      setRevokingId(null)
    }
  }
```

Directly after the status pill `</span>` (before the `{a.checked_in_at ? (` check-in block), insert:

```tsx
                      {a.status === 'AWAITING_PAYMENT' && (
                        <button
                          type='button'
                          onClick={e => { e.stopPropagation(); revoke(a.registration_id) }}
                          disabled={revokingId === a.registration_id}
                          className='block ml-auto mt-1 text-[11px] font-semibold text-red-300 hover:text-red-200 underline underline-offset-2 disabled:opacity-50 min-h-6'
                        >
                          {revokingId === a.registration_id ? 'Revoking…' : 'Revoke'}
                        </button>
                      )}
```

- [ ] **Step 4: Approve toast mentions payment mails**

In `decide()`, replace

```ts
        action === 'approve' ? 'Selection emails are on their way.' : null,
```

with

```ts
        action === 'approve' && result.awaitingPayment.length > 0
          ? `${result.awaitingPayment.length} must pay to confirm. Payment emails are on their way.`
          : action === 'approve' ? 'Selection emails are on their way.' : null,
```

- [ ] **Step 5: Typecheck, lint and commit**

Run: `npx tsc --noEmit` → no output.
Run: `yarn lint src/components/admin/event-registrations-panel.tsx src/lib/admin/event-registrations.ts` → no new errors.

```bash
git add src/types/admin-registrations.ts src/lib/admin/event-registrations.ts src/components/admin/event-registrations-panel.tsx
git commit -m "feat(admin): awaiting-payment pill, seat count and per-row revoke"
```

---

### Task 11: Run the migration and verify on staging

- [ ] **Step 1: Run the migration.** Paste `supabase-migrations/2026-11-06-paid-invite-only.sql` into the Supabase SQL Editor and run it. Staging and production share one DB, so this is live for both. It is backward-compatible with the current production code: production never sees `AWAITING_PAYMENT` until an admin approves on a paid invite-only event. **Get the user's go-ahead before running it.**

- [ ] **Step 2: Build.** Run `yarn build`. Expected: build succeeds.

- [ ] **Step 3: Push staging.** Run `git push origin staging` and wait for the Vercel preview.

- [ ] **Step 4: Manual run on https://staging.strideclub.in (Razorpay test keys)**

1. Admin: create a test event: invite-only on, price ₹10, capacity 2, confirmation email on, `is_test_event` on.
2. Runner A: apply. Admin: approve. Expected: the pill reads AWAITING PAYMENT, the toast says "1 must pay to confirm", and the seats-left tile drops by 1.
3. Runner A inbox: the "You're selected. Complete payment…" mail shows event details and the amount. The CTA URL ends `?utm_source=brevo&utm_medium=email&utm_campaign=invite_payment_due&utm_content=<slug>`.
4. Runner A on the event page: the button reads **Pay ₹10 to confirm spot** → popup → Proceed → pay with a Razorpay test card → lands on the ticket. The status is CONFIRMED and the participation confirmation mail arrives.
5. Runner B: apply, admin approves, then admin clicks **Revoke**. Expected: back to APPLIED and the seat freed.
6. Approve 3 runners on capacity 2. Expected: 1 skipped, "event is full".
7. A free invite-only event: approve. Expected: CONFIRMED immediately with the selected/ticket mail (unchanged).
8. My Runs for an unpaid approval: the chip reads "Selected. Payment pending" and the row opens the event page.

- [ ] **Step 5: Promote.** Only with the user's go-ahead: merge staging into main (`git checkout main && git merge --no-edit -m "Merge staging into main" staging && git push origin main && git checkout staging`).
