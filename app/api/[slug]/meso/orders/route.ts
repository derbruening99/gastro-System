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
    .from('gastro_orders')
    .select('id, order_number, customer_name, order_type, table_number, status, total, notes, created_at, gastro_order_items(id, item_name, quantity, unit_price, modifiers, notes)')
    .eq('restaurant_id', tenant.id)
    .in('status', ['pending', 'confirmed'])
    .order('created_at', { ascending: true })
    .limit(50)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ orders: data ?? [] })
}
