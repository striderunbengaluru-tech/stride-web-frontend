import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'

const STORAGE_BASE = 'https://ienotcjldormdxrzukpk.supabase.co/storage/v1/object/public/stride-assets/'

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

  if (!url.startsWith(STORAGE_BASE)) {
    return NextResponse.json({ error: 'Invalid storage URL' }, { status: 400 })
  }

  const storagePath = url.slice(STORAGE_BASE.length)

  // Only allow deletion of event images via this endpoint
  if (!storagePath.startsWith('images/events/')) {
    return NextResponse.json({ error: 'Can only delete event images' }, { status: 400 })
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
