import { NextResponse, type NextRequest } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { user as userTable } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

// After Google OAuth completes, Better Auth redirects here.
// We look up the username and forward the user to their profile.
export async function GET(request: NextRequest) {
  const origin = new URL(request.url).origin
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session?.user) {
    return NextResponse.redirect(`${origin}/login`)
  }

  const [profile] = await db
    .select({ username: userTable.username })
    .from(userTable)
    .where(eq(userTable.id, session.user.id))
    .limit(1)

  if (profile?.username) {
    return NextResponse.redirect(`${origin}/profile/${profile.username}`)
  }

  return NextResponse.redirect(`${origin}/`)
}
