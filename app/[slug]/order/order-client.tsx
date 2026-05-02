'use client'

import { useState, useCallback, useTransition, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { OneClickReorder } from './one-click-reorder'
import type {
  Restaurant,
  MenuCategory,
  MenuItem,
  Upsell,
  CartItem,
  CartUpsell,
  OrderPayload,
  OrderResponse,
} from '@/lib/types'

const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

const TIME_SLOTS = [
  '11:30', '11:45', '12:00', '12:15', '12:30', '12:45',
  '13:00', '13:15', '13:30', '14:00', '14:30', '15:00',
]

type OrderType = 'pickup' | 'dine-in' | 'delivery'

const ORDER_TYPES: { id: OrderType; emoji: string; label: string; sub: string }[] = [
  { id: 'pickup',   emoji: '🥡', label: 'Abholen',       sub: 'Ich komme selbst vorbei' },
  { id: 'dine-in',  emoji: '🪑', label: 'Vor Ort essen', sub: 'Ich bin bereits da / komme gleich' },
  { id: 'delivery', emoji: '🛵', label: 'Liefern',       sub: 'Bitte an meine Adresse liefern' },
]

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = { tenant: Restaurant; menu: MenuCategory[]; upsells: Upsell[]; table: string | null; scanId?: string | null }
type View = 'menu' | 'checkout' | 'success'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cartTotal(cart: CartItem[]) {
  return cart.reduce(
    (s, i) => s + (i.price + i.upsells.reduce((us, u) => us + u.price, 0)) * i.quantity,
    0,
  )
}
function cartCount(cart: CartItem[]) {
  return cart.reduce((s, i) => s + i.quantity, 0)
}

function buildWhatsAppUrl(
  cart: CartItem[],
  restaurantName: string,
  restaurantPhone: string,
  table: string | null,
  customerName: string,
  pickupTime: string | null,
  orderType?: OrderType | null,
  address?: string,
): string {
  const typeEmoji = { pickup: '🥡', 'dine-in': '🪑', delivery: '🛵' }[orderType ?? 'pickup']
  const typeLabel = ORDER_TYPES.find(o => o.id === (orderType ?? 'pickup'))?.label ?? 'Abholen'
  const lines = [`🍽️ Bestellung bei ${restaurantName}:`]
  if (customerName) lines.push(`👤 ${customerName}`)
  lines.push(`${typeEmoji} ${typeLabel}`)
  if (orderType === 'pickup' && pickupTime) lines.push(`⏰ Abholung: ${pickupTime} Uhr`)
  if (orderType === 'dine-in' && table) lines.push(`🪑 Tisch: ${table}`)
  if (orderType === 'delivery' && address) lines.push(`📍 Lieferung an: ${address}${pickupTime ? ` um ${pickupTime} Uhr` : ''}`)
  if (!orderType && table) lines.push(`📍 Tisch: ${table}`)
  if (!orderType && pickupTime) lines.push(`⏰ Abholung: ${pickupTime} Uhr`)
  lines.push('')
  let total = 0
  cart.forEach((item, idx) => {
    const row = (item.price + item.upsells.reduce((s, u) => s + u.price, 0)) * item.quantity
    total += row
    lines.push(`${idx + 1}. ${item.quantity}× ${item.name} — ${row.toFixed(2).replace('.', ',')} €`)
    if (item.upsells.length) lines.push(`   + ${item.upsells.map((u) => u.label).join(', ')}`)
  })
  lines.push('')
  lines.push(`💶 Gesamt: ${total.toFixed(2).replace('.', ',')} €`)
  const phone = restaurantPhone.replace(/\D/g, '')
  return `https://wa.me/${phone}?text=${encodeURIComponent(lines.join('\n'))}`
}

function launchConfetti() {
  const colors = ['#22c55e', '#16a34a', '#ffffff', '#bbf7d0', '#fbbf24', '#fb923c']
  for (let i = 0; i < 55; i++) {
    setTimeout(() => {
      const c = document.createElement('div')
      c.style.cssText = `
        position:fixed;pointer-events:none;z-index:9999;
        width:${6 + Math.random() * 8}px;height:${6 + Math.random() * 8}px;
        border-radius:${Math.random() > 0.5 ? '50%' : '2px'};
        background:${colors[Math.floor(Math.random() * colors.length)]};
        left:${Math.random() * 100}vw;top:-10px;
        animation:_cfFall ${0.8 + Math.random() * 1.2}s linear ${Math.random() * 0.3}s forwards;
      `
      document.body.appendChild(c)
      setTimeout(() => c.remove(), 2500)
    }, i * 28)
  }
}

// ─── Upsell Modal ─────────────────────────────────────────────────────────────

function UpsellModal({
  item,
  upsells,
  onConfirm,
  onSkip,
}: {
  item: MenuItem
  upsells: Upsell[]
  onConfirm: (s: CartUpsell[]) => void
  onSkip: () => void
}) {
  const [selected, setSelected] = useState<string[]>([])
  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)' }}>
      <div className="w-full max-w-md rounded-2xl p-6 space-y-4 shadow-2xl" style={{ background: '#fff' }}>
        <h3 className="text-lg font-extrabold" style={{ fontFamily: 'var(--font-head, system-ui)' }}>
          Noch etwas dazu?
        </h3>
        <p className="text-sm" style={{ color: '#6b7c72' }}>
          Du hast <strong>{item.name}</strong> gewählt.
        </p>
        <div className="space-y-2">
          {upsells.map((u) => (
            <button
              key={u.id}
              onClick={() => toggle(u.id)}
              className="w-full flex items-center justify-between p-3 rounded-xl transition-all text-left"
              style={{
                border: selected.includes(u.id) ? '2px solid #22c55e' : '2px solid #d1fae5',
                background: selected.includes(u.id) ? '#f0fdf4' : '#fff',
              }}
            >
              <span className="font-semibold text-sm" style={{ color: '#0f1a12' }}>{u.label}</span>
              <span className="font-bold text-sm" style={{ color: '#16a34a' }}>
                +{Number(u.price).toFixed(2).replace('.', ',')} €
              </span>
            </button>
          ))}
        </div>
        <div className="flex gap-3 pt-1">
          <button
            onClick={onSkip}
            className="flex-1 py-3 rounded-xl font-semibold text-sm transition-colors"
            style={{ border: '1.5px solid #d1fae5', color: '#3d5c47', background: '#fff' }}
          >
            Überspringen
          </button>
          <button
            onClick={() =>
              onConfirm(
                upsells
                  .filter((u) => selected.includes(u.id))
                  .map((u) => ({ id: u.id, label: u.label, price: Number(u.price) })),
              )
            }
            className="flex-1 py-3 rounded-xl font-extrabold text-sm text-white transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}
          >
            {selected.length > 0 ? `Hinzufügen (${selected.length})` : 'Weiter'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Step Dot ─────────────────────────────────────────────────────────────────

function StepDot({ n, state }: { n: number; state: 'pending' | 'active' | 'done' }) {
  const bg =
    state === 'active'
      ? 'linear-gradient(135deg, #22c55e, #16a34a)'
      : state === 'done'
      ? '#16a34a'
      : '#d1fae5'
  const color = state === 'pending' ? '#6b9e7a' : '#fff'
  return (
    <div
      className="flex items-center justify-center flex-shrink-0 font-extrabold text-xs transition-all"
      style={{
        width: 28, height: 28, borderRadius: '50%',
        background: bg, color,
        boxShadow: state === 'active' ? '0 6px 28px rgba(34,197,94,0.40)' : 'none',
      }}
    >
      {state === 'done' ? '✓' : n}
    </div>
  )
}

function StepLine({ done }: { done: boolean }) {
  return (
    <div
      className="flex-1 transition-all"
      style={{ height: 2, background: done ? '#16a34a' : '#d1fae5' }}
    />
  )
}

// ─── Summary Card ─────────────────────────────────────────────────────────────

function SummaryCard({ cart }: { cart: CartItem[] }) {
  const total = cartTotal(cart)
  const count = cartCount(cart)

  // Build tag labels from cart items
  const tags = cart.flatMap((i) => [i.name, ...i.upsells.map((u) => u.label)]).slice(0, 6)

  return (
    <div
      className="rounded-2xl p-5 mb-5 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #14532d, #166534)' }}
    >
      {/* Glow orb */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: -30, right: -30, width: 100, height: 100, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(34,197,94,0.22), transparent 70%)',
        }}
      />
      <span style={{ fontSize: 28, display: 'block', marginBottom: 10 }}>🥣</span>
      <h2 className="font-black text-white mb-1" style={{ fontSize: 18 }}>
        {count} {count === 1 ? 'Artikel' : 'Artikel'} in deiner Bestellung
      </h2>
      <p className="text-sm mb-3" style={{ color: 'rgba(255,255,255,0.65)', lineHeight: 1.4 }}>
        {cart.map((i) => `${i.quantity}× ${i.name}`).join(' · ')}
      </p>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-0">
          {tags.map((t, i) => (
            <span
              key={i}
              className="text-xs"
              style={{
                background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.18)',
                borderRadius: 50, padding: '3px 10px',
                color: 'rgba(255,255,255,0.85)',
              }}
            >
              {t}
            </span>
          ))}
        </div>
      )}
      <div
        className="flex items-center justify-between mt-3 pt-3"
        style={{ borderTop: '1px solid rgba(255,255,255,0.15)' }}
      >
        <span className="text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>Gesamtpreis</span>
        <span className="font-black text-white" style={{ fontSize: 22 }}>
          {total.toFixed(2).replace('.', ',')} €
        </span>
      </div>
    </div>
  )
}

