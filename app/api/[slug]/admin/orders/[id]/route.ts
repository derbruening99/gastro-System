import { NextRequest, NextResponse } from 'next/server'
import { getTenant } from '@/lib/tenant'
import { createServerClient } from '@/lib/supabase'

const SESSION_COOKIE = '__gastro_admin'
const VALID_STATUSES = new Set(['pending', 'confirmed', 'done'])

function isAuthorized(request: NextRequest, slug: string): boolean {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  if (!token) return false
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8')
    return decoded.split(':')[0] === slug
  } catch {
    return false
  }
}

// ── PATCH /api/[slug]/admin/orders/[id] — Status aktualisieren ───────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await params

  if (!isAuthorized(request, slug)) {
    return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 401 })
  }

  const tenant = await getTenant(slug)
  if (!tenant) return NextResponse.json({ error: 'Restaurant nicht gefunden.' }, { status: 404 })

  let body: { status?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Ungültiger Body.' }, { status: 400 })
  }

  const newStatus = body.status ?? ''
  if (!VALID_STATUSES.has(newStatus)) {
    return NextResponse.json({ error: 'Ungültiger Status.' }, { status: 400 })
  }

  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('gastro_orders')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('restaurant_id', tenant.id) // Tenant-Isolation
    .select('id, status')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ order: data })
}
