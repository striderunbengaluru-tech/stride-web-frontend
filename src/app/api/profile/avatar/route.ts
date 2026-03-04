import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'

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
  const { error: uploadError } = await adminClient.storage
    .from('stride-assets')
    .upload(`images/avatars/${user.id}`, fileBuffer, { contentType: file.type, upsert: true })

  if (uploadError) {
    console.error('[Avatar upload]', uploadError)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }

  const { data: { publicUrl } } = adminClient.storage.from('stride-assets').getPublicUrl(`images/avatars/${user.id}`)

  await adminClient
    .from('users')
    .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
    .eq('id', user.id)

  return NextResponse.json({ url: publicUrl })
}
