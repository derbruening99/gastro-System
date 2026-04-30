import { createSupabaseSessionClient, createServerClient } from './supabase'

// ── Typen ─────────────────────────────────────────────────────────────────────

export type AuthUser = {
  id: string
  email: string
}

export type GastroCustomer = {
  id: string
  restaurant_id: string
  user_id: string
  name: string | null
  email: string | null
  phone: string | null
  created_at: string
}

export type StampCard = {
  id: string
  restaurant_id: string
  customer_id: string
  current_stamps: number
  total_stamps: number
  redeemed_rewards: number
  stamps_for_reward: number
}

export type CustomerProfile = {
  user: AuthUser
  customer: GastroCustomer
  stampCard: StampCard | null
}

// ── Session auslesen ──────────────────────────────────────────────────────────

export async function getSession(): Promise<AuthUser | null> {
  try {
    const client = await createSupabaseSessionClient()
    const { data: { user }, error } = await client.auth.getUser()
    if (error || !user) return null
    // Unterstützt sowohl Email-Auth als auch Phone-derived-Email Auth
    const email = user.email ?? user.user_metadata?.phone ?? user.phone ?? ''
    return { id: user.id, email }
  } catch {
    return null
  }
}

// ── Customer-Profil + Stempelkarte laden ─────────────────────────────────────

export async function getCustomerProfile(
  restaurantId: string,
  userId: string
): Promise<CustomerProfile | null> {
  const db = createServerClient()

  const [customerRes, stampRes] = await Promise.all([
    db
      .from('gastro_customers')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('user_id', userId)
      .single(),
    db
      .from('gastro_stamp_cards')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .then(async (r) => r),
  ])

  if (customerRes.error || !customerRes.data) return null

  const customer = customerRes.data as GastroCustomer

  // Stempelkarte für diesen Customer
  const { data: stampData } = await db
    .from('gastro_stamp_cards')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .eq('customer_id', customer.id)
    .single()

  return {
    user: { id: userId, email: customer.email ?? '' },
    customer,
    stampCard: stampData as StampCard | null,
  }
}

// ── Letzte Bestellungen eines Customers ──────────────────────────────────────

export type OrderSummary = {
  id: string
  total: number
  status: string
  created_at: string
  items_count: number
}

export type LastOrderItem = {
  item_id: string
  item_name: string
  quantity: number
  unit_price: number
}

export type LastOrder = {
  id: string
  total: number
  created_at: string
  items: LastOrderItem[]
}

// ── Letzte Bestellung mit vollständigen Items (für One-Click) ─────────────────

export async function getLastOrder(
  restaurantId: string,
  customerId: string
): Promise<LastOrder | null> {
  const db = createServerClient()

  const { data: order } = await db
    .from('gastro_orders')
    .select('id, total, created_at')
    .eq('restaurant_id', restaurantId)
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!order) return null

  const { data: items } = await db
    .from('gastro_order_items')
    .select('item_id, item_name, quantity, unit_price')
    .eq('order_id', order.id)

  return {
    id: order.id,
    total: Number(order.total),
    created_at: order.created_at,
    items: (items ?? []).map((i: Record<string, unknown>) => ({
      item_id: i.item_id as string,
      item_name: i.item_name as string,
      quantity: Number(i.quantity),
      unit_price: Number(i.unit_price),
    })),
  }
}

export async function getCustomerOrders(
  restaurantId: string,
  customerId: string,
  limit = 5
): Promise<OrderSummary[]> {
  const db = createServerClient()

  const { data, error } = await db
    .from('gastro_orders')
    .select(`
      id,
      total,
      status,
      created_at,
      gastro_order_items(count)
    `)
    .eq('restaurant_id', restaurantId)
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error || !data) return []

  return data.map((o: Record<string, unknown>) => ({
    id: o.id as string,
    total: Number(o.total),
    status: o.status as string,
    created_at: o.created_at as string,
    items_count: (o.gastro_order_items as { count: number }[])?.[0]?.count ?? 0,
  }))
}
