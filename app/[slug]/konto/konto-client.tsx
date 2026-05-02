'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { LogoutButton } from './logout-button'
import { SiteNav } from '../landing/site-nav'

const STAMPS_FOR_REWARD = 8

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })
}
function formatPrice(n: number) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n)
}

type Order = {
  id: string
  total: number
  status: string
  created_at: string
  items_count: number
}

type LastOrderItem = {
  item_id: string
  item_name: string
  quantity: number
  unit_price: number
}

type LastOrder = {
  id: string
  total: number
  created_at: string
  items: LastOrderItem[]
} | null

type Props = {
  slug: string
  tenantName: string
  tenantPhone: string | null
  displayName: string
  stamps: number
  totalStamps: number
  rewards: number
  orders: Order[]
  lastOrder: LastOrder
}

export function KontoClient({
  slug, tenantName, tenantPhone,
  displayName, stamps, totalStamps, rewards,
  orders, lastOrder,
}: Props) {
  const progressRef = useRef<HTMLDivElement>(null)
  const ordersCountRef = useRef<HTMLSpanElement>(null)
  const rewardsCountRef = useRef<HTMLSpanElement>(null)

  // Animate count-up
  function animateCount(el: HTMLElement | null, to: number, duration = 800) {
    if (!el) return
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1)
      const ease = 1 - Math.pow(1 - p, 3)
      el.textContent = String(Math.round(to * ease))
      if (p < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }

  useEffect(() => {
    // Progress bar animate
    if (progressRef.current) {
      progressRef.current.style.width = `${Math.min((stamps / STAMPS_FOR_REWARD) * 100, 100)}%`
    }
    // Count-up
    setTimeout(() => {
      animateCount(ordersCountRef.current, orders.length + (rewards * STAMPS_FOR_REWARD))
      animateCount(rewardsCountRef.current, rewards)
    }, 300)
    // Scroll reveals
    const els = document.querySelectorAll('.vip-reveal')
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) (e.target as HTMLElement).classList.add('in') }),
      { threshold: 0.1 }
    )
    els.forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [stamps, rewards, orders.length])

  const savedEuros = rewards * 9.90
  const progress = Math.min((stamps / STAMPS_FOR_REWARD) * 100, 100)
  const initial = displayName.charAt(0).toUpperCase()

  // WhatsApp reorder
  const waPhone = tenantPhone?.replace(/\D/g, '') ?? ''
  function buildReorderText() {
    if (!lastOrder) return ''
    const items = lastOrder.items.map(i => `${i.quantity}× ${i.item_name}`).join(', ')
    return encodeURIComponent(
      `🥣 *Schnellbestellung – Odi's Bowl*\n\n${items}\n\n*Preis:* ${formatPrice(lastOrder.total)}\n\n_(Gleiche Bestellung wie beim letzten Mal)_`
    )
  }

  return (
    <div className="odis-landing odis-customer-site has-glass-nav" style={{ fontFamily: "'Inter', system-ui, sans-serif", background: '#0a0d0a', minHeight: '100dvh', paddingBottom: 48 }}>
      <SiteNav
        slug={slug}
        restaurantName={tenantName}
        isLoggedIn
        userInitial={initial}
      />

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '136px 16px 20px' }}>

        {/* ── WELCOME BANNER ─────────────────────────────────────── */}
        <div className="vip-reveal d1" style={{
          background: 'linear-gradient(135deg, #14532d, #166534)',
          borderRadius: 24, padding: '20px', marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 14,
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, background: 'radial-gradient(circle, rgba(34,197,94,0.2), transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
          <div style={{ width: 52, height: 52, background: 'rgba(255,255,255,0.12)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0 }}>
            {initial === displayName.charAt(0).toUpperCase() && /[a-zA-ZäöüÄÖÜ]/.test(initial) ? initial : '👤'}
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 18, fontWeight: 800, color: '#fff', marginBottom: 3 }}>
              Hey{displayName && !/^\+/.test(displayName) ? `, ${displayName}` : ''}! 👋
            </h3>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)' }}>
              {totalStamps > 0 ? `${totalStamps} Stempel gesammelt — du rockst das 🌿` : 'Willkommen bei Odi\'s Bowl!'}
            </p>
          </div>
          <LogoutButton slug={slug} />
        </div>

        {/* ── REWARD UNLOCK ─────────────────────────────────────── */}
        {stamps >= STAMPS_FOR_REWARD && (
          <div className="vip-reveal d2" style={{
            background: 'linear-gradient(135deg, #fefce8, #fef9c3)',
            border: '2px solid #fbbf24', borderRadius: 24,
            padding: 20, textAlign: 'center', marginBottom: 16,
          }}>
            <span style={{ fontSize: 40, display: 'block', marginBottom: 8 }}>🎉</span>
            <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 18, fontWeight: 800, color: '#92400e', marginBottom: 6 }}>
              Du hast's geschafft!
            </h3>
            <p style={{ fontSize: 14, color: '#78350f', marginBottom: 16, lineHeight: 1.5 }}>
              Du hast 8 Stempel gesammelt — deine Gratis-Bowl wartet. Zeig das beim Abholen.
            </p>
            {waPhone && (
              <a href={`https://wa.me/${waPhone}?text=${encodeURIComponent('🎁 Gratis-Bowl einlösen – Ich habe 8 Stempel gesammelt!')}`}
                target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-block', padding: '12px 24px', background: 'linear-gradient(135deg, #f59e0b, #d97706)', borderRadius: 16, fontSize: 15, fontWeight: 800, color: '#fff', textDecoration: 'none', boxShadow: '0 4px 20px rgba(245,158,11,0.4)' }}>
                🥣 Gratis-Bowl einlösen
              </a>
            )}
          </div>
        )}

        {/* ── STAMP CARD ────────────────────────────────────────── */}
        <p className="vip-reveal d2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 11, fontWeight: 700, color: '#6b7c72', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '20px 0 10px' }}>
          Deine Treuecard
        </p>
        <div className="vip-reveal d3" style={{ background: '#fff', borderRadius: 24, padding: '22px 20px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid #d1fae5', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 17, fontWeight: 800, color: '#0f1a12' }}>
              Stempelkarte
            </h3>
            <span style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: '#fff', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, fontWeight: 800, padding: '4px 12px', borderRadius: 50 }}>
              {stamps} / 8
            </span>
          </div>

          {/* Stamp Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={{
                aspectRatio: '1', borderRadius: 10,
                border: `2px solid ${i < stamps ? '#22c55e' : '#a7f3d0'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, position: 'relative',
                background: i < stamps ? 'linear-gradient(135deg, #dcfce7, #bbf7d0)' : '#d1fae5',
                animation: i < stamps ? `stampPop 0.5s cubic-bezier(0.34,1.56,0.64,1) ${100 + i * 80}ms both` : 'none',
              }}>
                {i < stamps ? '🥣' : ''}
                {i < stamps && (
                  <span style={{ position: 'absolute', bottom: 3, right: 5, fontSize: 10, fontWeight: 800, color: '#16a34a' }}>✓</span>
                )}
              </div>
            ))}
            {/* Reward stamp */}
            <div style={{
              gridColumn: 'span 4', aspectRatio: 'unset', padding: 14,
              background: 'linear-gradient(135deg, #14532d, #166534)',
              border: '2px solid #22c55e', borderRadius: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            }}>
              <span style={{ fontSize: 28 }}>🎁</span>
              <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 14, fontWeight: 800, color: '#fff' }}>
                Gratis-Bowl
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ height: 6, background: '#d1fae5', borderRadius: 99, overflow: 'hidden', marginBottom: 10 }}>
            <div ref={progressRef} style={{ height: '100%', width: '0%', background: 'linear-gradient(90deg, #22c55e, #16a34a)', borderRadius: 99, transition: 'width 1s cubic-bezier(0.4,0,0.2,1)' }} />
          </div>
          <p style={{ fontSize: 13, color: '#6b7c72', textAlign: 'center' }}>
            {stamps >= STAMPS_FOR_REWARD
              ? '🎉 Du hast 8 Stempel — deine Gratis-Bowl wartet!'
              : <>Noch <strong style={{ color: '#16a34a' }}>{STAMPS_FOR_REWARD - stamps}</strong> Bestellungen bis zur Gratis-Bowl 🥣</>}
          </p>
        </div>

        {/* ── QUICK REORDER ─────────────────────────────────────── */}
        {lastOrder && lastOrder.items.length > 0 && (
          <>
            <p className="vip-reveal d3" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 11, fontWeight: 700, color: '#6b7c72', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '20px 0 10px' }}>
              Schnell nochmal bestellen
            </p>
            <div className="vip-reveal d4" style={{ background: '#fff', borderRadius: 24, padding: '18px 20px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid #d1fae5', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 15, fontWeight: 800, color: '#0f1a12' }}>⚡ Letzte Bestellung</h3>
                <span style={{ fontSize: 12, color: '#6b7c72', background: '#f0fdf4', padding: '4px 10px', borderRadius: 50 }}>
                  {formatDate(lastOrder.created_at)}
                </span>
              </div>
              <div style={{ background: '#f8fdf9', borderRadius: 16, padding: '12px 14px', marginBottom: 14, border: '1px solid #d1fae5' }}>
                <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 14, fontWeight: 700, color: '#0f1a12', marginBottom: 4 }}>
                  {lastOrder.items.map(i => `${i.quantity}× ${i.item_name}`).join(', ')}
                </div>
                <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 16, fontWeight: 800, color: '#16a34a', marginTop: 8 }}>
                  {formatPrice(lastOrder.total)}
                </div>
              </div>
              {waPhone ? (
                <a href={`https://wa.me/${waPhone}?text=${buildReorderText()}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ display: 'block', width: '100%', padding: 14, background: 'linear-gradient(135deg, #22c55e, #16a34a)', border: 'none', borderRadius: 16, fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 15, fontWeight: 800, color: '#fff', cursor: 'pointer', textAlign: 'center', textDecoration: 'none', boxShadow: '0 6px 28px rgba(34,197,94,0.4)' }}>
                  🔄 Nochmal bestellen → WhatsApp
                </a>
              ) : (
                <Link href={`/${slug}/order`} style={{ display: 'block', padding: 14, background: 'linear-gradient(135deg, #22c55e, #16a34a)', borderRadius: 16, fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 15, fontWeight: 800, color: '#fff', textAlign: 'center', textDecoration: 'none' }}>
                  🔄 Nochmal bestellen
                </Link>
              )}
            </div>
          </>
        )}

        {/* ── STATS ─────────────────────────────────────────────── */}
        <p className="vip-reveal d4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 11, fontWeight: 700, color: '#6b7c72', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '20px 0 10px' }}>
          Deine Statistiken
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <div className="vip-reveal d1" style={{ background: '#fff', borderRadius: 16, padding: '18px 16px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid #d1fae5' }}>
            <span style={{ fontSize: 22, display: 'block', marginBottom: 8 }}>📦</span>
            <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 26, fontWeight: 900, color: '#0f1a12', lineHeight: 1, marginBottom: 4 }}>
              <span ref={ordersCountRef}>0</span>
            </div>
            <div style={{ fontSize: 12, color: '#6b7c72', fontWeight: 500 }}>Bestellungen</div>
          </div>
          <div className="vip-reveal d2" style={{ background: '#fff', borderRadius: 16, padding: '18px 16px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid #d1fae5' }}>
            <span style={{ fontSize: 22, display: 'block', marginBottom: 8 }}>🥣</span>
            <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 26, fontWeight: 900, color: '#0f1a12', lineHeight: 1, marginBottom: 4 }}>
              <span ref={rewardsCountRef}>0</span>
            </div>
            <div style={{ fontSize: 12, color: '#6b7c72', fontWeight: 500 }}>Gratis-Bowls</div>
          </div>
        </div>
        <div className="vip-reveal d3" style={{ background: 'linear-gradient(135deg, #14532d, #166534)', borderRadius: 16, padding: '18px 16px', display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
          <span style={{ fontSize: 32 }}>💸</span>
          <div>
            <h4 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 20, fontWeight: 900, color: '#fff', marginBottom: 4 }}>
              {formatPrice(savedEuros)} gespart
            </h4>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)' }}>Dank Treuecard insgesamt gespart</p>
          </div>
        </div>

        {/* ── ORDER HISTORY ──────────────────────────────────────── */}
        <p className="vip-reveal d4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 11, fontWeight: 700, color: '#6b7c72', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '20px 0 10px' }}>
          Bestellhistorie
        </p>
        <div className="vip-reveal d5" style={{ background: '#fff', borderRadius: 24, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid #d1fae5', overflow: 'hidden' }}>
          {orders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 20px', color: '#6b7c72' }}>
              <span style={{ fontSize: 40, display: 'block', marginBottom: 10 }}>📭</span>
              <p style={{ fontSize: 14, lineHeight: 1.5 }}>Noch keine Bestellungen. Deine erste Bowl wartet!</p>
              <Link href={`/${slug}/order`} style={{ display: 'inline-block', marginTop: 14, background: '#22c55e', color: '#fff', textDecoration: 'none', fontSize: 14, fontWeight: 700, padding: '10px 22px', borderRadius: 99 }}>
                Jetzt bestellen
              </Link>
            </div>
          ) : (
            orders.map((order, idx) => (
              <div key={order.id} style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14, borderBottom: idx < orders.length - 1 ? '1px solid #d1fae5' : 'none' }}>
                <div style={{ width: 44, height: 44, background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                  🥣
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 14, fontWeight: 700, color: '#0f1a12', marginBottom: 3 }}>
                    {order.items_count} {order.items_count === 1 ? 'Artikel' : 'Artikel'}
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7c72' }}>{formatDate(order.created_at)}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 14, fontWeight: 800, color: '#0f1a12', marginBottom: 4 }}>
                    {formatPrice(order.total)}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#15803d', background: '#dcfce7', padding: '2px 8px', borderRadius: 50 }}>
                    +1 Stempel
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* CTA Bestellen */}
        <div style={{ marginTop: 24 }}>
          <Link href={`/${slug}/order`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '16px', background: 'linear-gradient(135deg, #22c55e, #16a34a)', borderRadius: 16, fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 16, fontWeight: 800, color: '#fff', textDecoration: 'none', boxShadow: '0 6px 28px rgba(34,197,94,0.4)' }}>
            🍽️ Jetzt bestellen & Stempel sammeln
          </Link>
        </div>

      </div>

      <style>{`
        @keyframes stampPop {
          0%   { transform: scale(0.4) rotate(-10deg); opacity: 0; }
          60%  { transform: scale(1.2) rotate(3deg); opacity: 1; }
          80%  { transform: scale(0.94) rotate(-1deg); }
          100% { transform: scale(1) rotate(0); }
        }
        .vip-reveal { opacity: 0; transform: translateY(20px); transition: opacity 0.5s, transform 0.5s; }
        .vip-reveal.in { opacity: 1; transform: none; }
        .vip-reveal.d1 { transition-delay: 0.05s; }
        .vip-reveal.d2 { transition-delay: 0.10s; }
        .vip-reveal.d3 { transition-delay: 0.15s; }
        .vip-reveal.d4 { transition-delay: 0.20s; }
        .vip-reveal.d5 { transition-delay: 0.25s; }
      `}</style>
    </div>
  )
}
