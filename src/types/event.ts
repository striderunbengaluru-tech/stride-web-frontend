export type AdditionalFieldType = 'text' | 'number' | 'link' | 'mcq' | 'dropdown'

/**
 * Types whose answer must be one of a fixed list the admin defines:
 * `mcq` renders every option as a radio, `dropdown` puts them in a select.
 * Both validate the submitted answer against `options` server-side.
 */
export const CHOICE_FIELD_TYPES = ['mcq', 'dropdown'] as const

export function isChoiceFieldType(type: AdditionalFieldType): boolean {
  return (CHOICE_FIELD_TYPES as readonly string[]).includes(type)
}

/** Upper bound on choices per question — keeps the registration form usable. */
export const MAX_FIELD_OPTIONS = 20

export type AdditionalField = {
  id: string
  label: string
  type: AdditionalFieldType
  required: boolean
  placeholder?: string
  /** Allowed answers for the choice types. Absent on text/number/link. */
  options?: string[]
}

export type CustomResponses = Record<string, string | number>
