import { NextRequest, NextResponse } from 'next/server'
import { getTenant } from '@/lib/tenant'
import { getValidatedPrices } from '@/lib/menu'
import { createServerClient } from '@/lib/supabase'
import type { OrderPayload, OrderResponse } from '@/lib/types'

// ─── Rate Limiting (In-Memory) ────────────────────────────────────────────────
// Einfaches IP-basiertes Rate Limiting — ersetzt durch Redis bei Scale-up.
const rateMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 10      // max Requests
const RATE_WINDOW = 60_000 // pro 60 Sekunden

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = rateMap.get(ip)

  if (!entry || now > entry.resetAt) {
    rateMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW })
    return false
  }

  if (entry.count >= RATE_LIMIT) return true

  entry.count++
  return false
}

// ─── POST /api/[slug]/orders ──────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse<OrderResponse>> {
  const { slug } = await params

  // 1. Rate Limiting
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { success: false, error: 'Zu viele Anfragen. Bitte kurz warten.' },
      { status: 429 },
    )
  }

  // 2. Tenant validieren
  const tenant = await getTenant(slug)
  if (!tenant) {
    return NextResponse.json(
      { success: false, error: 'Restaurant nicht gefunden.' },
      { status: 404 },
    )
  }

  // 3. Request Body parsen & validieren
  let body: OrderPayload
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { success: false, error: 'Ungültiges Request-Format.' },
      { status: 400 },
    )
  }

  const { items, table_number, lang = 'de', notes, scan_id } = body

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json(
      { success: false, error: 'Keine Items in der Bestellung.' },
      { status: 400 },
    )
  }

  if (items.length > 50) {
    return NextResponse.json(
      { success: false, error: 'Zu viele Items.' },
      { status: 400 },
    )
  }

  // 4. ✅ Preise SERVERSEITIG validieren — Client-Preise werden IGNORIERT
  const allItemIds = [...new Set(items.map((i) => i.item_id))]
  const allUpsellIds = [...new Set(items.flatMap((i) => i.upsell_ids ?? []))]

  const { items: validItemPrices, itemNames: validItemNames, upsells: validUpsellPrices } =
    await getValidatedPrices(tenant.id, allItemIds, allUpsellIds)

  // Alle Items müssen zu diesem Restaurant gehören
  for (const item of items) {
    if (!validItemPrices.has(item.item_id)) {
      return NextResponse.json(
        { success: false, error: `Ungültiges Item: ${item.item_id}` },
        { status: 400 },
      )
    }
    for (const upsellId of item.upsell_ids ?? []) {
      if (!validUpsellPrices.has(upsellId)) {
        return NextResponse.json(
          { success: false, error: `Ungültiger Upsell: ${upsellId}` },
          { status: 400 },
        )
      }
    }
  }

  // 5. Gesamtpreis serverseitig berechnen
  let total = 0
  for (const item of items) {
    const basePrice = validItemPrices.get(item.item_id)!
    const upsellTotal = (item.upsell_ids ?? []).reduce(
      (sum, uid) => sum + (validUpsellPrices.get(uid) ?? 0),
      0,
    )
    total += (basePrice + upsellTotal) * item.quantity
  }
  total = Math.round(total * 100) / 100 // auf 2 Dezimalstellen runden

  // 6. Demo-Modus: keine DB-Schreibvorgänge
  if (tenant.is_demo) {
    return NextResponse.json({
      success: true,
      order_id: `demo-${Date.now()}`,
      total,
      demo: true,
    })
  }

  // 7. Optional: eingeloggten Kunden per Bearer-Token ermitteln
  const supabase = createServerClient()
  let customerId: string | null = null

  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    const { data: { user: authUser } } = await supabase.auth.getUser(token)
    if (authUser) {
      const { data: customer } = await supabase
        .from('gastro_customers')
        .select('id')
        .eq('restaurant_id', tenant.id)
        .eq('user_id', authUser.id)
        .single()
      customerId = customer?.id ?? null
    }
  }

  // 8. Bestellung in DB schreiben
  const { data: order, error: orderError } = await supabase
    .from('gastro_orders')
    .insert({
      restaurant_id: tenant.id,
      customer_id: customerId,
      table_number: table_number ?? null,
      status: 'pending',
      total,
      lang,
      notes: notes ?? null,
    })
    .select('id')
    .single()

  if (orderError || !order) {
    console.error('[orders/route] gastro_orders insert error:', orderError)
    return NextResponse.json(
      { success: false, error: 'Bestellung konnte nicht gespeichert werden.' },
      { status: 500 },
    )
  }

  // 8. Order Items schreiben (mit validierten Preisen aus DB)
  const orderItems = items.map((item) => {
    const unitPrice = validItemPrices.get(item.item_id)!
    const upsellsData = (item.upsell_ids ?? []).map((uid) => ({
      id: uid,
      price: validUpsellPrices.get(uid) ?? 0,
    }))

    return {
      order_id: order.id,
      item_id: item.item_id,
      item_name: validItemNames.get(item.item_id) ?? '',
      quantity: item.quantity,
      unit_price: unitPrice,
      upsells: upsellsData,
      notes: item.notes ?? null,
    }
  })

  const { error: itemsError } = await supabase
    .from('gastro_order_items')
    .insert(orderItems)

  if (itemsError) {
    console.error('[orders/route] gastro_order_items insert error:', itemsError)
    // Bestellung trotzdem zurückgeben — Items können manuell ergänzt werden
  }

  // 10. QR-Scan Conversion Tracking — verknüpft Scan mit Bestellung
  if (scan_id) {
    await supabase
      .from('qr_scans')
      .update({ order_id: order.id, converted: true })
      .eq('id', scan_id)
      .eq('restaurant_id', tenant.id) // Sicherheit: nur eigenes Restaurant
  }

  // 11. Stempel vergeben wenn Kunde eingeloggt war
  if (customerId) {
    await supabase.rpc('add_gastro_stamp', { p_order_id: order.id })
  }

  return NextResponse.json({
    success: true,
    order_id: order.id,
    total,
    demo: false,
  })
}
