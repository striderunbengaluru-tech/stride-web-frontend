import type { SelectedPackage, AdditionalField, CustomResponses } from '@/types/event'

// Shapes for the admin Events tab's per-event registrations panel. Built
// server-side by loadEventRegistrations() and rendered by EventRegistrationsPanel.

export type EventSummary = {
  id: string
  name: string
  slug: string
  event_date: string | null
  price_paise: number
  /** Resolved server-side so a package event reads "From ₹X", not "Free". */
  price_label: string
  is_free: boolean
  capacity: number | null
  status: string
  total_registrations: number
  confirmed_count: number
  checked_in_count: number
  cancelled_count: number
  /** Invite-only applications awaiting a decision. Computed in JS — see below. */
  applied_count: number
  /** Applications turned down. */
  rejected_count: number
  /** Registering on this event is a free application an admin approves. */
  invite_only: boolean
  /** First banner image, falling back to cover_url. Null when neither is set. */
  banner_url: string | null
}

export type Attendee = {
  registration_id: string
  user_id: string
  full_name: string | null
  username: string | null
  runner_tag: string | null
  email: string | null
  status: string
  registered_at: string
  checked_in_at: string | null
  /** Packages bought, snapshotted at registration. Empty for non-package events. */
  packages: SelectedPackage[]
  amount_due_paise: number | null
  /**
   * The coupon this registration redeemed, snapshotted at the time. Null for the
   * overwhelming majority. `amount_due_paise` above is already the DISCOUNTED
   * figure, so the original total is amount_due_paise + discount_paise.
   */
  coupon_code: string | null
  coupon_percent: number | null
  discount_paise: number | null
  /** Answers to the event's custom questions, keyed by AdditionalField id. */
  custom_responses: CustomResponses
  // ── Profile columns, joined from `users` ──
  // Drives the tier badge, the contact line and the CSV export.
  avatar_url: string | null
  contact_number: string | null
  emergency_contact_number: string | null
  gender: string | null
  /**
   * Resolved server-side. Only the age reaches the browser — a date of birth is
   * a far stronger identifier than a year count, and nothing on this screen or
   * in the CSV needs it.
   */
  age: number | null
  location: string | null
  runs_completed: number
  role: string
}

export type EventWithAttendees = EventSummary & {
  attendees: Attendee[]
  /** Distinct package names across this event's attendees — drives the filter. */
  package_names: string[]
  /**
   * The event's custom questions, in the admin's authored order. Answers live
   * per attendee; the questions live here so a runner who skipped an optional
   * one still shows the question with a blank, and so the order is stable
   * across attendees rather than following JSON key order.
   */
  custom_fields: AdditionalField[]
}
