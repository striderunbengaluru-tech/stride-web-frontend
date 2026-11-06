# Paid invite-only events — design

**Date:** 2026-11-06
**Status:** Approved, pending implementation

## Problem

Invite-only events are assumed free. Applying is free, and an admin approval
moves the registration straight to `CONFIRMED`. Some invite-only events need a
fee. An approved runner must pay before their spot counts as confirmed.

## Decisions

| Question | Decision |
|---|---|
| Does an unpaid approval hold a seat? | **Yes.** Approvals count against capacity. |
| Payment deadline? | **None.** An admin revokes unpaid approvals by hand. |
| Amount charged | **`events.price_paise` at approval time**, snapshotted. No packages, no coupons. |
| Free invite-only events | **Unchanged.** Approval confirms immediately. |
| Representation | New status `AWAITING_PAYMENT` on the existing registration row. |

`PENDING` is not reused. It is a 15-minute checkout hold, and the cancel and
expiry paths treat it as abandonable. Reusing it would silently free approved
seats.

## Lifecycle

```
APPLIED ──approve, price = 0──▶ CONFIRMED                       (unchanged)
APPLIED ──approve, price > 0──▶ AWAITING_PAYMENT ──paid──▶ CONFIRMED
APPLIED ──reject──────────────▶ REJECTED                        (unchanged)
AWAITING_PAYMENT ──revoke─────▶ APPLIED
AWAITING_PAYMENT ──reject─────▶ REJECTED
```

A failed or abandoned payment leaves the row in `AWAITING_PAYMENT`, so the
runner can retry.

## 1. Database — `supabase-migrations/2026-11-06-paid-invite-only.sql`

Idempotent. Run it in the SQL Editor before deploying the app.

- Widen `event_registrations_status_check` with `AWAITING_PAYMENT`.
- `approve_registrations`: still capacity-capped under the event row lock.
  - If `price_paise > 0`, set status `AWAITING_PAYMENT`, `amount_due_paise = price_paise`,
    `decided_at` and `decided_by`. The outcome is `APPROVED_AWAITING_PAYMENT`.
  - Otherwise behave as today: `CONFIRMED`, outcome `APPROVED`.
- Reserved-seat predicate, used by both `register_for_event` and
  `approve_registrations`: `CONFIRMED` + `AWAITING_PAYMENT` + `PENDING` created
  within the last 15 minutes.
- `confirm_registration`: also accept `AWAITING_PAYMENT` → `CONFIRMED`. Skip the
  capacity check for that source status, because the seat is already held. It
  is still idempotent, and already `CONFIRMED` returns success.
- Check `pg_get_viewdef` for `admin_registrations_flat` and `admin_event_summary`.
  Neither filters on status today, but confirm before running.

## 2. Shared vocabulary — `src/lib/events/invite-only.ts`

- Add `AWAITING_PAYMENT` to `REGISTRATION_STATUSES` and `VIEWABLE_REGISTRATION_STATUSES`.
- **Do not** add it to `CLEARABLE_REGISTRATION_STATUSES`. The register route must
  never delete an approved row.
- Add the member-facing label `PAYMENT_DUE_LABEL = 'Selected — payment pending'`.

## 3. Runner flow

- **Viewer state:** `/api/events/[eventId]/viewer-state` returns a new
  `'awaiting_payment'` state plus `amountDuePaise`.
- **Event page CTA** (`register-button.tsx`, `registration-cta.tsx`): the button
  reads **Pay ₹X to confirm**. The status line reads "You're selected — pay to
  confirm your spot."
- **Popup:** a small modal showing the event name and the amount, with the note
  "Your spot is confirmed only after payment." Its **Proceed to pay** button
  opens Razorpay Checkout.
- **New route `POST /api/events/pay-approved`** (Zod body `{ registrationId }`):
  - session required (401); the row must belong to the caller (404 otherwise)
  - status must be `AWAITING_PAYMENT` (409 otherwise)
  - create a Razorpay order for `amount_due_paise`, read from the DB and never
    from the client
  - store `razorpay_order_id` on the row; the status stays `AWAITING_PAYMENT`
  - rate-limited like the register route
- **verify-payment and webhook:** accept a source status of `PENDING` **or**
  `AWAITING_PAYMENT`. Every existing check stays: the HMAC signature, the
  stored order-id match, a payment captured for exactly `amount_due_paise`,
  and order status `paid`. Confirmation still goes only through
  `confirm_registration`.
- **My Runs:** shows `PAYMENT_DUE_LABEL` and the same Pay CTA.
- **Confirmation page:** renders `AWAITING_PAYMENT` with the pay CTA and no ticket.

## 4. Admin

- `event-registrations-panel.tsx`: an "Awaiting payment" badge and filter.
- **New `revokeApprovalsAction(eventId, ids)`:** calls `requireEventManager()`
  and `canManageEventId()`, then runs a compare-and-swap
  `UPDATE … SET status='APPLIED' WHERE status='AWAITING_PAYMENT'`, clearing
  `amount_due_paise` and `razorpay_order_id`.
- `rejectRegistrationsAction`: also accepts `AWAITING_PAYMENT` as a source status.
- The approve toast reports confirmed and awaiting-payment counts separately.
- Check-in already requires `CONFIRMED`. No change.

## 5. Email

- New template `selectedPaymentDueEmail`:
  - subject: "You're selected — complete payment to confirm"
  - body: the amount, a clear statement that the spot is **not confirmed until
    payment**, and a CTA to the event page
  - no ticket, no wallet pass
- Sent once per row after approval, using a new claim column
  `payment_due_email_sent_at`, following the `*_email_sent_at` pattern.
- The existing ticket email (`'confirmed'` variant) goes out after payment
  through the normal confirmation hook.
- The `'selected'` variant stays for free invite-only events.

## Edge cases

- **Invite-only switched off:** `AWAITING_PAYMENT` rows keep their locked amount
  and can still pay.
- **Event price changed after approval:** the locked amount stands.
- **Revoked while checkout is open:** `confirm_registration` returns NOT_PENDING.
  The webhook already logs this for a manual refund (see orphaned-orders handling).
- **Event concluded:** `pay-approved` refuses with 409.

## Out of scope

Payment deadlines and auto-expiry, reminder emails, automated refunds, and
packages or coupons on invite-only events.

## Testing

- Unit: the status vocabulary sets, and the `pay-approved` route's Zod body and
  status guards.
- Manual on staging with Razorpay test keys: approve a paid event → email
  received → Pay → `CONFIRMED` plus ticket email. Revoke frees the seat.
  Capacity blocks over-approval. Free invite-only events are unchanged.