// ─── Cart Bar (Menu view) ─────────────────────────────────────────────────────

function CartBar({
  cart,
  onCheckout,
  restaurantPhone,
  restaurantName,
  table,
}: {
  cart: CartItem[]
  onCheckout: () => void
  restaurantPhone: string | null
  restaurantName: string
  table: string | null
}) {
  if (cart.length === 0) return null
  const total = cartTotal(cart)
  const count = cartCount(cart)
  const waUrl = restaurantPhone
    ? buildWhatsAppUrl(cart, restaurantName, restaurantPhone, table, '', null)
    : null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 p-3 pointer-events-none">
      <div className="max-w-md mx-auto pointer-events-auto flex flex-col gap-2">
        {waUrl && (
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm text-white shadow-lg"
            style={{ background: '#25D366', textDecoration: 'none' }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zm-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884zm8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
            </svg>
            Schnell per WhatsApp
          </a>
        )}
        <button
          onClick={onCheckout}
          className="w-full flex items-center justify-between px-5 py-4 rounded-2xl text-white font-extrabold text-base shadow-2xl transition-all hover:-translate-y-0.5 active:scale-[0.98]"
          style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', boxShadow: '0 6px 28px rgba(34,197,94,0.40)' }}
        >
          <span
            className="rounded-full px-3 py-1 text-sm font-bold"
            style={{ background: 'rgba(255,255,255,0.20)' }}
          >
            {count}×
          </span>
          <span>Zur Kasse →</span>
          <span className="text-base font-black">{total.toFixed(2).replace('.', ',')} €</span>
        </button>
      </div>
    </div>
  )
}

// ─── Checkout View ────────────────────────────────────────────────────────────

