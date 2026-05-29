import { NextResponse } from 'next/server'
import sharp from 'sharp'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: adminUser } = await adminClient
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (adminUser?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const form = await request.formData()
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
  }

  if (file.size > 8 * 1024 * 1024) {
    return NextResponse.json({ error: 'Image must be under 8MB' }, { status: 400 })
  }

  const fileBuffer = await file.arrayBuffer()
  const webpBuffer = await sharp(Buffer.from(fileBuffer))
    .webp({ quality: 85 })
    .toBuffer()

  const rawName = (form.get('eventName') as string | null)?.trim() ?? ''
  const slug = rawName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')   // collapse non-alphanum runs to hyphens
    .replace(/^-|-$/g, '')          // trim leading/trailing hyphens
    .slice(0, 48)                   // keep it readable in the DB path
    || 'event'
  const suffix = Date.now().toString(36)  // base-36 timestamp — short and unique
  const path = `images/events/${slug}-${suffix}.webp`

  const { error: uploadError } = await adminClient.storage
    .from('stride-assets')
    .upload(path, webpBuffer, { contentType: 'image/webp', upsert: false })

  if (uploadError) {
    console.error('[Event image upload]', uploadError)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }

  const { data: { publicUrl } } = adminClient.storage.from('stride-assets').getPublicUrl(path)
  return NextResponse.json({ url: publicUrl })
}
