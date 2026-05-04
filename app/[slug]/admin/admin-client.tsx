'use client'

import { useState, useEffect, useCallback, useRef, useSyncExternalStore } from 'react'
import { createClient } from '@supabase/supabase-js'
import { BestellungenView }   from './views/bestellungen-view'
import { KundenView }         from './views/kunden-view'
import { SpeisekarteView }    from './views/speisekarte-view'
import { TeamView }           from './views/team-view'
import { EinstellungenView }  from './views/einstellungen-view'
import { QrCodeView }         from './views/qr-view'

// ─── Types ─────────────────────────────────────────────────────────────────────

type OrderStatus = 'pending' | 'confirmed' | 'done'
type AdminView   = 'schicht' | 'bestellungen' | 'kunden' | 'speisekarte' | 'team' | 'qrcodes' | 'einstellungen'
type AdminRole   = 'owner' | 'admin' | 'staff'

// Which roles may access each view
const NAV_ACCESS: Record<AdminView, AdminRole[]> = {
  schicht:       ['owner', 'admin', 'staff'],
  bestellungen:  ['owner', 'admin', 'staff'],
  team:          ['owner', 'admin', 'staff'],
  kunden:        ['owner', 'admin'],
  speisekarte:   ['owner', 'admin'],
  qrcodes:       ['owner', 'admin'],
  einstellungen: ['owner'],
}

const ROLE_LABEL: Record<AdminRole, string> = {
  owner: 'Inhaber',
  admin: 'Admin',
  staff: 'Mitarbeiter',
}

const DEFAULT_VIEW_FOR_ROLE: Record<AdminRole, AdminView> = {
  owner: 'schicht',
  admin: 'schicht',
  staff: 'schicht',
}

type OrderItem = {
  id: string
  item_id: string | null
  item_name: string
  quantity: number
  unit_price: number
  modifiers: Record<string, string> | string | null
  upsells: unknown
  notes: string | null
}

type Order = {
  id: string; order_number: string | null; customer_name: string | null
  customer_phone: string | null; order_type: string | null; table_number: string | null
  status: OrderStatus; total: number; notes: string | null; created_at: string; updated_at: string
  gastro_order_items?: OrderItem[]
}

// ─── Constants ──────────────────────────────────────────────────────────────────

const POLL_MS          = 20_000
const OVERDUE_AFTER_MS = 30 * 60_000

const STATUS_LABEL: Record<OrderStatus, string> = { pending: 'Offen', confirmed: 'Bestätigt', done: 'Abgeholt' }
const ORDER_TYPE_LABEL: Record<string, string>  = { pickup: '🥡 Abholen', 'dine-in': '🪑 Vor Ort', delivery: '🛵 Liefern' }

// ─── Helpers ───────────────────────────────────────────────────────────────────

function fmtTime(iso: string) { return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) }
function fmtPrice(n: number) { return n.toFixed(2).replace('.', ',') + ' €' }
function shortNum(n: string | null) { return n ?? '—' }
function overdueMin(iso: string, now: number) { return Math.max(0, Math.floor((now - new Date(iso).getTime() - OVERDUE_AFTER_MS) / 60_000)) }
function fmtOverdue(m: number) { return m >= 60 ? `${Math.floor(m / 60)}:${(m % 60).toString().padStart(2, '0')} h` : `${m} Min` }

function renderModifiers(raw: OrderItem['modifiers']): string {
  if (!raw) return ''
  let parsed: unknown = raw
  if (typeof raw === 'string') {
    try { parsed = JSON.parse(raw) } catch { return raw }
  }
  if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
    return Object.entries(parsed as Record<string, string>).map(([k, v]) => `${k}: ${v}`).join(' · ')
  }
  return typeof parsed === 'string' ? parsed : ''
}

function playNewOrderSound() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    const playTone = (freq: number, start: number, dur: number) => {
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start)
      gain.gain.setValueAtTime(0.28, ctx.currentTime + start)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur)
      osc.start(ctx.currentTime + start)
      osc.stop(ctx.currentTime + start + dur)
    }
    playTone(880, 0,    0.12)
    playTone(1100, 0.14, 0.18)
  } catch { /* ignore — browser may block AudioContext */ }
}

