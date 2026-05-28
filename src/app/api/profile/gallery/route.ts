import { NextResponse } from 'next/server'
import sharp from 'sharp'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import type { GalleryImage } from '@/types/user'

const MAX_IMAGES = 6
const BUCKET = 'stride-assets'

function parseGallery(raw: string | null | undefined): GalleryImage[] {
  if (!raw) return []
  try { return JSON.parse(raw) as GalleryImage[] } catch { return [] }
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await request.formData()
  const file = form.get('file') as File | null
  const caption = (form.get('caption') as string | null)?.trim() || undefined

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
  if (file.size > 8 * 1024 * 1024) return NextResponse.json({ error: 'Image must be under 8 MB' }, { status: 400 })

  // Check current count
  const { data: row } = await adminClient
    .from('users')
    .select('gallery_images')
    .eq('id', user.id)
    .single()

  const current = parseGallery((row as Record<string, string | null> | null)?.gallery_images)
  if (current.length >= MAX_IMAGES) {
    return NextResponse.json({ error: `Maximum ${MAX_IMAGES} images allowed` }, { status: 400 })
  }

  const buf = await file.arrayBuffer()
  const webpBuffer = await sharp(Buffer.from(buf))
    .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer()

  const filename = `${Date.now()}.webp`
  const storagePath = `images/gallery/${user.id}/${filename}`

  const { error: uploadError } = await adminClient.storage
    .from(BUCKET)
    .upload(storagePath, webpBuffer, { contentType: 'image/webp', upsert: false })

  if (uploadError) {
    console.error('[Gallery upload]', uploadError)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }

  const { data: { publicUrl } } = adminClient.storage.from(BUCKET).getPublicUrl(storagePath)

  const newImage: GalleryImage = { url: publicUrl, ...(caption ? { caption } : {}) }
  const updated = [...current, newImage]

  await adminClient
    .from('users')
    .update({ gallery_images: JSON.stringify(updated), updated_at: new Date().toISOString() })
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

  // Validate URL belongs to this user's gallery path
  const bucketBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`
  const storagePath = url.startsWith(bucketBase) ? url.slice(bucketBase.length) : null
  const expectedPrefix = `images/gallery/${user.id}/`

  if (!storagePath || !storagePath.startsWith(expectedPrefix)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await adminClient.storage.from(BUCKET).remove([storagePath])

  const { data: row } = await adminClient
    .from('users')
    .select('gallery_images')
    .eq('id', user.id)
    .single()

  const current = parseGallery((row as Record<string, string | null> | null)?.gallery_images)
  const updated = current.filter(img => img.url !== url)

  await adminClient
    .from('users')
    .update({ gallery_images: JSON.stringify(updated), updated_at: new Date().toISOString() })
    .eq('id', user.id)

  return NextResponse.json({ ok: true })
}
