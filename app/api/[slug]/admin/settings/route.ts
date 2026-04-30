import { NextRequest, NextResponse } from 'next/server'
import { getTenant } from '@/lib/tenant'
import { createServerClient } from '@/lib/supabase'

const SESSION_COOKIE = '__gastro_admin'

function isAuthorized(request: NextRequest, slug: string): boolean {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  if (!token) return false
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8')
    const [tokenSlug] = decoded.split(':')
    return tokenSlug === slug
  } catch { return false }
}

// GET /api/[slug]/admin/settings — return all keys as { key: value }
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  if (!isAuthorized(request, slug))
    return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 401 })

  const tenant = await getTenant(slug)
  if (!tenant) return NextResponse.json({ error: 'Nicht gefunden.' }, { status: 404 })

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('restaurant_settings')
    .select('key, value')
    .eq('restaurant_id', tenant.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const settings: Record<string, unknown> = {}
  for (const row of data ?? []) settings[row.key] = row.value

  return NextResponse.json({ settings })
}

// PUT /api/[slug]/admin/settings — upsert { key, value }
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  if (!isAuthorized(request, slug))
    return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 401 })

  const tenant = await getTenant(slug)
  if (!tenant) return NextResponse.json({ error: 'Nicht gefunden.' }, { status: 404 })

  const body = await request.json() as { key: string; value: unknown }
  if (!body.key) return NextResponse.json({ error: 'key fehlt.' }, { status: 400 })

  const supabase = createServerClient()
  const { error } = await supabase
    .from('restaurant_settings')
    .upsert({ restaurant_id: tenant.id, key: body.key, value: body.value, updated_at: new Date().toISOString() }, { onConflict: 'restaurant_id,key' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
