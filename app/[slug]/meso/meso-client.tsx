'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'aufgaben' | 'sops' | 'bestellungen' | 'uebergabe'
type Lang = 'de' | 'en' | 'tr'

type Task = {
  id: string; title: string; description: string | null
  status: string; assigned_to: string | null; due_at: string | null; created_at: string
}
type Sop = {
  id: string; title: string; category: string; steps: string[]
}
type Order = {
  id: string; order_number: string | null; customer_name: string | null
  order_type: string | null; table_number: string | null; status: string
  total: number; notes: string | null; created_at: string
  gastro_order_items: { id: string; item_name: string; quantity: number; unit_price: number; modifiers: unknown; notes: string | null }[]
}
type Handover = {
  id: string; created_by: string; shift_type: string; summary: string
  open_tasks: string | null; incidents: string | null; inventory_notes: string | null
  cash_register_amount: number | null; customer_feedback: string | null
  status: string; created_at: string
}

// ─── i18n ─────────────────────────────────────────────────────────────────────

const T: Record<Lang, Record<string, string>> = {
  de: {
    welcome: 'Willkommen', staff: 'Mitarbeiter-Zugang', pin: 'PIN eingeben',
    name: 'Dein Name', namePlaceholder: 'z.B. Ali', login: 'Einloggen',
    wrongPin: 'Falscher PIN.', aufgaben: 'Aufgaben', sops: 'Anleitungen',
    bestellungen: 'Bestellungen', uebergabe: 'Übergabe',
    noTasks: 'Keine offenen Aufgaben 🎉', noSops: 'Keine Anleitungen vorhanden.',
    noOrders: 'Keine aktiven Bestellungen.', noHandover: 'Keine Übergabe vorhanden.',
    done: 'Erledigt', open: 'Offen', inProgress: 'In Arbeit',
    markDone: 'Als erledigt markieren', pickup: 'Abholen', dineIn: 'Vor Ort', delivery: 'Liefern',
    pending: 'Offen', confirmed: 'Bestätigt', logout: 'Abmelden',
    steps: 'Schritte', step: 'Schritt', table: 'Tisch',
    cashRegister: 'Kasse', incidents: 'Vorfälle', inventory: 'Lager',
    customerFeedback: 'Kundenfeedback', openTasks: 'Offene Aufgaben',
    shift: 'Schicht', morning: 'Frühschicht', evening: 'Spätschicht',
    today: 'Heute', loading: 'Lädt…',
  },
  en: {
    welcome: 'Welcome', staff: 'Staff Access', pin: 'Enter PIN',
    name: 'Your Name', namePlaceholder: 'e.g. Ali', login: 'Log in',
    wrongPin: 'Wrong PIN.', aufgaben: 'Tasks', sops: 'Guides',
    bestellungen: 'Orders', uebergabe: 'Handover',
    noTasks: 'No open tasks 🎉', noSops: 'No guides available.',
    noOrders: 'No active orders.', noHandover: 'No handover available.',
    done: 'Done', open: 'Open', inProgress: 'In Progress',
    markDone: 'Mark as done', pickup: 'Pickup', dineIn: 'Dine-in', delivery: 'Delivery',
    pending: 'Open', confirmed: 'Confirmed', logout: 'Log out',
    steps: 'Steps', step: 'Step', table: 'Table',
    cashRegister: 'Cash register', incidents: 'Incidents', inventory: 'Inventory',
    customerFeedback: 'Customer feedback', openTasks: 'Open tasks',
    shift: 'Shift', morning: 'Morning shift', evening: 'Evening shift',
    today: 'Today', loading: 'Loading…',
  },
  tr: {
    welcome: 'Hoş geldin', staff: 'Personel Girişi', pin: "PIN girin",
    name: 'Adın', namePlaceholder: 'Örn. Ali', login: 'Giriş Yap',
    wrongPin: 'Yanlış PIN.', aufgaben: 'Görevler', sops: 'Kılavuzlar',
    bestellungen: 'Siparişler', uebergabe: 'Devir',
    noTasks: 'Açık görev yok 🎉', noSops: 'Kılavuz mevcut değil.',
    noOrders: 'Aktif sipariş yok.', noHandover: 'Devir notu yok.',
    done: 'Tamamlandı', open: 'Açık', inProgress: 'Devam ediyor',
    markDone: 'Tamamlandı olarak işaretle', pickup: 'Teslim Al', dineIn: 'İçeride', delivery: 'Teslimat',
    pending: 'Açık', confirmed: 'Onaylandı', logout: 'Çıkış Yap',
    steps: 'Adımlar', step: 'Adım', table: 'Masa',
    cashRegister: 'Kasa', incidents: 'Olaylar', inventory: 'Stok',
    customerFeedback: 'Müşteri geri bildirimi', openTasks: 'Açık görevler',
    shift: 'Vardiya', morning: 'Sabah vardiyası', evening: 'Akşam vardiyası',
    today: 'Bugün', loading: 'Yükleniyor…',
  },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const time = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  return d.toDateString() === today.toDateString()
    ? time
    : d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) + ' ' + time
}

