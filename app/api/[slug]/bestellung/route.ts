import { NextRequest, NextResponse } from 'next/server'
import { getTenant } from '@/lib/tenant'
import { createServerClient } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

type KustomizerConfig = {
  type: 'kustomizer'
  basis: string
  protein: string
  zutaten: string[]
  sauce: string
  crunch: string[]
  extras: string[]
  price: number
}

type OrderType = 'pickup' | 'dine-in' | 'delivery'

type BestellungPayload = {
  name: string
  phone: string
  order_type: OrderType
  pickup_time?: string | null
  table_number?: string | null
  address?: string | null
  notes?: string | null
  loyalty_enabled: boolean
  config: KustomizerConfig
}

// ─── Rate Limiting ────────────────────────────────────────────────────────────

const rateMap = new Map<string, { count: number; resetAt: number }>()

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = rateMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateMap.set(ip, { count: 1, resetAt: now + 60_000 })
    return false
  }
  if (entry.count >= 10) return true
  entry.count++
  return false
}

// ─── Phone normalisation ──────────────────────────────────────────────────────

function normalizePhone(raw: string): string {
  // Strip everything except digits and leading +
  let p = raw.replace(/[^\d+]/g, '')
  // If starts with 0, replace with +49
  if (p.startsWith('0')) p = '+49' + p.slice(1)
  // If no +, add +49
  if (!p.startsWith('+')) p = '+49' + p
  return p
}

// ─── Build notes string from kustomizer config ────────────────────────────────

function buildNotes(cfg: KustomizerConfig, customerName: string, pickupTime: string, extraNote?: string | null): string {
  // WICHTIG: Kein ' | ' im Header-Block verwenden (wird als Trennzeichen genutzt)
  const parts = [
    `🥣 Kustomizer Bowl`,
    `👤 ${customerName} ⏰ ${pickupTime}`,
    `📦 Basis: ${cfg.basis}`,
    `🍖 Warmspeise: ${cfg.protein}`,
    `🥦 Zutaten: ${cfg.zutaten.join(', ') || '–'}`,
    `🫙 Sauce: ${cfg.sauce}`,
    `✨ Crunch: ${cfg.crunch.join(', ') || '–'}`,
    ...(cfg.extras.length ? [`➕ Extras: ${cfg.extras.join(', ')}`] : []),
    ...(extraNote ? [`📝 ${extraNote}`] : []),
  ]
  return parts.join(' | ')
}

