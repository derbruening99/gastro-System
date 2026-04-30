'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import type { CartItem, CartUpsell } from '@/lib/types'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ─── Favoriten-Helpers (localStorage) ────────────────────────────────────────

const FAV_KEY = (restaurantId: string) => `gastro_favs_${restaurantId}`

export function saveFavorite(restaurantId: string, item: { id: string; name: string; price: number }) {
  try {
    const existing = getFavorites(restaurantId)
    const updated = [item, ...existing.filter((f) => f.id !== item.id)].slice(0, 5)
    localStorage.setItem(FAV_KEY(restaurantId), JSON.stringify(updated))
  } catch {}
}

export function getFavorites(restaurantId: string): Array<{ id: string; name: string; price: number }> {
  try {
    return JSON.parse(localStorage.getItem(FAV_KEY(restaurantId)) ?? '[]')
  } catch {
    return []
  }
}

// ─── Letzte Bestellung aus DB laden (Client-seitig) ──────────────────────────

type LastOrderItem = {
  item_id: string | null
  item_name: string
  quantity: number
  unit_price: number
}

type LastOrder = {
  id: string
  items: LastOrderItem[]
  total: number
  created_at: string
}

async function fetchLastOrder(
  restaurantId: string,
  customerId: string
): Promise<LastOrder | null> {
  const { data: order } = await supabase
    .from('gastro_orders')
    .select('id, total, created_at')
    .eq('restaurant_id', restaurantId)
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!order) return null

  const { data: items } = await supabase
    .from('gastro_order_items')
    .select('item_id, item_name, quantity, unit_price')
    .eq('order_id', order.id)

  return {
    id: order.id,
    total: Number(order.total),
    created_at: order.created_at,
    items: (items ?? []).map((i: Record<string, unknown>) => ({
      item_id: i.item_id as string | null,
      item_name: i.item_name as string,
      quantity: Number(i.quantity),
      unit_price: Number(i.unit_price),
    })),
  }
}

// ─── Komponente ───────────────────────────────────────────────────────────────

type Props = {
  restaurantId: string
  accentColor: string
  onReorder: (items: CartItem[]) => void
}

export function OneClickReorder({ restaurantId, accentColor, onReorder }: Props) {
  const [lastOrder, setLastOrder] = useState<LastOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [customerId, setCustomerId] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { setLoading(false); return }

      const { data: customer } = await supabase
        .from('gastro_customers')
        .select('id')
        .eq('restaurant_id', restaurantId)
        .eq('user_id', session.user.id)
        .single()

      if (!customer) { setLoading(false); return }

      setCustomerId(customer.id)
      const order = await fetchLastOrder(restaurantId, customer.id)
      setLastOrder(order)
      setLoading(false)
    }
    init()
  }, [restaurantId])

  if (loading || !lastOrder || lastOrder.items.length === 0) return null

  function handleReorder() {
    if (!lastOrder) return

    const cartItems: CartItem[] = lastOrder.items.map((item) => ({
      cartKey: `${item.item_id ?? item.item_name}-${Date.now()}`,
      item_id: item.item_id ?? '',
      name: item.item_name,
      price: item.unit_price,
      quantity: item.quantity,
      upsells: [] as CartUpsell[],
    }))

    onReorder(cartItems)
  }

  const date = new Date(lastOrder.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
  const preview = lastOrder.items.slice(0, 2).map((i) => `${i.quantity}× ${i.item_name}`).join(', ')
  const more = lastOrder.items.length > 2 ? ` +${lastOrder.items.length - 2}` : ''

  return (
    <div style={{ padding: '12px 14px 0' }}>
      <button
        onClick={handleReorder}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 12,
          background: '#fff', border: `1.5px solid ${accentColor}40`,
          borderRadius: 16, padding: '12px 16px',
          cursor: 'pointer', textAlign: 'left', boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          transition: 'transform 0.15s',
        }}
        onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.98)')}
        onMouseUp={(e) => (e.currentTarget.style.transform = '')}
      >
        {/* Icon */}
        <div style={{
          width: 42, height: 42, borderRadius: 12, flexShrink: 0,
          background: `${accentColor}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
        }}>
          🔁
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 14, color: '#0a1f0d', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Nochmal bestellen
          </p>
          <p style={{ fontSize: 12, color: '#4b6b50', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {preview}{more} · {date} · {lastOrder.total.toFixed(2)} €
          </p>
        </div>

        {/* Arrow */}
        <div style={{ flexShrink: 0, color: accentColor, fontWeight: 900, fontSize: 18 }}>›</div>
      </button>
    </div>
  )
}