// ─── Login Screen ─────────────────────────────────────────────────────────────

function LoginScreen({
  slug, lang, t, onLogin,
}: { slug: string; lang: Lang; t: Record<string, string>; onLogin: (name: string) => void }) {
  const [pin, setPin] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit() {
    if (pin.length < 4 || !name.trim()) return
    setLoading(true); setError('')
    try {
      const res = await fetch(`/api/${slug}/meso/auth`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, name: name.trim() }),
      })
      const data = await res.json()
      if (data.ok) { onLogin(data.name) }
      else { setError(data.error ?? t.wrongPin) }
    } catch { setError(t.wrongPin) }
    setLoading(false)
  }

  const langFlags: Record<Lang, string> = { de: '🇩🇪', en: '🇬🇧', tr: '🇹🇷' }

  return (
    <div style={{ minHeight: '100dvh', background: 'linear-gradient(160deg, #071a0e 0%, #0d2618 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Logo */}
      <div style={{ fontSize: 52, marginBottom: 8 }}>🥣</div>
      <div style={{ fontSize: 22, fontWeight: 900, color: '#22c55e', marginBottom: 4, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>MESO</div>
      <div style={{ fontSize: 13, color: '#6b9e7a', marginBottom: 40 }}>{t.staff}</div>

      {/* Card */}
      <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, padding: '28px 24px', width: '100%', maxWidth: 360, backdropFilter: 'blur(10px)' }}>
        {/* Name */}
        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b9e7a', letterSpacing: '0.08em', marginBottom: 6 }}>{t.name.toUpperCase()}</label>
        <input
          type="text" value={name} onChange={e => setName(e.target.value)}
          placeholder={t.namePlaceholder} autoComplete="given-name"
          style={{ width: '100%', padding: '14px 16px', background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#e8f5eb', fontSize: 16, fontFamily: 'Inter, sans-serif', boxSizing: 'border-box', marginBottom: 16, outline: 'none' }}
        />

        {/* PIN */}
        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b9e7a', letterSpacing: '0.08em', marginBottom: 6 }}>{t.pin.toUpperCase()}</label>
        <input
          type="password" inputMode="numeric" maxLength={8} value={pin}
          onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
          placeholder="••••" autoComplete="current-password"
          style={{ width: '100%', padding: '14px 16px', background: 'rgba(255,255,255,0.06)', border: `1.5px solid ${error ? '#ef4444' : 'rgba(255,255,255,0.1)'}`, borderRadius: 12, color: '#e8f5eb', fontSize: 22, letterSpacing: '0.3em', fontFamily: 'monospace', boxSizing: 'border-box', marginBottom: error ? 8 : 20, outline: 'none' }}
          onKeyDown={e => { if (e.key === 'Enter') void submit() }}
        />
        {error && <p style={{ fontSize: 13, color: '#ef4444', marginBottom: 16 }}>{error}</p>}

        <button
          onClick={() => void submit()} disabled={loading || pin.length < 4 || !name.trim()}
          style={{ width: '100%', padding: '16px', background: pin.length >= 4 && name.trim() ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 12, color: '#fff', fontSize: 16, fontWeight: 800, cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif', opacity: loading ? 0.7 : 1 }}
        >
          {loading ? '…' : t.login}
        </button>
      </div>

      {/* Lang note */}
      <p style={{ marginTop: 20, fontSize: 11, color: '#3d5c47' }}>
        {Object.entries(langFlags).map(([l, flag]) => (
          <span key={l} style={{ opacity: lang === l ? 1 : 0.4 }}>{flag} </span>
        ))}
      </p>
    </div>
  )
}

// ─── Tab Bar ──────────────────────────────────────────────────────────────────

function TabBar({ tab, setTab, t, pendingCount }: { tab: Tab; setTab: (t: Tab) => void; t: Record<string, string>; pendingCount: number }) {
  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'aufgaben',     label: t.aufgaben,     icon: '✅' },
    { id: 'sops',         label: t.sops,         icon: '📖' },
    { id: 'bestellungen', label: t.bestellungen, icon: '🧾' },
    { id: 'uebergabe',    label: t.uebergabe,    icon: '📝' },
  ]
  return (
    <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(7,26,14,0.96)', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', zIndex: 100, backdropFilter: 'blur(10px)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {tabs.map(item => {
        const active = tab === item.id
        return (
          <button key={item.id} onClick={() => setTab(item.id)}
            style={{ flex: 1, padding: '12px 4px 10px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, position: 'relative' }}>
            <span style={{ fontSize: 20 }}>{item.icon}</span>
            {item.id === 'bestellungen' && pendingCount > 0 && (
              <span style={{ position: 'absolute', top: 8, right: '50%', transform: 'translateX(50%)', marginRight: -14, background: '#ef4444', color: '#fff', fontSize: 9, fontWeight: 800, borderRadius: 10, padding: '1px 5px', minWidth: 16, textAlign: 'center' }}>{pendingCount}</span>
            )}
            <span style={{ fontSize: 10, fontWeight: active ? 800 : 500, color: active ? '#22c55e' : '#4b7c5a', letterSpacing: '0.02em' }}>{item.label}</span>
            {active && <span style={{ position: 'absolute', top: 0, left: '20%', right: '20%', height: 2, background: '#22c55e', borderRadius: 2 }} />}
          </button>
        )
      })}
    </nav>
  )
}

// ─── Aufgaben Tab ─────────────────────────────────────────────────────────────

function AufgabenTab({ slug, t }: { slug: string; t: Record<string, string> }) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [patching, setPatching] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await fetch(`/api/${slug}/meso/tasks`, { cache: 'no-store' })
    const data = await res.json()
    setTasks(data.tasks ?? [])
    setLoading(false)
  }, [slug])

  useEffect(() => { void load() }, [load])

  async function markDone(id: string) {
    setPatching(id)
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'done' } : t))
    await fetch(`/api/${slug}/meso/tasks`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'done' }),
    })
    setPatching(null)
  }

  const open = tasks.filter(t => t.status === 'open')
  const done = tasks.filter(t => t.status === 'done')

  if (loading) return <CenteredMsg>{t.loading}</CenteredMsg>

  return (
    <div>
      {open.length === 0 && done.length === 0 && <CenteredMsg>{t.noTasks}</CenteredMsg>}

      {open.length > 0 && (
        <>
          <SectionLabel text={`${t.open} (${open.length})`} />
          {open.map(task => (
            <TaskCard key={task.id} task={task} t={t} patching={patching} onDone={() => void markDone(task.id)} />
          ))}
        </>
      )}

      {done.length > 0 && (
        <>
          <SectionLabel text={`${t.done} (${done.length})`} dim />
          {done.map(task => (
            <TaskCard key={task.id} task={task} t={t} patching={patching} />
          ))}
        </>
      )}
    </div>
  )
}

