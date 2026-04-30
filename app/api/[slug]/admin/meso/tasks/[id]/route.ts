import { NextRequest, NextResponse } from 'next/server'
import { getTenant } from '@/lib/tenant'
import { createServerClient } from '@/lib/supabase'

const SESSION_COOKIE = '__gastro_admin'
function isAuthorized(request: NextRequest, slug: string): boolean {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  if (!token) return false
  try { return Buffer.from(token, 'base64').toString('utf8').split(':')[0] === slug } catch { return false }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await params
  if (!isAuthorized(request, slug)) return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 401 })
  const tenant = await getTenant(slug)
  if (!tenant) return NextResponse.json({ error: 'Restaurant nicht gefunden.' }, { status: 404 })
  const body = await request.json() as { status?: string; title?: string; description?: string; assigned_to?: string; due_at?: string }
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.status)      updates.status      = body.status
  if (body.title)       updates.title       = body.title
  if ('description' in body) updates.description = body.description
  if ('assigned_to' in body) updates.assigned_to = body.assigned_to
  if ('due_at' in body)      updates.due_at      = body.due_at
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('meso_tasks')
    .update(updates)
    .eq('id', id)
    .eq('restaurant_id', tenant.id)
    .select('id, title, description, status, assigned_to, due_at, created_at, updated_at')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ task: data })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await params
  if (!isAuthorized(request, slug)) return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 401 })
  const tenant = await getTenant(slug)
  if (!tenant) return NextResponse.json({ error: 'Restaurant nicht gefunden.' }, { status: 404 })
  const supabase = createServerClient()
  const { error } = await supabase.from('meso_tasks').delete().eq('id', id).eq('restaurant_id', tenant.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
