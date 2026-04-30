import { NextRequest, NextResponse } from 'next/server'
import { getTenant } from '@/lib/tenant'
import { createServerClient } from '@/lib/supabase'

const SESSION_COOKIE = '__gastro_admin'

function isAuthorized(request: NextRequest, slug: string): boolean {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  if (!token) return false
  try {
    return Buffer.from(token, 'base64').toString('utf8').split(':')[0] === slug
  } catch { return false }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  if (!isAuthorized(request, slug))
    return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 401 })

  const tenant = await getTenant(slug)
  if (!tenant) return NextResponse.json({ error: 'Restaurant nicht gefunden.' }, { status: 404 })

  const supabase = createServerClient()

  // Kunden aus gastro_customers + Bestellstatistiken aus gastro_orders
  const [{ data: customers }, { data: orders }] = await Promise.all([
    supabase
      .from('gastro_customers')
      .select('id, name, phone, email, created_at')
      .eq('restaurant_id', tenant.id)
      .order('created_at', { ascending: false })
      .limit(500),
    supabase
      .from('gastro_orders')
      .select('customer_id, customer_name, customer_phone, total, created_at, status')
      .eq('restaurant_id', tenant.id)
      .order('created_at', { ascending: false })
      .limit(1000),
  ])

  // Kundenliste aufbauen — zuerst registrierte Kunden, dann aus Bestellungen ableiten
  const customerMap = new Map<string, {
    id: string; name: string | null; phone: string | null; email: string | null
    orderCount: number; totalSpent: number; lastOrderAt: string | null
    source: 'registered' | 'order'
  }>()

  // Registrierte Kunden
  for (const c of customers ?? []) {
    customerMap.set(c.id, {
      id: c.id, name: c.name, phone: c.phone, email: c.email,
      orderCount: 0, totalSpent: 0, lastOrderAt: null, source: 'registered',
    })
  }

  // Bestellungen zuordnen
  for (const o of orders ?? []) {
    const key = o.customer_id ?? `phone:${o.customer_phone}`
    if (!key) continue
    if (customerMap.has(key)) {
      const c = customerMap.get(key)!
      c.orderCount++
      c.totalSpent += Number(o.total ?? 0)
      if (!c.lastOrderAt || o.created_at > c.lastOrderAt) c.lastOrderAt = o.created_at
    } else if (o.customer_phone || o.customer_name) {
      customerMap.set(key, {
        id: key, name: o.customer_name, phone: o.customer_phone, email: null,
        orderCount: 1, totalSpent: Number(o.total ?? 0), lastOrderAt: o.created_at,
        source: 'order',
      })
    }
  }

  const list = Array.from(customerMap.values())
    .sort((a, b) => (b.lastOrderAt ?? '').localeCompare(a.lastOrderAt ?? ''))

  return NextResponse.json({ customers: list })
}
