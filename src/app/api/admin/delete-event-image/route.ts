import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { storagePathFromPublicUrl, isAllowedImagePath } from '@/lib/utils/storage-paths'

export async function DELETE(request: Request) {
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

  const body = await request.json() as { url?: string }
  const { url } = body

  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 })
  }

  const storagePath = storagePathFromPublicUrl(url)
  if (storagePath === null) {
    return NextResponse.json({ error: 'Invalid storage URL' }, { status: 400 })
  }

  // Only event and race images may be removed through this endpoint — never
  // avatars, covers or anything else that happens to live in the bucket.
  if (!isAllowedImagePath(storagePath)) {
    return NextResponse.json({ error: 'Can only delete event or race images' }, { status: 400 })
  }

  const { error } = await adminClient.storage
    .from('stride-assets')
    .remove([storagePath])

  if (error) {
    console.error('[Delete event image]', error)
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