// ─── Sidebar collapse ──────────────────────────────────────────────────────────

const SIDEBAR_KEY       = 'gastro_admin_sidebar_collapsed'
const sidebarListeners  = new Set<() => void>()

function getSidebarCollapsed() { return typeof window !== 'undefined' && localStorage.getItem(SIDEBAR_KEY) === '1' }
function subscribeSidebar(cb: () => void) { sidebarListeners.add(cb); return () => sidebarListeners.delete(cb) }
function toggleSidebar() { localStorage.setItem(SIDEBAR_KEY, getSidebarCollapsed() ? '0' : '1'); sidebarListeners.forEach(c => c()) }

// ─── Supabase ──────────────────────────────────────────────────────────────────

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

// ═══════════════════════════════════════════════════════
//  ICONS
// ═══════════════════════════════════════════════════════

function SchichtIcon() {
  return <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
}
function OrdersIcon() {
  return <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
}
function KundenIcon() {
  return <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
}
function MenuIcon() {
  return <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
}
function TeamIcon() {
  return <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
}
function SettingsIcon() {
  return <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
}
function GlobeIcon() {
  return <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
}
function LogoutIcon() {
  return <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
}
function QrIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 17.25h.75v.75h-.75v-.75zM17.25 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 18h.75v.75h-.75V18zM18 13.5h.75v.75H18v-.75zM15.75 15.75h.75v.75h-.75v-.75zM15.75 18.75h.75v.75h-.75v-.75zM18 16.5h.75v.75H18v-.75zM13.5 16.5h.75v.75h-.75v-.75z" />
    </svg>
  )
}

// ═══════════════════════════════════════════════════════
//  PIN LOGIN
// ═══════════════════════════════════════════════════════

