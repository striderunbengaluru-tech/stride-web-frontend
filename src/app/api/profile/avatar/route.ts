import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { user as userTable } from '@/lib/db/schema'

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await request.formData()
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
  }

  if (file.size > 3 * 1024 * 1024) {
    return NextResponse.json({ error: 'Image must be under 3MB' }, { status: 400 })
  }

  const blob = await put(`avatars/${session.user.id}`, file, { access: 'public' })

  await db
    .update(userTable)
    .set({ image: blob.url, updatedAt: new Date() })
    .where(eq(userTable.id, session.user.id))

  return NextResponse.json({ url: blob.url })
}
