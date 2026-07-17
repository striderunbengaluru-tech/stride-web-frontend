import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'

// At least one letter, only letters / spaces / ' . - (no digits), max 500.
const NAME_RE = /^(?=.*\p{L})[\p{L}\s'.-]+$/u
const httpUrl = z.string().url().refine(
  (v) => /^https?:\/\//i.test(v),
  'Must be a valid http(s) URL',
)

// Social links must be shareable profile URLs on the platform's own domain —
// rejects bare IDs/handles that happen to parse as URLs (e.g. "kushagra.g").
const socialUrl = (label: string, hosts: string[]) =>
  httpUrl.refine((v) => {
    try {
      const hostname = new URL(v).hostname.toLowerCase()
      return hosts.some(h => hostname === h || hostname.endsWith(`.${h}`))
    } catch {
      return false
    }
  }, `Must be a shareable ${label} profile link, not just an ID`)

const schema = z.object({
  name: z.string().trim().min(1).max(500).regex(NAME_RE, 'Name can only contain letters').optional(),
  bio: z.string().max(300).optional(),
  location: z.string().max(100).optional(),
  skills: z.array(z.string()).max(3).optional(),
  linkedinUrl: socialUrl('LinkedIn', ['linkedin.com']).optional().or(z.literal('')),
  instagramUrl: socialUrl('Instagram', ['instagram.com']).optional().or(z.literal('')),
  stravaUrl: socialUrl('Strava', ['strava.com', 'strava.app.link']).optional().or(z.literal('')),
  xUrl: socialUrl('X', ['x.com', 'twitter.com']).optional().or(z.literal('')),
  profilePublic: z.boolean().optional(),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { skills, linkedinUrl, instagramUrl, stravaUrl, xUrl, name, profilePublic, ...rest } = parsed.data

  await adminClient
    .from('users')
    .update({
      ...rest,
      full_name: name,
      profile_public: profilePublic,
      linkedin_url: linkedinUrl !== undefined ? (linkedinUrl || null) : undefined,
      instagram_url: instagramUrl !== undefined ? (instagramUrl || null) : undefined,
      strava_url: stravaUrl !== undefined ? (stravaUrl || null) : undefined,
      x_url: xUrl !== undefined ? (xUrl || null) : undefined,
      skills: skills !== undefined ? JSON.stringify(skills) : undefined,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  return NextResponse.json({ ok: true })
}
