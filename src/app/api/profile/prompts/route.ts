import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import type { Prompt } from '@/types/user'
import { MAX_PROMPTS, PROMPT_ANSWER_MAX } from '@/content/profile-prompts'

const promptFields = {
  question: z.string().min(1).max(200),
  answer: z.string().min(1).max(PROMPT_ANSWER_MAX),
}

const createSchema = z.object(promptFields)
const updateSchema = z.object({ id: z.string().min(1), ...promptFields })
const reorderSchema = z.object({ orderedIds: z.array(z.string().min(1)).max(MAX_PROMPTS) })

function parsePrompts(raw: string | null | undefined): Prompt[] {
  if (!raw) return []
  try {
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? (arr as Prompt[]) : []
  } catch {
    return []
  }
}

async function readPrompts(userId: string): Promise<Prompt[]> {
  const { data } = await adminClient
    .from('users')
    .select('prompts')
    .eq('id', userId)
    .single()
  return parsePrompts((data as Record<string, string | null> | null)?.prompts)
}

async function writePrompts(userId: string, prompts: Prompt[]): Promise<boolean> {
  const { error } = await adminClient
    .from('users')
    .update({ prompts: JSON.stringify(prompts), updated_at: new Date().toISOString() })
    .eq('id', userId)
  return !error
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = createSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid prompt' }, { status: 400 })

  const prompts = await readPrompts(user.id)
  if (prompts.length >= MAX_PROMPTS) {
    return NextResponse.json({ error: `Maximum ${MAX_PROMPTS} prompts allowed` }, { status: 400 })
  }

  const prompt: Prompt = {
    id: crypto.randomUUID(),
    question: parsed.data.question.trim(),
    answer: parsed.data.answer.trim(),
  }

  if (!(await writePrompts(user.id, [...prompts, prompt]))) {
    return NextResponse.json({ error: 'Failed to save prompt' }, { status: 500 })
  }
  return NextResponse.json({ prompt })
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = updateSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid prompt' }, { status: 400 })
  const { id } = parsed.data

  const prompts = await readPrompts(user.id)
  const idx = prompts.findIndex(p => p.id === id)
  if (idx === -1) return NextResponse.json({ error: 'Prompt not found' }, { status: 404 })

  const prompt: Prompt = {
    id,
    question: parsed.data.question.trim(),
    answer: parsed.data.answer.trim(),
  }
  prompts[idx] = prompt

  if (!(await writePrompts(user.id, prompts))) {
    return NextResponse.json({ error: 'Failed to update prompt' }, { status: 500 })
  }
  return NextResponse.json({ prompt })
}

export async function PUT(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = reorderSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid order' }, { status: 400 })

  const prompts = await readPrompts(user.id)
  const byId = new Map(prompts.map(p => [p.id, p]))
  // Reorder by the supplied ids; append any not referenced (defensive).
  const reordered = [
    ...parsed.data.orderedIds.map(id => byId.get(id)).filter((p): p is Prompt => !!p),
    ...prompts.filter(p => !parsed.data.orderedIds.includes(p.id)),
  ]

  if (!(await writePrompts(user.id, reordered))) {
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

  const prompts = await readPrompts(user.id)
  const updated = prompts.filter(p => p.id !== id)

  if (!(await writePrompts(user.id, updated))) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
