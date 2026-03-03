import { boolean, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

// ── Better Auth core tables ───────────────────────────────────────────────────
// Column names match Better Auth's expected camelCase identifiers exactly.

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').notNull(),
  image: text('image'),
  createdAt: timestamp('createdAt').notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
  // Custom profile fields — auto-populated via databaseHook on first sign-in
  username: text('username').unique(),
  bio: text('bio'),
  role: text('role').notNull().default('GUEST'),
  // Extended profile fields
  coverUrl: text('coverUrl'),
  location: text('location'),
  skills: text('skills'), // JSON-encoded string[]
  linkedinUrl: text('linkedinUrl'),
  instagramUrl: text('instagramUrl'),
  stravaUrl: text('stravaUrl'),
  prompts: text('prompts'), // JSON-encoded { question: string; answer: string }[]
  runsCompleted: integer('runsCompleted').notNull().default(0),
})

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expiresAt').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('createdAt').notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
})

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('createdAt').notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
})

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt'),
  updatedAt: timestamp('updatedAt'),
})

// ── App tables ────────────────────────────────────────────────────────────────

export const events = pgTable('events', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  subtitle: text('subtitle'),
  description: text('description'),
  details: text('details'), // Long markdown body
  location: text('location'),
  locationUrl: text('locationUrl'), // Google Maps URL
  stravaRouteUrl: text('stravaRouteUrl'),
  eventDate: timestamp('eventDate'),
  endDate: timestamp('endDate'),
  capacity: integer('capacity'),
  pricePaise: integer('pricePaise').notNull().default(0), // 0 = free
  status: text('status').notNull().default('DRAFT'), // DRAFT | PUBLISHED | CANCELLED
  coverUrl: text('coverUrl'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const products = pgTable('products', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  pricePaise: integer('pricePaise').notNull(),
  stock: integer('stock').notNull().default(0),
  status: text('status').notNull().default('DRAFT'),
  imageUrl: text('imageUrl'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const eventRegistrations = pgTable('event_registrations', {
  id: text('id').primaryKey(),
  eventId: text('eventId')
    .notNull()
    .references(() => events.id, { onDelete: 'cascade' }),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  status: text('status').notNull().default('PENDING'), // PENDING | CONFIRMED | CANCELLED
  cashfreeOrderId: text('cashfreeOrderId'),
  cashfreePaymentId: text('cashfreePaymentId'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})
