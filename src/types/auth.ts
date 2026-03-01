export const ROLES = {
  GUEST: 'GUEST',
  MEMBER: 'MEMBER',
  ADMIN: 'ADMIN',
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]
