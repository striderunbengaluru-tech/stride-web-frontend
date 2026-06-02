import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'

const MAX_RUNS = 10

const createSchema = z.object({
  raceName: z.string().min(1).max(200),
  distance: z.string().max(50).optional().or(z.literal('')),
  finishTime: z.string().max(20).optional().or(z.literal('')),
})

const updateSchema = createSchema.extend({ id: z.string().min(1) })

const reorderSchema = z.object({ orderedIds: z.array(z.string().min(1)).max(MAX_RUNS) })

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }
  const { raceName, distance, finishTime } = parsed.data

  // Enforce the 10-run cap and compute the next display_order.
  const { data: existing } = await adminClient
    .from('official_runs')
    .select('display_order')
    .eq('user_id', user.id)
    .order('display_order', { ascending: false })

  if ((existing?.length ?? 0) >= MAX_RUNS) {
    return NextResponse.json({ error: `Maximum ${MAX_RUNS} runs allowed` }, { status: 400 })
  }
  const nextOrder = (existing?.[0]?.display_order ?? -1) + 1

  const { data, error } = await adminClient
    .from('official_runs')
    .insert({
      id: crypto.randomUUID(),
      user_id: user.id,
      race_name: raceName,
      distance_category: distance || null,
      finish_time: finishTime || null,
      display_order: nextOrder,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Failed to save run' }, { status: 500 })
  return NextResponse.json({ run: data })
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }
  const { id, raceName, distance, finishTime } = parsed.data

  const { data, error } = await adminClient
    .from('official_runs')
    .update({
      race_name: raceName,
      distance_category: distance || null,
      finish_time: finishTime || null,
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Failed to update run' }, { status: 500 })
  return NextResponse.json({ run: data })
}

export async function PUT(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = reorderSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  // Persist the new display order, scoped to this user's rows.
  await Promise.all(
    parsed.data.orderedIds.map((id, index) =>
      adminClient
        .from('official_runs')
        .update({ display_order: index })
        .eq('id', id)
        .eq('user_id', user.id)
    )
  )

  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const { error } = await adminClient
    .from('official_runs')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
