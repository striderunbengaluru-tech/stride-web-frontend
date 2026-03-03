import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { user as userTable } from '@/lib/db/schema'

const schema = z.object({
  name: z.string().min(1).max(100).optional(),
  bio: z.string().max(300).optional(),
  location: z.string().max(100).optional(),
  skills: z.array(z.string()).max(12).optional(),
  linkedinUrl: z.string().url().optional().or(z.literal('')),
  instagramUrl: z.string().url().optional().or(z.literal('')),
  stravaUrl: z.string().url().optional().or(z.literal('')),
  prompts: z
    .array(z.object({ question: z.string(), answer: z.string().max(300) }))
    .max(5)
    .optional(),
})

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { skills, prompts, ...rest } = parsed.data

  await db
    .update(userTable)
    .set({
      ...rest,
      skills: skills !== undefined ? JSON.stringify(skills) : undefined,
      prompts: prompts !== undefined ? JSON.stringify(prompts) : undefined,
      updatedAt: new Date(),
    })
    .where(eq(userTable.id, session.user.id))

  return NextResponse.json({ ok: true })
}