// ─── POST /api/[slug]/bestellung ──────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params

  // Rate limit
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { success: false, error: 'Zu viele Anfragen.' },
      { status: 429 },
    )
  }

  // Tenant
  const tenant = await getTenant(slug)
  if (!tenant) {
    return NextResponse.json({ success: false, error: 'Restaurant nicht gefunden.' }, { status: 404 })
  }

  // Parse body
  let body: BestellungPayload
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Ungültiges Format.' }, { status: 400 })
  }

  const { name, phone, order_type, pickup_time, table_number, address, notes, loyalty_enabled, config } = body

  // Basic validation
  if (!name?.trim()) return NextResponse.json({ success: false, error: 'Name fehlt.' }, { status: 400 })
  if (!phone?.trim()) return NextResponse.json({ success: false, error: 'Telefonnummer fehlt.' }, { status: 400 })
  if (!order_type) return NextResponse.json({ success: false, error: 'Bestellart fehlt.' }, { status: 400 })
  if (order_type === 'delivery' && !address?.trim()) return NextResponse.json({ success: false, error: 'Lieferadresse fehlt.' }, { status: 400 })
  if (!config || typeof config.price !== 'number') return NextResponse.json({ success: false, error: 'Bestellkonfiguration fehlt.' }, { status: 400 })

  // Price sanity check (10.90 base + max ~25€ extras)
  if (config.price < 8 || config.price > 60) {
    return NextResponse.json({ success: false, error: 'Ungültiger Preis.' }, { status: 400 })
  }

  // Demo mode
  if (tenant.is_demo) {
    return NextResponse.json({ success: true, order_id: `demo-${Date.now()}`, stamps_left: 7, demo: true })
  }

  const supabase = createServerClient()
  const normalizedPhone = normalizePhone(phone)
  const typeLabel = order_type === 'pickup' ? '🥡 Abholen' : order_type === 'dine-in' ? '🪑 Vor Ort' : '🛵 Liefern'
  const locationInfo = order_type === 'pickup'
    ? (pickup_time ? `Abholung: ${pickup_time} Uhr` : '')
    : order_type === 'dine-in'
    ? (table_number ? `Tisch: ${table_number}` : 'Vor Ort')
    : `Lieferung an: ${address}${pickup_time ? ` um ${pickup_time} Uhr` : ''}`

  const orderNotes = buildNotes(config, `${name.trim()} · ${typeLabel} · ${locationInfo}`, pickup_time ?? 'sofort', notes)

  // Bestellnummer generieren (OB-0001, OB-0002, …)
  const { data: orderNumData } = await supabase
    .rpc('generate_order_number', { p_restaurant_id: tenant.id })
  const orderNumber = (orderNumData as string | null) ?? null

  // Save order
  const { data: order, error: orderError } = await supabase
    .from('gastro_orders')
    .insert({
      restaurant_id: tenant.id,
      customer_id: null, // linked below if loyalty enabled
      table_number: order_type === 'dine-in' ? (table_number ?? null) : null,
      status: 'pending',
      total: config.price,
      lang: 'de',
      notes: orderNotes,
      order_number: orderNumber,
      customer_name: name.trim(),
      customer_phone: normalizedPhone,
      order_type,
    })
    .select('id, order_number')
    .single()

  if (orderError || !order) {
    console.error('[bestellung/route] order insert error:', orderError)
    // Non-blocking — still return success so WhatsApp flow works
    return NextResponse.json({ success: true, order_id: null, stamps_left: null })
  }

  // Loyalty: find or create customer by phone, grant stamp
  if (loyalty_enabled) {
    try {
      // Find or upsert customer (no auth required — phone-only)
      const { data: existingCustomer } = await supabase
        .from('gastro_customers')
        .select('id')
        .eq('restaurant_id', tenant.id)
        .eq('phone', normalizedPhone)
        .maybeSingle()

      let customerId = existingCustomer?.id ?? null

      if (!customerId) {
        // Create anonymous customer (no user_id — linked later if they register)
        const { data: newCustomer } = await supabase
          .from('gastro_customers')
          .insert({
            restaurant_id: tenant.id,
            phone: normalizedPhone,
            name: name.trim(),
          })
          .select('id')
          .single()
        customerId = newCustomer?.id ?? null
      }

      if (customerId) {
        // Link order to customer
        await supabase
          .from('gastro_orders')
          .update({ customer_id: customerId })
          .eq('id', order.id)

        // Grant stamp via RPC
        await supabase.rpc('add_gastro_stamp', { p_order_id: order.id })

        // Fetch current stamp count to show user how many left
        const { data: card } = await supabase
          .from('gastro_stamp_cards')
          .select('current_stamps')
          .eq('restaurant_id', tenant.id)
          .eq('customer_id', customerId)
          .maybeSingle()

        const currentStamps = card?.current_stamps ?? 1
        const stampsLeft = Math.max(0, 8 - currentStamps)

        return NextResponse.json({
          success: true,
          order_id: order.id,
          stamps_left: stampsLeft,
        })
      }
    } catch (e) {
      console.error('[bestellung/route] loyalty error:', e)
    }
  }

  return NextResponse.json({
    success: true,
    order_id: order.id,
    order_number: (order as { id: string; order_number: string | null }).order_number,
    stamps_left: null,
  })
}