function PinLogin({ slug, tenantName, onSuccess }: { slug: string; tenantName: string; onSuccess: (role: AdminRole) => void }) {
  const [pin, setPin]       = useState('')
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const [shake, setShake]   = useState(false)
  const inputRef            = useRef<HTMLInputElement>(null)
  useEffect(() => { inputRef.current?.focus() }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!pin.trim()) return
    setLoading(true); setError('')
    try {
      const res  = await fetch(`/api/${slug}/admin/auth`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin }) })
      const data = await res.json() as { ok: boolean; role?: AdminRole; error?: string }
      if (data.ok) { onSuccess(data.role ?? 'owner') }
      else {
        setError(data.error ?? 'Falscher PIN'); setPin(''); setShake(true)
        setTimeout(() => setShake(false), 500)
        if (navigator.vibrate) navigator.vibrate([80, 40, 80])
      }
    } catch { setError('Netzwerkfehler') } finally { setLoading(false) }
  }

  return (
    <div className="admin-login-screen">
      <div className="admin-login-card">
        {/* Brand icon — matches website .nav-logo-icon */}
        <div className="admin-login-icon">
          <div className="admin-login-icon-inner">🥗</div>
        </div>
        <h1>{tenantName}</h1>
        <p className="admin-login-sub">Admin-Bereich · nur für autorisierte Mitarbeiter</p>
        {error && <p className="admin-login-alert admin-login-alert-error">{error}</p>}
        <form onSubmit={submit} className="admin-login-form">
          <input ref={inputRef} type="password" value={pin} onChange={e => { setPin(e.target.value); setError('') }}
            placeholder="••••" inputMode="numeric" maxLength={8} autoComplete="off"
            className={`admin-login-pin-input${shake ? ' error-shake' : ''}`} />
          <button type="submit" disabled={loading || !pin.trim()} className="admin-login-btn">
            {loading ? 'Prüfe…' : 'Einloggen →'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
//  SCHICHT VIEW (inline — dashboard with live orders)
// ═══════════════════════════════════════════════════════

function SchichtView({ slug, onActiveCountChange }: { slug: string; onActiveCountChange?: (count: number) => void }) {
  const [orders, setOrders]           = useState<Order[]>([])
  const [loading, setLoading]         = useState(false)
  const [refreshFlash, setRefFlash]   = useState(false)
  const [patchingId, setPatching]     = useState<string | null>(null)
  const [error, setError]             = useState<string | null>(null)
  const [newOrderIds, setNewIds]      = useState<Set<string>>(new Set())
  const [dismissingIds, setDismissing] = useState<Set<string>>(new Set())
  const [nowTick, setNowTick]         = useState(() => Date.now())
  const [soundEnabled, setSoundEnabled] = useState(true)
  const flashRef                      = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Init sound preference from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('gastro_admin_sound')
    if (stored === '0') setSoundEnabled(false)
  }, [])

  const toggleSound = () => setSoundEnabled(prev => {
    const next = !prev
    localStorage.setItem('gastro_admin_sound', next ? '1' : '0')
    return next
  })

  useEffect(() => { const id = window.setInterval(() => setNowTick(Date.now()), 30_000); return () => clearInterval(id) }, [])

  const fetchOrders = useCallback(async (opts?: { flash?: boolean }) => {
    if (opts?.flash) { if (flashRef.current) clearTimeout(flashRef.current); setRefFlash(false) }
    setLoading(true); setError(null)
    let ok = false
    try {
      const res  = await fetch(`/api/${slug}/admin/orders`, { cache: 'no-store' })
      const data = await res.json() as { orders?: Order[]; error?: string }
      if (!res.ok) { setError(data.error ?? 'Fehler'); return }
      setOrders(data.orders ?? []); ok = true
    } catch { setError('Netzwerkfehler') } finally {
      setLoading(false)
      if (ok && opts?.flash) { setRefFlash(true); flashRef.current = setTimeout(() => setRefFlash(false), 4000) }
    }
  }, [slug])

  useEffect(() => { void fetchOrders(); const id = window.setInterval(() => void fetchOrders(), POLL_MS); return () => clearInterval(id) }, [fetchOrders])

  useEffect(() => {
    const ch = supabase.channel(`schicht_${slug}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'gastro_orders' }, (p) => {
        const o = p.new as Order
        void fetchOrders()
        if (soundEnabled) playNewOrderSound()
        setNewIds(prev => { const s = new Set(prev); s.add(o.id); return s })
        setTimeout(() => setNewIds(prev => { const s = new Set(prev); s.delete(o.id); return s }), 12_000)
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'gastro_orders' }, () => void fetchOrders())
      .subscribe()
    return () => { void supabase.removeChannel(ch) }
  }, [slug, fetchOrders, soundEnabled])

  const patchStatus = useCallback(async (id: string, status: OrderStatus) => {
    // Trigger fade-out animation before removing from active list
    if (status === 'done') {
      setDismissing(prev => { const s = new Set(prev); s.add(id); return s })
      setTimeout(() => setDismissing(prev => { const s = new Set(prev); s.delete(id); return s }), 480)
    }
    setPatching(id)
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o))
    try {
      await fetch(`/api/${slug}/admin/orders/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
    } catch { void fetchOrders() } finally { setPatching(null) }
  }, [slug, fetchOrders])

  // active = pending + confirmed, plus orders still animating out (dismissing)
  const active = orders
    .filter(o => o.status === 'pending' || o.status === 'confirmed' || dismissingIds.has(o.id))
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  const trueActive   = active.filter(o => !dismissingIds.has(o.id))
  const overdue      = trueActive.filter(o => nowTick - new Date(o.created_at).getTime() > OVERDUE_AFTER_MS)
  const todayRevenue = orders.filter(o => new Date(o.created_at).toDateString() === new Date().toDateString()).reduce((s, o) => s + Number(o.total), 0)

  useEffect(() => { onActiveCountChange?.(trueActive.length) }, [trueActive.length, onActiveCountChange])

  return (
    <div className="betrieb-dash">
      {/* KPI bar */}
      <div className="betrieb-filter-bar" style={{ marginBottom: 20 }}>
        <span className="betrieb-dash-pill"><span className="betrieb-dash-pill-muted">Aktiv</span>{trueActive.length}</span>
        <span className="betrieb-dash-pill"><span className="betrieb-dash-pill-muted">Heute</span>{fmtPrice(todayRevenue)}</span>
        {overdue.length > 0 && (
          <span className="betrieb-dash-pill" style={{ color: '#dc2626', borderColor: 'rgba(220,38,38,0.3)' }}>
            <span className="betrieb-dash-pill-muted">Überfällig</span>{overdue.length}
          </span>
        )}
        {/* Sound toggle */}
        <button
          type="button"
          className="betrieb-dash-pill schicht-sound-btn"
          onClick={toggleSound}
          title={soundEnabled ? 'Sound deaktivieren' : 'Sound aktivieren'}
        >
          {soundEnabled
            ? <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M12 6v12m0 0l-3-3m3 3l3-3M6.343 9.343a8 8 0 000 11.314" /><path strokeLinecap="round" strokeLinejoin="round" d="M11 5L6 9H3v6h3l5 4V5z" /></svg>
            : <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5L6 9H3v6h3l5 4V5zM23 9l-6 6M17 9l6 6" /></svg>
          }
          <span style={{ fontSize: 11, fontWeight: 600 }}>{soundEnabled ? 'An' : 'Aus'}</span>
        </button>
        {/* Refresh */}
        <button type="button" className={`betrieb-dash-pill${loading ? ' betrieb-dash-pill--refresh-loading' : ''}`} onClick={() => void fetchOrders({ flash: true })} disabled={loading}>
          {refreshFlash
            ? <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} className="betrieb-dash-refresh-success"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            : <svg className="betrieb-dash-refresh-icon" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>}
        </button>
      </div>

      {error && <p className="betrieb-dash-error" role="alert">{error}</p>}

      <div className="betrieb-dash-grid">
        {/* Aktuelle Bestellungen */}
        <section className="betrieb-dash-card">
          <h2>Aktuelle Bestellungen</h2>
          {trueActive.length === 0 && dismissingIds.size === 0 ? (
            <div className="betrieb-dash-empty"><div className="betrieb-dash-empty-icon">✓</div>Alles erledigt — neue erscheinen automatisch.</div>
          ) : active.map(o => {
            const items = o.gastro_order_items ?? []
            const isDismissing = dismissingIds.has(o.id)
            return (
              <div key={o.id} className={[
                'betrieb-dash-order-mini',
                newOrderIds.has(o.id) ? 'new-order' : '',
                isDismissing ? 'order-dismissing' : '',
              ].filter(Boolean).join(' ')}>
                <div className="betrieb-dash-order-row">
                  <span className="betrieb-dash-order-id">{shortNum(o.order_number)}</span>
                  <span className={`betrieb-dash-badge betrieb-dash-badge-${o.status}`}>{STATUS_LABEL[o.status]}</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <strong style={{ color: 'var(--text)' }}>{o.customer_name ?? '—'}</strong>
                  <span className="betrieb-order-type">{ORDER_TYPE_LABEL[o.order_type ?? ''] ?? o.order_type ?? '—'}</span>
                  {o.table_number && <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>Tisch {o.table_number}</span>}
                </div>

                {/* Real item list from gastro_order_items */}
                {items.length > 0 && (
                  <div className="schicht-item-list">
                    {items.map(item => {
                      const mods = renderModifiers(item.modifiers)
                      return (
                        <div key={item.id} className="schicht-item-row">
                          <span className="schicht-item-qty">{item.quantity}×</span>
                          <div className="schicht-item-body">
                            <span className="schicht-item-name">{item.item_name}</span>
                            {mods && <span className="schicht-item-mods">{mods}</span>}
                            {item.notes && <span className="schicht-item-note">📝 {item.notes}</span>}
                          </div>
                          <span className="schicht-item-price">{fmtPrice(item.unit_price * item.quantity)}</span>
                        </div>
                      )
                    })}
                  </div>
                )}

                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 8, display: 'flex', justifyContent: 'space-between' }}>
                  <span>Eingang {fmtTime(o.created_at)}</span>
                  <strong style={{ color: 'var(--text-2)', fontFamily: 'var(--font-head)' }}>{fmtPrice(Number(o.total))}</strong>
                </div>
              </div>
            )
          })}
        </section>

        {/* Überfällig */}
        <section className="betrieb-dash-card" aria-live="polite">
          <h2>Überfällig (›30 Min)</h2>
          {overdue.length === 0 ? (
            <div className="betrieb-dash-empty"><div className="betrieb-dash-empty-icon">☀️</div>Keine überfälligen Bestellungen.</div>
          ) : overdue.map(o => (
            <div key={o.id} className="betrieb-dash-order-mini">
              <div className="betrieb-dash-order-row">
                <span className="betrieb-dash-order-id">{shortNum(o.order_number)}</span>
                <span className={`betrieb-dash-badge betrieb-dash-badge-${o.status}`}>{STATUS_LABEL[o.status]}</span>
              </div>
              <div className="betrieb-dash-overdue-flag">Überfällig seit {fmtOverdue(overdueMin(o.created_at, nowTick))}</div>
              <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4 }}>
                {[o.customer_name, o.customer_phone].filter(Boolean).join(' · ') || '—'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>Eingang {fmtTime(o.created_at)}</div>
            </div>
          ))}
        </section>
      </div>

      {/* Status ändern */}
      <section className="betrieb-dash-card">
        <h2 className="betrieb-dash-section-title">Status ändern</h2>
        {trueActive.length === 0 && dismissingIds.size === 0 ? (
          <div className="betrieb-dash-empty"><div className="betrieb-dash-empty-icon">🎉</div>Keine offenen Bestellungen.</div>
        ) : active.map(o => (
          <div key={o.id} className={`betrieb-dash-order-mini betrieb-dash-manage-card${dismissingIds.has(o.id) ? ' order-dismissing' : ''}`}>
            <div className="betrieb-dash-order-row">
              <span className="betrieb-dash-order-id">{shortNum(o.order_number)}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="betrieb-order-type" style={{ fontSize: 11 }}>{ORDER_TYPE_LABEL[o.order_type ?? ''] ?? o.order_type ?? '—'}</span>
                <span style={{ fontWeight: 700, fontSize: 14, fontFamily: 'var(--font-head)' }}>{fmtPrice(Number(o.total))}</span>
              </div>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4 }}>
              {[o.customer_name, o.table_number ? `Tisch ${o.table_number}` : null].filter(Boolean).join(' · ') || '—'}
            </div>
            <div className="betrieb-dash-status-btns">
              {(['pending', 'confirmed', 'done'] as const).map(st => (
                <button key={st} type="button" disabled={patchingId === o.id || dismissingIds.has(o.id)}
                  className={`betrieb-dash-status-btn${o.status === st ? ' betrieb-dash-status-btn-active' : ''}`}
                  onClick={() => void patchStatus(o.id, st)}>
                  {STATUS_LABEL[st]}
                </button>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
//  MAIN AdminClient
// ═══════════════════════════════════════════════════════

const NAV: { view: AdminView; label: string; Icon: React.FC; badge?: string }[] = [
  { view: 'schicht',        label: 'Schicht',        Icon: SchichtIcon },
  { view: 'bestellungen',   label: 'Bestellungen',   Icon: OrdersIcon },
  { view: 'kunden',         label: 'Kunden',         Icon: KundenIcon },
  { view: 'speisekarte',    label: 'Speisekarte',    Icon: MenuIcon },
  { view: 'qrcodes',        label: 'QR-Codes',       Icon: QrIcon },
  { view: 'team',           label: 'Team & Meso',    Icon: TeamIcon },
  { view: 'einstellungen',  label: 'Einstellungen',  Icon: SettingsIcon },
]

const VIEW_TITLE: Record<AdminView, string> = {
  schicht:        'Schicht',
  bestellungen:   'Bestellungen',
  kunden:         'Kunden',
  speisekarte:    'Speisekarte',
  qrcodes:        'QR-Codes',
  team:           'Team & Meso',
  einstellungen:  'Einstellungen',
}

export function AdminClient({ slug, tenantName }: { slug: string; tenantName: string }) {
  const [authed, setAuthed]             = useState(false)
  const [checkingAuth, setChecking]     = useState(true)
  const [role, setRole]                 = useState<AdminRole>('owner')
  const [view, setView]                 = useState<AdminView>('schicht')
  const [darkMode, setDarkMode]         = useState(false)
  const [activeOrderCount, setActiveOrderCount] = useState(0)

  const collapsed = useSyncExternalStore(subscribeSidebar, getSidebarCollapsed, () => false)

  // Dark mode
  useEffect(() => { const s = localStorage.getItem('gastro_admin_dark'); if (s === '1') setDarkMode(true) }, [])
  const toggleDark = () => setDarkMode(d => { const n = !d; localStorage.setItem('gastro_admin_dark', n ? '1' : '0'); return n })

  // Session check — also reads role from token
  useEffect(() => {
    fetch(`/api/${slug}/admin/auth`)
      .then(async r => {
        if (r.ok) {
          const data = await r.json() as { ok: boolean; role?: AdminRole }
          setRole(data.role ?? 'owner')
          setAuthed(true)
        }
      })
      .finally(() => setChecking(false))
  }, [slug])

  function handleLoginSuccess(r: AdminRole) {
    setRole(r)
    setAuthed(true)
    // Ensure current view is accessible for the new role
    if (!NAV_ACCESS[view].includes(r)) setView(DEFAULT_VIEW_FOR_ROLE[r])
  }

  async function logout() {
    await fetch(`/api/${slug}/admin/auth`, { method: 'DELETE' })
    setAuthed(false)
    setRole('owner')
  }

  if (checkingAuth) {
    return (
      <div className={`odis-admin${darkMode ? ' dark-mode' : ''}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: 'var(--text-2)' }}>
        <span style={{ opacity: 0.6 }}>Lade…</span>
      </div>
    )
  }

  if (!authed) {
    return (
      <div className={`odis-admin${darkMode ? ' dark-mode' : ''}`}>
        <PinLogin slug={slug} tenantName={tenantName} onSuccess={handleLoginSuccess} />
      </div>
    )
  }

  // Derive accessible nav items and guard the active view
  const accessibleNav = NAV.filter(({ view: v }) => NAV_ACCESS[v].includes(role))
  const safeView: AdminView = NAV_ACCESS[view].includes(role) ? view : DEFAULT_VIEW_FOR_ROLE[role]

  // Sync view state if guard redirected
  if (safeView !== view) setView(safeView)

  return (
    <div className={`odis-admin${darkMode ? ' dark-mode' : ''}`}>
      <div className="admin-shell">
        {/* ── Sidebar ─────────────────────────────────── */}
        <aside className={`admin-sidebar${collapsed ? ' collapsed' : ''}`} suppressHydrationWarning>
          {/* Brand — website .nav-logo pattern */}
          <div className="admin-sidebar-brand"
            onClick={collapsed ? toggleSidebar : undefined}
            role={collapsed ? 'button' : undefined}
            tabIndex={collapsed ? 0 : undefined}
            title={collapsed ? 'Seitenleiste öffnen' : undefined}
            onKeyDown={collapsed ? e => { if (e.key === 'Enter' || e.key === ' ') toggleSidebar() } : undefined}>
            <div className="admin-brand-logo">
              <div className="admin-brand-icon">🥗</div>
              {!collapsed && (
                <div className="admin-brand-text">
                  <span className="admin-brand-name">{tenantName}</span>
                  <span className="admin-brand-sub">Admin</span>
                </div>
              )}
            </div>
            {!collapsed && (
              <button type="button" onClick={e => { e.stopPropagation(); toggleSidebar() }} className="admin-sidebar-toggle" aria-label="Einklappen">
                <svg style={{ width: 16, height: 16 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              </button>
            )}
          </div>

          {/* Nav */}
          <nav className="admin-nav">
            {accessibleNav.map(({ view: v, label, Icon }) => (
              <button key={v} type="button"
                className={`admin-nav-link${view === v ? ' active' : ''}`}
                title={collapsed ? label : undefined}
                onClick={() => setView(v)}>
                <span className="admin-nav-icon"><Icon /></span>
                {!collapsed && (
                  <>
                    <span>{label}</span>
                    {v === 'schicht' && activeOrderCount === 0 && (
                      <span className="admin-nav-live" style={{ marginLeft: 'auto' }}>
                        <span className="admin-nav-live-dot" />
                      </span>
                    )}
                    {v === 'schicht' && activeOrderCount > 0 && (
                      <span className="admin-nav-order-badge" style={{ marginLeft: 'auto' }}>
                        {activeOrderCount}
                      </span>
                    )}
                    {v === 'team' && (
                      <span style={{ marginLeft: 'auto', fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 4, background: 'linear-gradient(135deg,rgba(34,197,94,0.2),rgba(59,130,246,0.15))', color: 'var(--accent-deep)', letterSpacing: '0.04em' }}>MESO</span>
                    )}
                  </>
                )}
                {collapsed && v === 'schicht' && activeOrderCount > 0 && (
                  <span className="admin-nav-order-badge admin-nav-order-badge--collapsed">
                    {activeOrderCount}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* Footer */}
          <div className="admin-sidebar-footer">
            {!collapsed && (
              <p className="admin-sidebar-user">
                <span className="admin-role-badge" data-role={role}>{ROLE_LABEL[role]}</span>
                {' · '}{tenantName}
              </p>
            )}
            <a href={`/${slug}`} className="admin-sidebar-link" title="Zur Website">
              <GlobeIcon />
              {!collapsed && <span>Zur Website</span>}
            </a>
            <button type="button" onClick={toggleDark} className="admin-sidebar-link"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left' }} title="Dark Mode">
              <span style={{ fontSize: 16, lineHeight: 1 }}>{darkMode ? '☀️' : '🌙'}</span>
              {!collapsed && <span style={{ marginLeft: 4 }}>{darkMode ? 'Hell' : 'Dunkel'}</span>}
            </button>
            {collapsed && (
              <button type="button" onClick={toggleSidebar} className="admin-expand-btn" aria-label="Ausklappen">
                <svg style={{ width: 16, height: 16 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </button>
            )}
          </div>
        </aside>

        {/* ── Main ────────────────────────────────────── */}
        <div className="admin-main">
          <header className="admin-header" style={{ minHeight: 56, flexWrap: 'wrap', gap: 10, paddingTop: 8, paddingBottom: 8 }}>
            <span className="admin-header-title">{VIEW_TITLE[safeView]}</span>
            <div className="admin-header-actions" style={{ flex: 1, justifyContent: 'flex-end', gap: 10 }}>
              {safeView === 'schicht' && (
                <div className="admin-live-pill">
                  <span className="admin-live-dot" />LIVE
                </div>
              )}
              <div className="admin-profile-pill">
                <span className="admin-profile-avatar admin-role-badge" data-role={role}>
                  {ROLE_LABEL[role][0]}
                </span>
                <button type="button" className="admin-logout-btn" onClick={logout}>
                  <LogoutIcon /><span>Abmelden</span>
                </button>
              </div>
            </div>
          </header>

          <div className="admin-content">
            {safeView === 'schicht'       && <SchichtView       slug={slug} onActiveCountChange={setActiveOrderCount} />}
            {safeView === 'bestellungen'  && <BestellungenView  slug={slug} />}
            {safeView === 'kunden'        && <KundenView        slug={slug} />}
            {safeView === 'speisekarte'   && <SpeisekarteView   slug={slug} />}
            {safeView === 'qrcodes'       && <QrCodeView        slug={slug} />}
            {safeView === 'team'          && <TeamView          slug={slug} />}
            {safeView === 'einstellungen' && <EinstellungenView slug={slug} />}
          </div>
        </div>
      </div>
    </div>
  )
}
