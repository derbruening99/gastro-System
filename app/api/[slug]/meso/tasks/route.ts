import { NextRequest, NextResponse } from 'next/server'
import { getTenant } from '@/lib/tenant'
import { createServerClient } from '@/lib/supabase'

const STAFF_COOKIE = '__gastro_staff'
function isAuthorized(request: NextRequest, slug: string): boolean {
  const token = request.cookies.get(STAFF_COOKIE)?.value
  if (!token) return false
  try { return Buffer.from(token, 'base64').toString('utf8').split(':')[0] === slug } catch { return false }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  if (!isAuthorized(request, slug)) return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 401 })
  const tenant = await getTenant(slug)
  if (!tenant) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('meso_tasks')
    .select('id, title, description, status, assigned_to, due_at, created_at')
    .eq('restaurant_id', tenant.id)
    .neq('status', 'archived')
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tasks: data ?? [] })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  if (!isAuthorized(request, slug)) return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 401 })
  const tenant = await getTenant(slug)
  if (!tenant) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  const body = await request.json() as { id: string; status: string }
  if (!body.id || !body.status) return NextResponse.json({ error: 'ID und Status erforderlich.' }, { status: 400 })
  const supabase = createServerClient()
  const { error } = await supabase
    .from('meso_tasks')
    .update({ status: body.status, updated_at: new Date().toISOString() })
    .eq('id', body.id)
    .eq('restaurant_id', tenant.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
