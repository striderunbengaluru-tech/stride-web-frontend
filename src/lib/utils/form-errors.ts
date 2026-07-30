import { toast } from 'sonner'

/**
 * A validation failure that knows which control caused it, so the same object
 * can both raise a toast and put the offending field back in front of the user.
 *
 * `field` is the control's `name` attribute where one exists, and otherwise a
 * `data-field` key — checkbox rows, pill groups, the banner uploader and the
 * markdown editors are not focusable inputs but still need to be scrolled to.
 *
 * Client-only: sonner renders in the browser. Import from `'use client'`
 * components only.
 */
export type FieldError = { message: string; field?: string }

/**
 * Scrolls a form control into view and focuses it.
 *
 * Uses `block: 'center'` so the target lands mid-viewport rather than flush
 * under a sticky header — and so it works inside a scrollable modal body just
 * as well as on the page.
 */
export function focusField(field?: string): void {
  if (!field || typeof document === 'undefined') return

  const escaped = escapeAttr(field)
  // Both selectors at once, then the first VISIBLE match. Several fields post
  // through a hidden mirror input that carries the same `name` as the real
  // control (the markdown editors, the package list, the banner uploader) — a
  // display:none input can't be scrolled to, so it has to be skipped in favour
  // of the `data-field` anchor on the visible wrapper.
  const target = [
    ...document.querySelectorAll<HTMLElement>(`[name="${escaped}"], [data-field="${escaped}"]`),
  ].find(isVisible)

  if (!target) return

  target.scrollIntoView({ behavior: 'smooth', block: 'center' })

  // preventScroll: the smooth scroll above owns the movement — letting focus()
  // scroll too produces a jarring double jump.
  if (isFocusable(target)) {
    target.focus({ preventScroll: true })
    return
  }

  // A non-focusable wrapper (pill group, checkbox row, package card): focus the
  // first control inside it so keyboard users land somewhere useful.
  const inner = target.querySelector<HTMLElement>(
    'input:not([type="hidden"]), select, textarea, button, [tabindex]'
  )
  inner?.focus({ preventScroll: true })
}

/**
 * The single reporting path for every validation failure, client- or
 * server-side: a red toast that can't be missed, plus the field brought back
 * into view. Callers keep their own inline error state for the persistent
 * message under the input.
 */
export function reportFormError(err: FieldError): void {
  toast.error(err.message)
  focusField(err.field)
}

// Rendered and laid out. Covers input[type=hidden], display:none and anything
// inside a collapsed section — all of which scrollIntoView would no-op on.
function isVisible(el: HTMLElement): boolean {
  return el.getClientRects().length > 0
}

function isFocusable(el: HTMLElement): boolean {
  if (el.hasAttribute('disabled')) return false
  if (el.tabIndex >= 0) return true
  return ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON', 'A'].includes(el.tagName)
}

// Field keys are developer-authored, but they flow through querySelector, so a
// stray quote would throw rather than simply miss. CSS.escape isn't usable here
// because the value sits inside an attribute-value string, not a selector ident.
function escapeAttr(value: string): string {
  return value.replace(/["\\]/g, '\\$&')
}
