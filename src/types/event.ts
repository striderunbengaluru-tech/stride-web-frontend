export type AdditionalFieldType = 'text' | 'number' | 'link'

export type AdditionalField = {
  id: string
  label: string
  type: AdditionalFieldType
  required: boolean
  placeholder?: string
}

export type CustomResponses = Record<string, string | number>
