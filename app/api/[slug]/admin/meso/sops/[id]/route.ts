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
  const body = await request.json() as { title?: string; category?: string; steps?: string[]; is_active?: boolean }
  const updates: Record<string, unknown> = {}
  if (body.title)             updates.title     = body.title
  if (body.category)          updates.category  = body.category
  if (body.steps !== undefined) updates.steps   = body.steps
  if (body.is_active !== undefined) updates.is_active = body.is_active
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('meso_sops')
    .update(updates)
    .eq('id', id)
    .eq('restaurant_id', tenant.id)
    .select('id, title, category, steps, is_active, created_at')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ sop: data })
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
  const { error } = await supabase.from('meso_sops').delete().eq('id', id).eq('restaurant_id', tenant.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