function CheckoutView({
  cart,
  tenant,
  table,
  accessToken,
  scanId,
  onBack,
  onSuccess,
}: {
  cart: CartItem[]
  tenant: Restaurant
  table: string | null
  accessToken: string | null
  scanId?: string | null
  onBack: () => void
  onSuccess: (data: { orderId: string; total: number; isDemo: boolean; customerName: string; pickupTime: string | null; loyaltyEnabled: boolean }) => void
}) {
  const [step, setStep] = useState<1 | 2>(1)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [orderType, setOrderType] = useState<OrderType | null>(null)
  const [pickupTime, setPickupTime] = useState<string | null>(null)
  const [tableNumber, setTableNumber] = useState(table ?? '')
  const [address, setAddress] = useState('')
  const [orderNote, setOrderNote] = useState('')
  const [loyaltyEnabled, setLoyaltyEnabled] = useState(true)
  const [errors, setErrors] = useState({ name: false, phone: false, orderType: false, time: false, address: false })
  const [isPending, startTransition] = useTransition()
  const [apiError, setApiError] = useState<string | null>(null)

  const total = cartTotal(cart)

  const waUrl =
    tenant.phone && customerPhone
      ? buildWhatsAppUrl(cart, tenant.name, tenant.phone, tableNumber || table, customerName, pickupTime, orderType, address)
      : tenant.phone
      ? buildWhatsAppUrl(cart, tenant.name, tenant.phone, tableNumber || table, '', pickupTime, orderType, address)
      : null

  function validate() {
    const e = {
      name: !customerName.trim(),
      phone: customerPhone.replace(/\s/g, '').length < 6,
      orderType: !orderType,
      time: orderType === 'pickup' && !pickupTime,
      address: orderType === 'delivery' && !address.trim(),
    }
    setErrors(e)
    if (navigator.vibrate && Object.values(e).some(Boolean)) navigator.vibrate([50])
    return !Object.values(e).some(Boolean)
  }

  function goStep2() {
    if (!validate()) return
    setStep(2)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function goStep1() {
    setStep(1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function submitOrder() {
    setApiError(null)
    startTransition(async () => {
      const payload: OrderPayload = {
        items: cart.map((c) => ({
          item_id: c.item_id,
          quantity: c.quantity,
          upsell_ids: c.upsells.map((u) => u.id),
          notes: orderNote || undefined,
        })),
        table_number: table,
        lang: tenant.default_lang,
        notes: orderNote || undefined,
        scan_id: scanId || undefined,
      }
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' }
        if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`
        const res = await fetch(`/api/${tenant.slug}/orders`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        })
        const data: OrderResponse = await res.json()
        if (data.success) {
          onSuccess({
            orderId: data.order_id,
            total: data.total,
            isDemo: data.demo,
            customerName: customerName.trim(),
            pickupTime,
            loyaltyEnabled,
          })
        } else {
          setApiError(data.error)
        }
      } catch {
        setApiError('Netzwerkfehler — bitte erneut versuchen.')
      }
    })
  }

  return (
    <div className="min-h-screen pb-12" style={{ background: '#f0fdf4', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-30 flex items-center gap-3 px-4"
        style={{ background: '#fff', borderBottom: '1px solid #d1fae5', padding: '14px 16px' }}
      >
        <button
          onClick={onBack}
          className="flex items-center justify-center flex-shrink-0 transition-colors"
          style={{ width: 36, height: 36, borderRadius: '50%', background: '#f0fdf4', border: 'none', cursor: 'pointer', fontSize: 18, color: '#0f1a12' }}
          aria-label="Zurück"
        >
          ←
        </button>
        <h1 className="flex-1 font-extrabold" style={{ fontSize: 17, color: '#0f1a12' }}>
          {step === 1 ? 'Deine Angaben' : 'Bestätigung'}
        </h1>
        {tenant.is_demo && (
          <span className="text-xs px-2 py-1 rounded-full font-semibold" style={{ background: '#fef3c7', color: '#92400e' }}>
            Demo
          </span>
        )}
      </header>

      <div className="max-w-md mx-auto px-4 pt-5">
        {/* Step Indicator */}
        <div className="flex items-center gap-0 mb-6">
          <StepDot n={1} state={step === 1 ? 'active' : 'done'} />
          <StepLine done={step === 2} />
          <StepDot n={2} state={step === 2 ? 'active' : 'pending'} />
          <StepLine done={false} />
          <StepDot n={3} state="pending" />
        </div>

        {/* Summary Card */}
        <SummaryCard cart={cart} />

        {/* ── STEP 1 ─────────────────────────────────────────────── */}
        {step === 1 && (
          <>
            <p
              className="font-bold uppercase tracking-widest mb-3"
              style={{ fontSize: 11, color: '#6b7c72' }}
            >
              Schritt 1 — Deine Daten
            </p>

            {/* Contact Card */}
            <div
              className="rounded-2xl p-5 mb-3.5 shadow-sm"
              style={{ background: '#fff', border: '1px solid #d1fae5' }}
            >
              <h3 className="font-extrabold mb-4" style={{ fontSize: 15, color: '#0f1a12' }}>
                📱 Kontakt & Abholung
              </h3>

              {/* Name */}
              <div className="mb-3">
                <label className="block text-xs font-semibold mb-1.5" style={{ color: '#6b7c72', letterSpacing: '0.03em' }}>
                  Name
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => { setCustomerName(e.target.value); setErrors((er) => ({ ...er, name: false })) }}
                  placeholder="Dein Vorname"
                  autoComplete="given-name"
                  className="w-full rounded-xl font-medium outline-none transition-all"
                  style={{
                    padding: '14px', fontSize: 16,
                    background: '#f8fdf9', border: `1.5px solid ${errors.name ? '#ef4444' : '#d1fae5'}`,
                    color: '#0f1a12', fontFamily: 'inherit',
                  }}
                />
                {errors.name && <p className="text-xs mt-1" style={{ color: '#ef4444' }}>Bitte deinen Namen eingeben</p>}
              </div>

              {/* Phone */}
              <div className="mb-4">
                <label className="block text-xs font-semibold mb-1.5" style={{ color: '#6b7c72', letterSpacing: '0.03em' }}>
                  Handynummer
                </label>
                <div className="relative">
                  <span
                    className="absolute font-semibold pointer-events-none"
                    style={{ left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 15, color: '#6b7c72' }}
                  >
                    +49
                  </span>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => { setCustomerPhone(e.target.value); setErrors((er) => ({ ...er, phone: false })) }}
                    placeholder="015X XXXXXXXX"
                    inputMode="tel"
                    autoComplete="tel"
                    className="w-full rounded-xl font-medium outline-none transition-all"
                    style={{
                      padding: '14px 14px 14px 46px', fontSize: 16,
                      background: '#f8fdf9', border: `1.5px solid ${errors.phone ? '#ef4444' : '#d1fae5'}`,
                      color: '#0f1a12', fontFamily: 'inherit',
                    }}
                  />
                </div>
                {errors.phone && <p className="text-xs mt-1" style={{ color: '#ef4444' }}>Bitte eine gültige Nummer eingeben</p>}
              </div>

              {/* Order Type selector */}
              <p className="font-bold uppercase tracking-widest mb-2 mt-2" style={{ fontSize: 11, color: '#6b7c72' }}>
                Wie möchtest du bestellen?
              </p>
              {errors.orderType && <p className="text-xs mb-2" style={{ color: '#ef4444' }}>Bitte eine Option wählen</p>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                {ORDER_TYPES.map(({ id, emoji, label, sub }) => {
                  const selected = orderType === id
                  return (
                    <button
                      key={id}
                      onClick={() => { setOrderType(id); setErrors((er) => ({ ...er, orderType: false })); setPickupTime(null); if (navigator.vibrate) navigator.vibrate(8) }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 14,
                        padding: '14px 16px',
                        background: selected ? 'linear-gradient(135deg,#dcfce7,#bbf7d0)' : '#f8fdf9',
                        border: `2px solid ${selected ? '#22c55e' : errors.orderType ? '#ef4444' : '#d1fae5'}`,
                        borderRadius: 14, cursor: 'pointer', textAlign: 'left',
                        boxShadow: selected ? '0 4px 16px rgba(34,197,94,0.18)' : 'none',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: selected ? 'rgba(255,255,255,0.5)' : '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                        {emoji}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 14, fontWeight: 800, color: selected ? '#15803d' : '#0f1a12' }}>{label}</div>
                        <div style={{ fontSize: 12, color: selected ? '#16a34a' : '#6b7c72', marginTop: 2 }}>{sub}</div>
                      </div>
                      <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${selected ? '#22c55e' : '#d1fae5'}`, background: selected ? '#22c55e' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff', flexShrink: 0, transition: 'all 0.2s' }}>
                        {selected ? '✓' : ''}
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* PICKUP: time slots */}
              {orderType === 'pickup' && (
                <div style={{ marginBottom: 14 }}>
                  <p className="font-bold uppercase tracking-widest mb-2" style={{ fontSize: 11, color: '#6b7c72' }}>Abholzeit wählen</p>
                  {errors.time && <p className="text-xs mb-2" style={{ color: '#ef4444' }}>Bitte eine Abholzeit wählen</p>}
                  <div className="grid grid-cols-3 gap-2">
                    {TIME_SLOTS.map((slot) => {
                      const isSel = pickupTime === slot
                      return (
                        <button key={slot}
                          onClick={() => { setPickupTime(slot); setErrors((er) => ({ ...er, time: false })); if (navigator.vibrate) navigator.vibrate(8) }}
                          className="rounded-xl text-center transition-all"
                          style={{ padding: '11px 6px', background: isSel ? 'linear-gradient(135deg,#dcfce7,#bbf7d0)' : '#f8fdf9', border: `1.5px solid ${errors.time && !pickupTime ? '#ef4444' : isSel ? '#22c55e' : '#d1fae5'}`, cursor: 'pointer' }}>
                          <div className="font-extrabold" style={{ fontSize: 13, color: isSel ? '#15803d' : '#3d5c47' }}>{slot}</div>
                          <div style={{ fontSize: 11, color: isSel ? '#15803d' : '#6b7c72', marginTop: 2 }}>ca. 15 Min</div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* DINE-IN: table number */}
              {orderType === 'dine-in' && (
                <div style={{ marginBottom: 14, padding: '14px 16px', background: '#f8fdf9', borderRadius: 14, border: '1px solid #d1fae5' }}>
                  <p className="font-bold mb-2" style={{ fontSize: 13, color: '#0f1a12' }}>🪑 Tischnummer (optional)</p>
                  <p style={{ fontSize: 12, color: '#6b7c72', marginBottom: 10 }}>Du kannst auch ohne Tischnummer bestellen — wir finden dich.</p>
                  <input type="text" value={tableNumber} onChange={e => setTableNumber(e.target.value)}
                    placeholder="z.B. Tisch 4 oder Ecktisch links"
                    style={{ width: '100%', padding: '12px 14px', background: '#fff', border: '1.5px solid #d1fae5', borderRadius: 10, fontSize: 15, color: '#0f1a12', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, padding: '8px 12px', background: '#f0fdf4', borderRadius: 8 }}>
                    <span>⚡</span>
                    <p style={{ fontSize: 12, color: '#6b7c72', margin: 0 }}>Deine Bowl wird sofort nach Eingang zubereitet.</p>
                  </div>
                </div>
              )}

              {/* DELIVERY: address + optional time */}
              {orderType === 'delivery' && (
                <div style={{ marginBottom: 14, padding: '14px 16px', background: '#f8fdf9', borderRadius: 14, border: `1.5px solid ${errors.address ? '#ef4444' : '#d1fae5'}` }}>
                  <p className="font-bold mb-2" style={{ fontSize: 13, color: '#0f1a12' }}>📍 Lieferadresse</p>
                  <input type="text" value={address} onChange={e => { setAddress(e.target.value); setErrors(er => ({ ...er, address: false })) }}
                    placeholder="z.B. Borneplatz 2, 48431 Rheine"
                    autoComplete="street-address"
                    style={{ width: '100%', padding: '12px 14px', background: '#fff', border: `1.5px solid ${errors.address ? '#ef4444' : '#d1fae5'}`, borderRadius: 10, fontSize: 15, color: '#0f1a12', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 8 }} />
                  {errors.address && <p className="text-xs" style={{ color: '#ef4444', marginBottom: 8 }}>Bitte Adresse angeben</p>}
                  <p className="font-bold uppercase tracking-widest mb-2" style={{ fontSize: 11, color: '#6b7c72' }}>Wunschzeit (optional)</p>
                  <div className="grid grid-cols-3 gap-2">
                    {TIME_SLOTS.map((slot) => {
                      const isSel = pickupTime === slot
                      return (
                        <button key={slot}
                          onClick={() => { setPickupTime(isSel ? null : slot); if (navigator.vibrate) navigator.vibrate(8) }}
                          className="rounded-xl text-center transition-all"
                          style={{ padding: '11px 6px', background: isSel ? 'linear-gradient(135deg,#dcfce7,#bbf7d0)' : '#fff', border: `1.5px solid ${isSel ? '#22c55e' : '#d1fae5'}`, cursor: 'pointer' }}>
                          <div className="font-extrabold" style={{ fontSize: 13, color: isSel ? '#15803d' : '#3d5c47' }}>{slot}</div>
                          <div style={{ fontSize: 11, color: isSel ? '#15803d' : '#6b7c72', marginTop: 2 }}>Wunsch</div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Loyalty Opt-In */}
            <div
              className="rounded-2xl mb-3.5 shadow-sm overflow-hidden"
              style={{ background: '#fff', border: '1px solid #d1fae5' }}
            >
              <button
                onClick={() => setLoyaltyEnabled((v) => !v)}
                className="w-full flex items-start gap-3 text-left"
                style={{
                  padding: '14px 16px',
                  background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)',
                  border: '1.5px solid #22c55e',
                  borderRadius: 16,
                  cursor: 'pointer',
                }}
              >
                <div
                  className="flex items-center justify-center flex-shrink-0 font-bold text-sm transition-all"
                  style={{
                    width: 22, height: 22, borderRadius: 6, marginTop: 1,
                    border: '2px solid #16a34a',
                    background: loyaltyEnabled ? '#22c55e' : '#fff',
                    color: loyaltyEnabled ? '#fff' : 'transparent',
                  }}
                >
                  ✓
                </div>
                <div>
                  <div className="font-extrabold mb-0.5" style={{ fontSize: 14, color: '#15803d' }}>
                    🥣 Stempel sammeln aktivieren
                  </div>
                  <div style={{ fontSize: 12, color: '#15803d', lineHeight: 1.4 }}>
                    Nach 8 Bestellungen gibt&apos;s eine Gratis-Bowl.
                  </div>
                </div>
              </button>
            </div>

            {/* Notes */}
            <div
              className="rounded-2xl p-5 mb-4 shadow-sm"
              style={{ background: '#fff', border: '1px solid #d1fae5' }}
            >
              <h3 className="font-extrabold mb-3" style={{ fontSize: 15, color: '#0f1a12' }}>
                📝 Anmerkungen (optional)
              </h3>
              <textarea
                value={orderNote}
                onChange={(e) => setOrderNote(e.target.value)}
                placeholder="z.B. kein Koriander, extra scharf, bitte Gabel einpacken…"
                rows={3}
                className="w-full rounded-xl outline-none resize-none transition-all"
                style={{
                  padding: 14, fontSize: 15, lineHeight: 1.5,
                  background: '#f8fdf9', border: '1.5px solid #d1fae5',
                  color: '#0f1a12', fontFamily: 'inherit',
                }}
              />
            </div>

            {/* Next Button */}
            <button
              onClick={goStep2}
              className="w-full font-extrabold text-white transition-all hover:-translate-y-0.5 active:scale-[0.98]"
              style={{
                padding: '18px', borderRadius: 16, fontSize: 18, border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                boxShadow: '0 6px 28px rgba(34,197,94,0.40)',
                marginBottom: 12,
              }}
            >
              Weiter zur Bestätigung →
            </button>
          </>
        )}

        {/* ── STEP 2 ─────────────────────────────────────────────── */}
        {step === 2 && (
          <>
            <p
              className="font-bold uppercase tracking-widest mb-3"
              style={{ fontSize: 11, color: '#6b7c72' }}
            >
              Schritt 2 — Alles stimmt?
            </p>

            {apiError && (
              <div className="rounded-xl px-4 py-3 mb-3 text-sm font-semibold" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>
                ⚠️ {apiError}
              </div>
            )}

            <div
              className="rounded-2xl p-5 mb-4 shadow-sm"
              style={{ background: '#fff', border: '1px solid #d1fae5' }}
            >
              <h3 className="font-extrabold mb-4" style={{ fontSize: 15, color: '#0f1a12' }}>
                ✅ Bestellübersicht
              </h3>
              {[
                ['Name', customerName],
                ['Bestellart', `${ORDER_TYPES.find(o => o.id === orderType)?.emoji ?? ''} ${ORDER_TYPES.find(o => o.id === orderType)?.label ?? '—'}`],
                ...(orderType === 'pickup' && pickupTime ? [['Abholzeit', `${pickupTime} Uhr`]] : []),
                ...(orderType === 'dine-in' && tableNumber ? [['Tisch', tableNumber]] : []),
                ...(orderType === 'delivery' ? [['Lieferung', address], ...(pickupTime ? [['Wunschzeit', `${pickupTime} Uhr`]] : [])] : []),
                ...cart.map((i) => [
                  `${i.quantity}× ${i.name}`,
                  `${((i.price + i.upsells.reduce((s, u) => s + u.price, 0)) * i.quantity).toFixed(2).replace('.', ',')} €`,
                ]),
                ['Gesamt', `${cartTotal(cart).toFixed(2).replace('.', ',')} €`],
                ['Treuecard', loyaltyEnabled ? '✅ Stempel wird vergeben' : '❌ Nicht aktiviert'],
              ].map(([k, v], idx) => (
                <div
                  key={idx}
                  className="flex justify-between py-1.5"
                  style={{
                    fontSize: 14,
                    fontWeight: k === 'Gesamt' ? 700 : 400,
                    borderTop: k === 'Gesamt' ? '1px solid #d1fae5' : 'none',
                    marginTop: k === 'Gesamt' ? 6 : 0,
                    paddingTop: k === 'Gesamt' ? 10 : 6,
                  }}
                >
                  <span style={{ color: '#6b7c72' }}>{k}</span>
                  <span style={{ color: '#0f1a12', fontWeight: k === 'Gesamt' ? 800 : 600 }}>{v}</span>
                </div>
              ))}
            </div>

            {/* WhatsApp alternative */}
            {waUrl && (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 font-bold text-sm text-white rounded-2xl mb-3 transition-all hover:opacity-90"
                style={{ padding: '14px', background: '#25D366', textDecoration: 'none', display: 'flex' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zm-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884zm8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
                </svg>
                Stattdessen per WhatsApp senden
              </a>
            )}

            {/* Submit */}
            <button
              onClick={submitOrder}
              disabled={isPending}
              className="w-full font-extrabold text-white transition-all hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0"
              style={{
                padding: '18px', borderRadius: 16, fontSize: 18, border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                boxShadow: '0 6px 28px rgba(34,197,94,0.40)',
                marginBottom: 12,
              }}
            >
              {isPending ? '⏳ Wird übermittelt…' : '🥣 Jetzt verbindlich bestellen'}
            </button>
            <button
              onClick={goStep1}
              className="w-full font-bold transition-all"
              style={{
                padding: '14px', borderRadius: 16, fontSize: 15, border: '1.5px solid #d1fae5',
                background: 'transparent', color: '#3d5c47', cursor: 'pointer',
              }}
            >
              ← Zurück bearbeiten
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Success View ─────────────────────────────────────────────────────────────

function SuccessView({
  orderId,
  total,
  isDemo,
  customerName,
  pickupTime,
  loyaltyEnabled,
  tenantSlug,
  onReset,
}: {
  orderId: string
  total: number
  isDemo: boolean
  customerName: string
  pickupTime: string | null
  loyaltyEnabled: boolean
  tenantSlug: string
  onReset: () => void
}) {
  useEffect(() => {
    launchConfetti()
  }, [])

  return (
    <>
      <style>{`
        @keyframes _cfFall {
          0%   { transform: translateY(-10px) rotate(0);      opacity: 1; }
          100% { transform: translateY(120px) rotate(720deg); opacity: 0; }
        }
        @keyframes _sEmoji {
          0%   { transform: scale(0.5) rotate(-10deg); opacity: 0; }
          60%  { transform: scale(1.15) rotate(3deg);  opacity: 1; }
          100% { transform: scale(1) rotate(0);         opacity: 1; }
        }
      `}</style>
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6 text-center pb-10"
        style={{ background: '#f0fdf4', fontFamily: 'Inter, system-ui, sans-serif' }}
      >
        <div style={{ fontSize: 64, marginBottom: 20, animation: '_sEmoji 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards' }}>
          🎉
        </div>
        <h2
          className="font-black mb-2.5"
          style={{ fontSize: 26, color: '#0f1a12', fontFamily: 'system-ui, sans-serif' }}
        >
          {isDemo ? 'Demo-Bestellung!' : 'Bestellung eingegangen!'}
        </h2>
        <p style={{ fontSize: 15, color: '#6b7c72', lineHeight: 1.6, maxWidth: 300, marginBottom: 6 }}>
          {isDemo
            ? 'Das war eine Demo — keine echten Daten wurden gespeichert.'
            : 'Du erhältst in Kürze eine Bestätigung. Deine Bowl wird vorbereitet! 🥣'}
        </p>

        {/* Detail Card */}
        <div
          className="w-full text-left rounded-2xl my-5"
          style={{
            maxWidth: 360, background: '#fff',
            border: '1px solid #d1fae5', padding: '16px 20px',
          }}
        >
          {[
            ['Name', customerName || '—'],
            ['Abholung', pickupTime ? `${pickupTime} Uhr` : '—'],
            ['Gesamt', `${total.toFixed(2).replace('.', ',')} €`],
            ['Status', isDemo ? '🎯 Demo' : '📡 Wird vorbereitet…'],
            ...(!isDemo ? [['Bestellnr.', `#${orderId.slice(0, 8).toUpperCase()}`]] : []),
          ].map(([k, v], i) => (
            <div key={i} className="flex justify-between py-1.5" style={{ fontSize: 14 }}>
              <span style={{ color: '#6b7c72' }}>{k}</span>
              <span style={{ fontWeight: 600, color: '#0f1a12' }}>{v}</span>
            </div>
          ))}
        </div>

        {/* Stamp Info */}
        {loyaltyEnabled && !isDemo && (
          <div
            className="w-full rounded-2xl mb-6"
            style={{
              maxWidth: 360,
              background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)',
              padding: '14px 16px',
            }}
          >
            <p style={{ fontSize: 14, color: '#15803d', margin: 0 }}>
              🥣 <strong>+1 Stempel</strong> wurde deiner Treuecard gutgeschrieben!
            </p>
          </div>
        )}

        <a
          href={`/${tenantSlug}`}
          className="inline-flex items-center justify-center font-extrabold text-white transition-all hover:-translate-y-0.5"
          style={{
            padding: '16px 32px', borderRadius: 16, fontSize: 16,
            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
            boxShadow: '0 6px 28px rgba(34,197,94,0.40)',
            textDecoration: 'none', marginBottom: 12,
          }}
        >
          🏠 Zurück zur Startseite
        </a>
        <button
          onClick={onReset}
          style={{
            fontSize: 14, color: '#6b7c72', background: 'none',
            border: 'none', cursor: 'pointer', padding: 8,
          }}
        >
          Neue Bestellung aufgeben
        </button>
      </div>
    </>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function OrderClient({ tenant, menu, upsells, table, scanId }: Props) {
  const [cart, setCart] = useState<CartItem[]>([])
  const [upsellFor, setUpsellFor] = useState<MenuItem | null>(null)
  const [activeCategory, setActiveCategory] = useState<string>(menu[0]?.id ?? '')
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [view, setView] = useState<View>('menu')
  const [successData, setSuccessData] = useState<{
    orderId: string; total: number; isDemo: boolean
    customerName: string; pickupTime: string | null; loyaltyEnabled: boolean
  } | null>(null)
  const [orderError, setOrderError] = useState<string | null>(null)

  useEffect(() => {
    supabaseClient.auth.getSession().then(({ data }) => {
      setAccessToken(data.session?.access_token ?? null)
    })
  }, [])

  // ── Inject keyframes once ────────────────────────────────────────────────────
  useEffect(() => {
    if (document.getElementById('_cfStyle')) return
    const s = document.createElement('style')
    s.id = '_cfStyle'
    s.textContent = `
      @keyframes _cfFall {
        0%   { transform: translateY(-10px) rotate(0);      opacity: 1; }
        100% { transform: translateY(120px) rotate(720deg); opacity: 0; }
      }
    `
    document.head.appendChild(s)
  }, [])

  // ── Cart Logic ───────────────────────────────────────────────────────────────

  const addToCart = useCallback((item: MenuItem, selectedUpsells: CartUpsell[]) => {
    setCart((prev) => {
      if (selectedUpsells.length === 0) {
        const existing = prev.find((c) => c.item_id === item.id && c.upsells.length === 0)
        if (existing) {
          return prev.map((c) => c.cartKey === existing.cartKey ? { ...c, quantity: c.quantity + 1 } : c)
        }
      }
      return [
        ...prev,
        {
          cartKey: `${item.id}-${Date.now()}`,
          item_id: item.id,
          name: item.name,
          price: Number(item.price),
          quantity: 1,
          upsells: selectedUpsells,
        },
      ]
    })
    setUpsellFor(null)
  }, [])

  const handleItemClick = (item: MenuItem) => {
    if (upsells.length > 0) setUpsellFor(item)
    else addToCart(item, [])
    if (navigator.vibrate) navigator.vibrate(8)
  }

  const removeCartItem = (cartKey: string) =>
    setCart((prev) => prev.filter((c) => c.cartKey !== cartKey))

  const updateQty = (cartKey: string, delta: number) =>
    setCart((prev) =>
      prev
        .map((c) => c.cartKey === cartKey ? { ...c, quantity: c.quantity + delta } : c)
        .filter((c) => c.quantity > 0),
    )

  // ── Success ─────────────────────────────────────────────────────────────────

  if (view === 'success' && successData) {
    return (
      <SuccessView
        {...successData}
        tenantSlug={tenant.slug}
        onReset={() => {
          setCart([])
          setSuccessData(null)
          setView('menu')
        }}
      />
    )
  }

  // ── Checkout ─────────────────────────────────────────────────────────────────

  if (view === 'checkout') {
    return (
      <CheckoutView
        cart={cart}
        tenant={tenant}
        table={table}
        accessToken={accessToken}
        scanId={scanId}
        onBack={() => setView('menu')}
        onSuccess={(data) => {
          setSuccessData(data)
          setView('success')
        }}
      />
    )
  }

  // ── Menu View ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen pb-36" style={{ background: '#f0fdf4', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800;900&display=swap');`}</style>
      {/* Demo Banner */}
      {tenant.is_demo && (
        <div className="text-center text-sm py-2 font-semibold text-white" style={{ background: '#f59e0b' }}>
          🎯 Demo-Modus — Bestellungen werden nicht gespeichert
        </div>
      )}

      {/* Error Banner */}
      {orderError && (
        <div className="text-center text-sm py-2 font-semibold text-white" style={{ background: '#ef4444' }}>
          ⚠️ {orderError}
        </div>
      )}

      {/* Header */}
      <header
        className="sticky top-0 z-30"
        style={{ background: '#fff', borderBottom: '1px solid #d1fae5' }}
      >
        <div className="max-w-md mx-auto px-4 py-3.5 flex items-center justify-between">
          <Link
            href={`/${tenant.slug}`}
            aria-label={`Zurück zur Startseite von ${tenant.name}`}
            style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}
          >
            <span
              aria-hidden
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 28, height: 28, borderRadius: 999,
                background: '#f0fdf4', color: '#15803d', flexShrink: 0,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
            </span>
            <span>
              <h1 className="font-black" style={{ fontSize: 19, color: '#15803d', margin: 0 }}>
                {tenant.name}
              </h1>
              {table ? (
                <p className="text-xs mt-0.5" style={{ color: '#6b7c72', margin: 0 }}>Tisch {table}</p>
              ) : (
                <p className="text-xs mt-0.5" style={{ color: '#6b7c72', margin: 0 }}>Bestellseite</p>
              )}
            </span>
          </Link>
          {cart.length > 0 && (
            <div
              className="text-xs font-bold px-3 py-1 rounded-full"
              style={{ background: '#dcfce7', color: '#15803d' }}
            >
              {cartCount(cart)} im Korb
            </div>
          )}
        </div>

        {/* One-Click Reorder */}
        <OneClickReorder
          restaurantId={tenant.id}
          accentColor={tenant.primary_color}
          onReorder={(items) => {
            setCart(items)
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
        />

        {/* Category Nav */}
        <nav className="max-w-md mx-auto px-4 pb-3 flex gap-2 overflow-x-auto">
          {menu.map((cat) => {
            const isActive = activeCategory === cat.id
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat.id)
                  document.getElementById(`cat-${cat.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }}
                className="whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-semibold transition-all flex-shrink-0"
                style={
                  isActive
                    ? { background: '#22c55e', color: '#fff' }
                    : { background: '#f0fdf4', color: '#3d5c47', border: '1px solid #d1fae5' }
                }
              >
                {cat.name}
              </button>
            )
          })}
        </nav>
      </header>

      {/* Menu */}
      <main className="max-w-md mx-auto px-4 py-4 space-y-8">
        {menu.length === 0 ? (
          <p className="text-center py-16" style={{ color: '#6b7c72' }}>
            Das Menü wird gerade aktualisiert.
          </p>
        ) : (
          menu.map((cat) => (
            <section key={cat.id} id={`cat-${cat.id}`} className="scroll-mt-36">
              <h2 className="font-extrabold mb-3" style={{ fontSize: 17, color: '#0f1a12' }}>
                {cat.name}
              </h2>
              <div className="space-y-3">
                {cat.items.map((item) => {
                  const inCart = cart.filter((c) => c.item_id === item.id)
                  const totalQty = inCart.reduce((s, c) => s + c.quantity, 0)
                  const hasImage = !!item.image_url
                  return (
                    <div
                      key={item.id}
                      className="rounded-2xl shadow-sm transition-all overflow-hidden"
                      style={{
                        background: '#fff',
                        border: `1.5px solid ${totalQty > 0 ? '#22c55e' : '#d1fae5'}`,
                      }}
                    >
                      {/* Foto-Banner (falls vorhanden) */}
                      {hasImage && (
                        <div
                          style={{
                            width: '100%', height: 140, overflow: 'hidden',
                            background: '#f0fdf4', position: 'relative',
                          }}
                        >
                          <img
                            src={item.image_url!}
                            alt={item.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                          />
                          {totalQty > 0 && (
                            <span style={{
                              position: 'absolute', top: 8, right: 8,
                              background: '#22c55e', color: '#fff', borderRadius: 20,
                              padding: '2px 10px', fontWeight: 800, fontSize: 12,
                            }}>
                              {totalQty}×
                            </span>
                          )}
                        </div>
                      )}

                      <div className="p-4 flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold" style={{ fontSize: 15, color: '#0f1a12' }}>{item.name}</p>
                          {item.description && (
                            <p className="mt-0.5 line-clamp-2" style={{ fontSize: 12, color: '#6b7c72' }}>
                              {item.description}
                            </p>
                          )}
                          {/* Allergen-Badges */}
                          {item.allergens && item.allergens.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 5 }}>
                              {item.allergens.map((a, i) => (
                                <span key={i} style={{
                                  fontSize: 10, fontWeight: 700,
                                  background: '#fef3c7', color: '#92400e',
                                  padding: '1px 6px', borderRadius: 4,
                                }}>
                                  ⚠️ {a.name}
                                </span>
                              ))}
                            </div>
                          )}
                          <p className="mt-2 font-extrabold" style={{ fontSize: 15, color: '#16a34a' }}>
                            {Number(item.price).toFixed(2).replace('.', ',')} €
                          </p>
                        </div>

                        {/* Add/Remove Controls */}
                        {totalQty > 0 ? (
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              onClick={() => updateQty(inCart[0].cartKey, -1)}
                              className="flex items-center justify-center w-8 h-8 rounded-full font-bold text-lg transition-colors"
                              style={{ background: '#f0fdf4', border: '1.5px solid #d1fae5', color: '#15803d', cursor: 'pointer' }}
                            >
                              −
                            </button>
                            <span className="font-extrabold text-sm w-5 text-center" style={{ color: '#15803d' }}>
                              {totalQty}
                            </span>
                            <button
                              onClick={() => handleItemClick(item)}
                              className="flex items-center justify-center w-8 h-8 rounded-full font-bold text-lg text-white transition-colors"
                              style={{ background: '#22c55e', border: 'none', cursor: 'pointer' }}
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleItemClick(item)}
                            className="flex items-center justify-center flex-shrink-0 w-10 h-10 rounded-full font-bold text-xl text-white transition-all hover:scale-105 active:scale-95"
                            style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', border: 'none', cursor: 'pointer', boxShadow: '0 3px 12px rgba(34,197,94,0.35)', flexShrink: 0 }}
                          >
                            +
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          ))
        )}
      </main>

      {/* Upsell Modal */}
      {upsellFor && (
        <UpsellModal
          item={upsellFor}
          upsells={upsells}
          onConfirm={(sel) => addToCart(upsellFor, sel)}
          onSkip={() => addToCart(upsellFor, [])}
        />
      )}

      {/* Cart Bar */}
      <CartBar
        cart={cart}
        onCheckout={() => setView('checkout')}
        restaurantPhone={tenant.phone ?? null}
        restaurantName={tenant.name}
        table={table}
      />
    </div>
  )
}
