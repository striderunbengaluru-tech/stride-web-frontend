import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { storagePathFromPublicUrl, isAllowedImagePath, IMAGE_KINDS } from '@/lib/utils/storage-paths'
import { ROLES } from '@/types/auth'

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: adminUser } = await adminClient
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = adminUser?.role
  if (role !== ROLES.ADMIN && role !== ROLES.LEAD) {
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
  // No traversal out of the allowed folders, whatever the storage API would do with it.
  if (storagePath.includes('..') || !isAllowedImagePath(storagePath)) {
    return NextResponse.json({ error: 'Can only delete event or race images' }, { status: 400 })
  }

  // A LEAD may remove event images only, and never one an admin-created event
  // still uses — otherwise a hand-crafted call could strip an admin event's
  // poster. An image no event references yet (just uploaded in an open form)
  // or one on a lead-created event is fair game.
  if (role === ROLES.LEAD) {
    if (!storagePath.startsWith(IMAGE_KINDS.event)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (await usedByAdminEvent(storagePath, url)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
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

/**
 * True when an admin-created event references this image, as a banner or as
 * its legacy cover. Two plain filters rather than one `.or()` string, so the
 * caller-supplied path never becomes PostgREST filter syntax.
 */
async function usedByAdminEvent(storagePath: string, url: string): Promise<boolean> {
  const [{ count: inBanners }, { count: asCover }] = await Promise.all([
    adminClient
      .from('events')
      .select('id', { count: 'exact', head: true })
      .neq('owner_role', ROLES.LEAD)
      .like('banner_images', `%${storagePath}%`),
    adminClient
      .from('events')
      .select('id', { count: 'exact', head: true })
      .neq('owner_role', ROLES.LEAD)
      .eq('cover_url', url),
  ])
  return (inBanners ?? 0) > 0 || (asCover ?? 0) > 0
}
