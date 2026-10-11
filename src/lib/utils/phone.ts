// Shared by the registration modal and its Zod schema. Kept out of
// @/lib/validations so the client modal doesn't pull zod into its bundle.
export const PHONE_DIGITS = 10

// Exactly 10 digits, digits only — no spaces, letters, country code or symbols.
export const PHONE_PATTERN = new RegExp(`^\\d{${PHONE_DIGITS}}$`)
