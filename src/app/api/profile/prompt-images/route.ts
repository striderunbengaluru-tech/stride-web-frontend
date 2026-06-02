import { NextResponse } from 'next/server'
import sharp from 'sharp'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import type { PromptImage } from '@/types/user'

const MAX_IMAGES = 3
const BUCKET = 'stride-assets'

function parsePromptImages(raw: string | null | undefined): PromptImage[] {
  if (!raw) return []
  try { return JSON.parse(raw) as PromptImage[] } catch { return [] }
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await request.formData()
  const file = form.get('file') as File | null
  const prompt = (form.get('prompt') as string | null)?.trim()

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
  if (file.size > 8 * 1024 * 1024) return NextResponse.json({ error: 'Image must be under 8 MB' }, { status: 400 })
  if (!prompt) return NextResponse.json({ error: 'Please choose a prompt' }, { status: 400 })
  if (prompt.length > 80) return NextResponse.json({ error: 'Prompt is too long' }, { status: 400 })

  const { data: row } = await adminClient
    .from('users')
    .select('prompt_images')
    .eq('id', user.id)
    .single()

  const current = parsePromptImages((row as Record<string, string | null> | null)?.prompt_images)
  if (current.length >= MAX_IMAGES) {
    return NextResponse.json({ error: `Maximum ${MAX_IMAGES} prompt images allowed` }, { status: 400 })
  }

  const buf = await file.arrayBuffer()
  const webpBuffer = await sharp(Buffer.from(buf))
    .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer()

  const storagePath = `images/prompts/${user.id}/${Date.now()}.webp`

  const { error: uploadError } = await adminClient.storage
    .from(BUCKET)
    .upload(storagePath, webpBuffer, { contentType: 'image/webp', upsert: false })

  if (uploadError) {
    console.error('[Prompt image upload]', uploadError)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }

  const { data: { publicUrl } } = adminClient.storage.from(BUCKET).getPublicUrl(storagePath)

  const newImage: PromptImage = { prompt, url: publicUrl }
  const updated = [...current, newImage]

  await adminClient
    .from('users')
    .update({ prompt_images: JSON.stringify(updated), updated_at: new Date().toISOString() })
    .eq('id', user.id)

  return NextResponse.json({ image: newImage })
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const url = searchParams.get('url')
  if (!url) return NextResponse.json({ error: 'Missing url param' }, { status: 400 })

  // Validate the URL belongs to this user's prompt-images path.
  const bucketBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`
  const storagePath = url.startsWith(bucketBase) ? url.slice(bucketBase.length) : null
  const expectedPrefix = `images/prompts/${user.id}/`

  if (!storagePath || !storagePath.startsWith(expectedPrefix)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await adminClient.storage.from(BUCKET).remove([storagePath])

  const { data: row } = await adminClient
    .from('users')
    .select('prompt_images')
    .eq('id', user.id)
    .single()

  const current = parsePromptImages((row as Record<string, string | null> | null)?.prompt_images)
  const updated = current.filter(img => img.url !== url)

  await adminClient
    .from('users')
    .update({ prompt_images: JSON.stringify(updated), updated_at: new Date().toISOString() })
    .eq('id', user.id)

  return NextResponse.json({ ok: true })
}