function TaskCard({ task, t, patching, onDone }: { task: Task; t: Record<string, string>; patching: string | null; onDone?: () => void }) {
  const isDone = task.status === 'done'
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${isDone ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 16, padding: '14px 16px', marginBottom: 10, opacity: isDone ? 0.55 : 1 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${isDone ? '#22c55e' : 'rgba(255,255,255,0.2)'}`, background: isDone ? '#22c55e' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1, fontSize: 13, color: '#fff' }}>
          {isDone ? '✓' : ''}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: isDone ? '#6b9e7a' : '#e8f5eb', textDecoration: isDone ? 'line-through' : 'none', marginBottom: task.description ? 4 : 0 }}>{task.title}</div>
          {task.description && <div style={{ fontSize: 12, color: '#6b9e7a', lineHeight: 1.5 }}>{task.description}</div>}
          {task.assigned_to && <div style={{ fontSize: 11, color: '#3d5c47', marginTop: 4 }}>→ {task.assigned_to}</div>}
        </div>
      </div>
      {!isDone && onDone && (
        <button onClick={onDone} disabled={patching === task.id}
          style={{ marginTop: 12, width: '100%', padding: '10px', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 10, color: '#22c55e', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          {patching === task.id ? '…' : `✓ ${t.markDone}`}
        </button>
      )}
    </div>
  )
}

// ─── SOPs Tab ─────────────────────────────────────────────────────────────────

function SopsTab({ slug, t }: { slug: string; t: Record<string, string> }) {
  const [sops, setSops] = useState<Sop[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/${slug}/meso/sops`, { cache: 'no-store' })
      .then(r => r.json())
      .then(d => { setSops(d.sops ?? []); setLoading(false) })
  }, [slug])

  if (loading) return <CenteredMsg>{t.loading}</CenteredMsg>
  if (!sops.length) return <CenteredMsg>{t.noSops}</CenteredMsg>

  const byCategory = sops.reduce<Record<string, Sop[]>>((acc, sop) => {
    ;(acc[sop.category] ??= []).push(sop)
    return acc
  }, {})

  return (
    <div>
      {Object.entries(byCategory).map(([cat, items]) => (
        <div key={cat}>
          <SectionLabel text={cat} />
          {items.map(sop => {
            const open = expanded === sop.id
            return (
              <div key={sop.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, marginBottom: 10, overflow: 'hidden' }}>
                <button onClick={() => setExpanded(open ? null : sop.id)}
                  style={{ width: '100%', padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}>
                  <span style={{ fontSize: 20 }}>📖</span>
                  <span style={{ flex: 1, fontSize: 15, fontWeight: 700, color: '#e8f5eb' }}>{sop.title}</span>
                  <span style={{ fontSize: 12, color: '#6b9e7a', fontWeight: 600 }}>{sop.steps.length} {t.steps}</span>
                  <span style={{ color: '#6b9e7a', transform: open ? 'rotate(90deg)' : 'none', transition: '0.2s' }}>›</span>
                </button>
                {open && (
                  <div style={{ padding: '0 16px 16px' }}>
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12 }}>
                      {sop.steps.map((step, i) => (
                        <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
                          <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#22c55e', flexShrink: 0 }}>{i + 1}</div>
                          <div style={{ fontSize: 14, color: '#c8e6d0', lineHeight: 1.5, paddingTop: 3 }}>{step}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// ─── Bestellungen Tab ─────────────────────────────────────────────────────────

function BestellungenTab({ slug, t, onCountChange }: { slug: string; t: Record<string, string>; onCountChange: (n: number) => void }) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const countRef = useRef(0)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    const res = await fetch(`/api/${slug}/meso/orders`, { cache: 'no-store' })
    const data = await res.json()
    const newOrders: Order[] = data.orders ?? []
    setOrders(newOrders)
    if (newOrders.length !== countRef.current) {
      countRef.current = newOrders.length
      onCountChange(newOrders.length)
    }
    if (!silent) setLoading(false)
  }, [slug, onCountChange])

  useEffect(() => { void load() }, [load])
  useEffect(() => {
    const id = setInterval(() => { void load(true) }, 20_000)
    return () => clearInterval(id)
  }, [load])

  const typeLabel: Record<string, string> = { pickup: `🥡 ${t.pickup}`, 'dine-in': `🪑 ${t.dineIn}`, delivery: `🛵 ${t.delivery}` }
  const statusLabel: Record<string, string> = { pending: t.pending, confirmed: t.confirmed }

  if (loading) return <CenteredMsg>{t.loading}</CenteredMsg>
  if (!orders.length) return <CenteredMsg>{t.noOrders}</CenteredMsg>

  return (
    <div>
      <SectionLabel text={`${orders.length} aktiv`} />
      {orders.map(order => {
        const items = order.gastro_order_items ?? []
        return (
          <div key={order.id} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${order.status === 'pending' ? 'rgba(251,191,36,0.3)' : 'rgba(34,197,94,0.2)'}`, borderRadius: 16, padding: '14px 16px', marginBottom: 12 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16, fontWeight: 900, color: '#e8f5eb', fontFamily: 'monospace' }}>#{order.order_number ?? order.id.slice(-4).toUpperCase()}</span>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 8, background: order.status === 'pending' ? 'rgba(251,191,36,0.15)' : 'rgba(34,197,94,0.15)', color: order.status === 'pending' ? '#fbbf24' : '#22c55e' }}>
                  {statusLabel[order.status] ?? order.status}
                </span>
              </div>
              <span style={{ fontSize: 12, color: '#6b9e7a' }}>{fmt(order.created_at)}</span>
            </div>
            {/* Meta */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: '#a7d4b5' }}>{typeLabel[order.order_type ?? ''] ?? order.order_type}</span>
              {order.table_number && <span style={{ fontSize: 12, color: '#6b9e7a' }}>· {t.table} {order.table_number}</span>}
              {order.customer_name && <span style={{ fontSize: 12, color: '#6b9e7a' }}>· {order.customer_name}</span>}
            </div>
            {/* Items */}
            {items.length > 0 ? (
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 8 }}>
                {items.map(item => (
                  <div key={item.id} style={{ display: 'flex', gap: 8, fontSize: 13, color: '#c8e6d0', padding: '3px 0' }}>
                    <span style={{ fontWeight: 800, color: '#22c55e', minWidth: 20 }}>{item.quantity}×</span>
                    <span>{item.item_name}</span>
                  </div>
                ))}
              </div>
            ) : order.notes ? (
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 8, fontSize: 12, color: '#6b9e7a', lineHeight: 1.5 }}>
                {order.notes.split(' | ').filter(p => ['📦','🍖','🥦','🫙','✨'].some(e => p.startsWith(e))).map((p, i) => (
                  <div key={i}>{p}</div>
                ))}
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

// ─── Übergabe Tab ─────────────────────────────────────────────────────────────

function UebergabeTab({ slug, t }: { slug: string; t: Record<string, string> }) {
  const [handovers, setHandovers] = useState<Handover[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/${slug}/meso/handover`, { cache: 'no-store' })
      .then(r => r.json())
      .then(d => { setHandovers(d.handovers ?? []); setLoading(false) })
  }, [slug])

  if (loading) return <CenteredMsg>{t.loading}</CenteredMsg>
  if (!handovers.length) return <CenteredMsg>{t.noHandover}</CenteredMsg>

  const shiftLabel: Record<string, string> = { morning: t.morning, evening: t.evening }

  return (
    <div>
      {handovers.map((h, idx) => (
        <div key={h.id} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${idx === 0 ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.06)'}`, borderRadius: 16, padding: '16px', marginBottom: 12, opacity: idx === 0 ? 1 : 0.6 }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#22c55e' }}>{shiftLabel[h.shift_type] ?? h.shift_type}</div>
              <div style={{ fontSize: 12, color: '#6b9e7a' }}>von {h.created_by} · {fmt(h.created_at)}</div>
            </div>
            {idx === 0 && <span style={{ fontSize: 10, fontWeight: 800, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e', padding: '3px 8px', borderRadius: 8 }}>AKTUELL</span>}
          </div>

          {/* Summary */}
          <div style={{ fontSize: 14, color: '#c8e6d0', lineHeight: 1.6, marginBottom: 10 }}>{h.summary}</div>

          {/* Fields */}
          {[
            { key: 'open_tasks', label: t.openTasks, value: h.open_tasks },
            { key: 'incidents', label: t.incidents, value: h.incidents },
            { key: 'inventory_notes', label: t.inventory, value: h.inventory_notes },
            { key: 'customer_feedback', label: t.customerFeedback, value: h.customer_feedback },
          ].filter(f => f.value).map(f => (
            <div key={f.key} style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#4b7c5a', letterSpacing: '0.08em', marginBottom: 3 }}>{f.label.toUpperCase()}</div>
              <div style={{ fontSize: 13, color: '#a7d4b5', lineHeight: 1.5 }}>{f.value}</div>
            </div>
          ))}

          {h.cash_register_amount != null && (
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: '#4b7c5a', fontWeight: 700 }}>{t.cashRegister.toUpperCase()}</span>
              <span style={{ fontSize: 16, fontWeight: 900, color: '#22c55e' }}>{Number(h.cash_register_amount).toFixed(2).replace('.', ',')} €</span>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

function CenteredMsg({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 24px', color: '#4b7c5a', fontSize: 14 }}>{children}</div>
  )
}

function SectionLabel({ text, dim }: { text: string; dim?: boolean }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 800, color: dim ? '#3d5c47' : '#6b9e7a', letterSpacing: '0.1em', marginBottom: 8, marginTop: 4 }}>{text.toUpperCase()}</div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function MesoClient({ slug, tenantName }: { slug: string; tenantName: string }) {
  const [lang, setLang] = useState<Lang>('de')
  const [staffName, setStaffName] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('aufgaben')
  const [pendingOrders, setPendingOrders] = useState(0)
  const [loaded, setLoaded] = useState(false)

  const t = T[lang]

  // Check existing session
  useEffect(() => {
    const savedLang = (localStorage.getItem('meso-lang') as Lang) ?? 'de'
    setLang(savedLang)
    fetch(`/api/${slug}/meso/auth`)
      .then(r => r.json())
      .then(d => { if (d.ok) setStaffName(d.name) })
      .finally(() => setLoaded(true))
  }, [slug])

  function switchLang(l: Lang) {
    setLang(l)
    localStorage.setItem('meso-lang', l)
  }

  async function logout() {
    await fetch(`/api/${slug}/meso/auth`, { method: 'DELETE' })
    setStaffName(null)
  }

  if (!loaded) return null

  if (!staffName) {
    return (
      <div>
        {/* Lang picker on login */}
        <div style={{ position: 'fixed', top: 16, right: 16, display: 'flex', gap: 8, zIndex: 10 }}>
          {(['de', 'en', 'tr'] as Lang[]).map(l => (
            <button key={l} onClick={() => switchLang(l)}
              style={{ padding: '4px 10px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.1)', background: lang === l ? 'rgba(34,197,94,0.2)' : 'transparent', color: lang === l ? '#22c55e' : '#6b9e7a', fontSize: 13, cursor: 'pointer' }}>
              {l.toUpperCase()}
            </button>
          ))}
        </div>
        <LoginScreen slug={slug} lang={lang} t={t} onLogin={name => setStaffName(name)} />
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100dvh', background: '#071a0e', fontFamily: 'Inter, system-ui, sans-serif', color: '#e8f5eb' }}>
      {/* Top Header */}
      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(7,26,14,0.95)', borderBottom: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(10px)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 22 }}>🥣</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#22c55e', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>MESO</div>
          <div style={{ fontSize: 11, color: '#4b7c5a' }}>{tenantName} · {staffName}</div>
        </div>
        {/* Lang toggle */}
        <div style={{ display: 'flex', gap: 4 }}>
          {(['de', 'en', 'tr'] as Lang[]).map(l => (
            <button key={l} onClick={() => switchLang(l)}
              style={{ padding: '3px 7px', borderRadius: 8, border: 'none', background: lang === l ? 'rgba(34,197,94,0.2)' : 'transparent', color: lang === l ? '#22c55e' : '#3d5c47', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>
              {l.toUpperCase()}
            </button>
          ))}
        </div>
        <button onClick={() => void logout()}
          style={{ padding: '6px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#4b7c5a', fontSize: 12, cursor: 'pointer' }}>
          {t.logout}
        </button>
      </header>

      {/* Content */}
      <main style={{ padding: '16px 16px 100px' }}>
        {tab === 'aufgaben'     && <AufgabenTab     slug={slug} t={t} />}
        {tab === 'sops'         && <SopsTab         slug={slug} t={t} />}
        {tab === 'bestellungen' && <BestellungenTab slug={slug} t={t} onCountChange={setPendingOrders} />}
        {tab === 'uebergabe'    && <UebergabeTab    slug={slug} t={t} />}
      </main>

      {/* Bottom Tab Bar */}
      <TabBar tab={tab} setTab={setTab} t={t} pendingCount={pendingOrders} />
    </div>
  )
}
