import { NextRequest, NextResponse } from 'next/server'
import { getTenant } from '@/lib/tenant'
import { createServerClient } from '@/lib/supabase'

const SESSION_COOKIE = '__gastro_admin'
function isAuthorized(request: NextRequest, slug: string): boolean {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  if (!token) return false
  try { return Buffer.from(token, 'base64').toString('utf8').split(':')[0] === slug } catch { return false }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  if (!isAuthorized(request, slug)) return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 401 })
  const tenant = await getTenant(slug)
  if (!tenant) return NextResponse.json({ error: 'Restaurant nicht gefunden.' }, { status: 404 })
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('meso_sops')
    .select('id, title, category, steps, is_active, created_at')
    .eq('restaurant_id', tenant.id)
    .order('category', { ascending: true })
    .limit(200)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ sops: data ?? [] })
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  if (!isAuthorized(request, slug)) return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 401 })
  const tenant = await getTenant(slug)
  if (!tenant) return NextResponse.json({ error: 'Restaurant nicht gefunden.' }, { status: 404 })
  const body = await request.json() as { title: string; category?: string; steps?: string[] }
  if (!body.title?.trim()) return NextResponse.json({ error: 'Titel erforderlich.' }, { status: 400 })
  const steps = (body.steps ?? []).filter((s: string) => s.trim())
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('meso_sops')
    .insert({ restaurant_id: tenant.id, title: body.title.trim(), category: body.category ?? 'Allgemein', steps, is_active: true })
    .select('id, title, category, steps, is_active, created_at')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ sop: data })
}
