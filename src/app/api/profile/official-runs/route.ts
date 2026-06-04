import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import type { OfficialRun } from '@/types/user'

const MAX_RUNS = 10
const CURRENT_YEAR = new Date().getFullYear()

const runFields = {
  name: z.string().min(1).max(120),
  time: z.string().max(20).optional().or(z.literal('')),
  distance: z.string().max(40).optional().or(z.literal('')),
  month: z.number().int().min(1).max(12).nullable().optional(),
  year: z.number().int().min(1970).max(CURRENT_YEAR).nullable().optional(),
}

const createSchema = z.object(runFields)
const updateSchema = z.object({ id: z.string().min(1), ...runFields })
const reorderSchema = z.object({ orderedIds: z.array(z.string().min(1)).max(MAX_RUNS) })

function parseRuns(raw: string | null | undefined): OfficialRun[] {
  if (!raw) return []
  try {
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? (arr as OfficialRun[]) : []
  } catch {
    return []
  }
}

async function readRuns(userId: string): Promise<OfficialRun[]> {
  const { data } = await adminClient
    .from('users')
    .select('official_runs')
    .eq('id', userId)
    .single()
  return parseRuns((data as Record<string, string | null> | null)?.official_runs)
}

async function writeRuns(userId: string, runs: OfficialRun[]): Promise<boolean> {
  const { error } = await adminClient
    .from('users')
    .update({ official_runs: JSON.stringify(runs), updated_at: new Date().toISOString() })
    .eq('id', userId)
  return !error
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = createSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid run details' }, { status: 400 })
  const { name, time, distance, month, year } = parsed.data

  const runs = await readRuns(user.id)
  if (runs.length >= MAX_RUNS) {
    return NextResponse.json({ error: `Maximum ${MAX_RUNS} runs allowed` }, { status: 400 })
  }

  const run: OfficialRun = {
    id: crypto.randomUUID(),
    name,
    time: time || null,
    distance: distance || null,
    month: month ?? null,
    year: year ?? null,
  }

  if (!(await writeRuns(user.id, [...runs, run]))) {
    return NextResponse.json({ error: 'Failed to save run' }, { status: 500 })
  }
  return NextResponse.json({ run })
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = updateSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid run details' }, { status: 400 })
  const { id, name, time, distance, month, year } = parsed.data

  const runs = await readRuns(user.id)
  const idx = runs.findIndex(r => r.id === id)
  if (idx === -1) return NextResponse.json({ error: 'Run not found' }, { status: 404 })

  const run: OfficialRun = {
    id,
    name,
    time: time || null,
    distance: distance || null,
    month: month ?? null,
    year: year ?? null,
  }
  runs[idx] = run

  if (!(await writeRuns(user.id, runs))) {
    return NextResponse.json({ error: 'Failed to update run' }, { status: 500 })
  }
  return NextResponse.json({ run })
}

export async function PUT(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = reorderSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid order' }, { status: 400 })

  const runs = await readRuns(user.id)
  const byId = new Map(runs.map(r => [r.id, r]))
  // Reorder by the supplied ids; append any not referenced (defensive).
  const reordered = [
    ...parsed.data.orderedIds.map(id => byId.get(id)).filter((r): r is OfficialRun => !!r),
    ...runs.filter(r => !parsed.data.orderedIds.includes(r.id)),
  ]

  if (!(await writeRuns(user.id, reordered))) {
    return NextResponse.json({ error: 'Failed to reorder' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const runs = await readRuns(user.id)
  const updated = runs.filter(r => r.id !== id)

  if (!(await writeRuns(user.id, updated))) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
