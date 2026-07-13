'use client'

type SwitchProps = {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  /** Accessible name for the switch — required since the control is icon-only. */
  label: string
  id?: string
}

// Accessible on/off switch in the site's glass style. Native <button> gives
// Space/Enter keyboard toggling for free.
export function Switch({ checked, onCheckedChange, disabled, label, id }: SwitchProps) {
  return (
    <button
      type='button'
      role='switch'
      id={id}
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stride-yellow-accent disabled:opacity-50 disabled:cursor-not-allowed ${
        checked
          ? 'bg-stride-yellow-accent/80 border-stride-yellow-accent'
          : 'bg-white/10 border-white/15'
      }`}
    >
      <span
        aria-hidden='true'
        className={`inline-block h-4 w-4 rounded-full shadow transition-transform ${
          checked ? 'translate-x-6 bg-copy-black' : 'translate-x-1 bg-white'
        }`}
      />
    </button>
  )
}
