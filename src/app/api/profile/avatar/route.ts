import { NextResponse } from 'next/server'
import sharp from 'sharp'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'

const STORAGE_PUBLIC_PREFIX = 'https://ienotcjldormdxrzukpk.supabase.co/storage/v1/object/public/stride-assets/'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await request.formData()
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
  }

  if (file.size > 3 * 1024 * 1024) {
    return NextResponse.json({ error: 'Image must be under 3MB' }, { status: 400 })
  }

  const fileBuffer = await file.arrayBuffer()
  const webpBuffer = await sharp(Buffer.from(fileBuffer))
    .resize(400, 400, { fit: 'cover' })
    .webp({ quality: 85 })
    .toBuffer()

  const path = `images/avatars/${user.id}.webp`

  // Fetch the previous avatar URL so we can clean up any old file in storage
  // that isn't at the canonical path (e.g. legacy filenames, manual uploads).
  const { data: prev } = await adminClient
    .from('users')
    .select('avatar_url')
    .eq('id', user.id)
    .single()

  const { error: uploadError } = await adminClient.storage
    .from('stride-assets')
    .upload(path, webpBuffer, { contentType: 'image/webp', upsert: true, cacheControl: '31536000' })

  if (uploadError) {
    console.error('[Avatar upload]', uploadError)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }

  // If the previous URL pointed to a different Supabase Storage path inside our
  // avatars folder, delete it. Same-path overwrites are already handled by upsert.
  const prevUrl = prev?.avatar_url
  if (prevUrl?.startsWith(STORAGE_PUBLIC_PREFIX)) {
    const prevPath = prevUrl.slice(STORAGE_PUBLIC_PREFIX.length).split('?')[0]
    if (prevPath.startsWith('images/avatars/') && prevPath !== path) {
      await adminClient.storage.from('stride-assets').remove([prevPath])
    }
  }

  const { data: { publicUrl } } = adminClient.storage.from('stride-assets').getPublicUrl(path)
  // The file is overwritten in place (stable path + upsert) and served with a 1-year
  // immutable cache. A version query param busts that cache so a new upload is seen.
  const versionedUrl = `${publicUrl}?v=${Date.now()}`

  await adminClient
    .from('users')
    .update({ avatar_url: versionedUrl, updated_at: new Date().toISOString() })
    .eq('id', user.id)

  return NextResponse.json({ url: versionedUrl })
}

// Permanently removes the user's profile photo (DPDP: users may delete their
// image at any time). Every render site falls back to an initials placeholder.
export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: row } = await adminClient
    .from('users')
    .select('avatar_url')
    .eq('id', user.id)
    .single()

  const paths = [`images/avatars/${user.id}.webp`]
  // Also remove a legacy/non-canonical storage path if the row points at one.
  // Google-hosted photo URLs are external — nothing to remove from storage.
  const currentUrl = row?.avatar_url
  if (currentUrl?.startsWith(STORAGE_PUBLIC_PREFIX)) {
    const currentPath = currentUrl.slice(STORAGE_PUBLIC_PREFIX.length).split('?')[0]
    if (currentPath.startsWith('images/avatars/') && !paths.includes(currentPath)) {
      paths.push(currentPath)
    }
  }
  const { error: removeError } = await adminClient.storage.from('stride-assets').remove(paths)
  if (removeError) {
    // Orphaned file only — still clear the reference so the photo disappears.
    console.warn('[Avatar delete] storage removal failed', removeError)
  }

  const { error: dbError } = await adminClient
    .from('users')
    .update({ avatar_url: null, updated_at: new Date().toISOString() })
    .eq('id', user.id)
  if (dbError) {
    console.error('[Avatar delete]', dbError)
    return NextResponse.json({ error: 'Could not remove photo' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
