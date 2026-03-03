import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import * as schema from '@/lib/db/schema'

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },

  user: {
    additionalFields: {
      username: { type: 'string', required: false },
      bio: { type: 'string', required: false },
      role: { type: 'string', required: false, defaultValue: 'GUEST' },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 30,  // 30 days
    updateAge: 60 * 60 * 24,        // refresh session once per day
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60 * 24 * 30,
    },
  },

  databaseHooks: {
    user: {
      create: {
        // Auto-generate a unique username from the email local-part on first sign-in.
        // Mirrors the trigger that existed in the old Supabase setup.
        before: async (user) => {
          const base = user.email
            .split('@')[0]
            .replace(/[^a-z0-9]/gi, '_')
            .toLowerCase()
            .slice(0, 30)

          let username = base
          let attempt = 0
          while (true) {
            const [existing] = await db
              .select({ id: schema.user.id })
              .from(schema.user)
              .where(eq(schema.user.username, username))
              .limit(1)
            if (!existing) break
            username = `${base}_${++attempt}`
          }

          return { data: { ...user, username, role: 'GUEST' } }
        },
      },
    },
  },
})

export type Session = typeof auth.$Infer.Session
export type AuthUser = typeof auth.$Infer.Session.user
