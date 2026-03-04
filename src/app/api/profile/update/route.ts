import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'

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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { skills, prompts, linkedinUrl, instagramUrl, stravaUrl, name, ...rest } = parsed.data

  await adminClient
    .from('users')
    .update({
      ...rest,
      full_name: name,
      linkedin_url: linkedinUrl !== undefined ? (linkedinUrl || null) : undefined,
      instagram_url: instagramUrl !== undefined ? (instagramUrl || null) : undefined,
      strava_url: stravaUrl !== undefined ? (stravaUrl || null) : undefined,
      skills: skills !== undefined ? JSON.stringify(skills) : undefined,
      prompts: prompts !== undefined ? JSON.stringify(prompts) : undefined,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  return NextResponse.json({ ok: true })
}
