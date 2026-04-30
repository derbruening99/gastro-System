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
  } catch {
    return false
  }
}

// ── GET /api/[slug]/admin/orders ──────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params

  if (!isAuthorized(request, slug)) {
    return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 401 })
  }

  const tenant = await getTenant(slug)
  if (!tenant) return NextResponse.json({ error: 'Restaurant nicht gefunden.' }, { status: 404 })

  const supabase = createServerClient()
  const status = request.nextUrl.searchParams.get('status')

  let query = supabase
    .from('gastro_orders')
    .select(`
      id, order_number, customer_name, customer_phone, order_type,
      table_number, status, total, notes, created_at, updated_at,
      gastro_order_items (
        id, item_id, item_name, quantity, unit_price, modifiers, upsells, notes
      )
    `)
    .eq('restaurant_id', tenant.id)
    .order('created_at', { ascending: false })
    .limit(200)

  if (status && ['pending', 'confirmed', 'done'].includes(status)) {
    query = query.eq('status', status)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ orders: data ?? [] })
}
