'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

// ─── Types ───────────────────────────────────────────────────────────────────

type OrderStatus = 'pending' | 'confirmed' | 'done'

type Modifier = Record<string, string> | string | null

type OrderItem = {
  id: string
  item_id: string | null
  item_name: string
  quantity: number
  unit_price: number
  modifiers: Modifier
  upsells: unknown
  notes: string | null
}

type Order = {
  id: string
  order_number: string | null
  customer_name: string | null
  customer_phone: string | null
  order_type: string | null
  table_number: string | null
  status: OrderStatus
  total: number
  notes: string | null
  created_at: string
  updated_at: string
  gastro_order_items?: OrderItem[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending:   'Offen',
  confirmed: 'Bestätigt',
  done:      'Abgeholt',
}
const ORDER_TYPE_LABEL: Record<string, string> = {
  pickup:   '🥡 Abholen',
  'dine-in': '🪑 Vor Ort',
  delivery: '🛵 Liefern',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(iso: string) {
  const d     = new Date(iso)
  const today = new Date()
  const time  = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  return d.toDateString() === today.toDateString()
    ? `Heute ${time}`
    : d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) + ' ' + time
}

function fmtPrice(n: number) {
  return Number(n).toFixed(2).replace('.', ',') + ' \u20ac'
}

function renderModifiers(raw: Modifier): string {
  if (!raw) return ''
  let parsed: unknown = raw
  if (typeof raw === 'string') {
    try { parsed = JSON.parse(raw) } catch { return raw }
  }
  if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
    return Object.entries(parsed as Record<string, string>)
      .map(([k, v]) => `${k}: ${v}`)
      .join(' · ')
  }
  return typeof parsed === 'string' ? parsed : ''
}

// ─── Print Ticket ─────────────────────────────────────────────────────────────

function printOrder(order: Order) {
  const items = order.gastro_order_items ?? []
  const time  = new Date(order.created_at).toLocaleString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
  const typeLabel: Record<string, string> = {
    pickup: '🥡 ABHOLUNG', 'dine-in': '🪑 VOR ORT', delivery: '🛵 LIEFERUNG',
  }
  const orderTypeStr = typeLabel[order.order_type ?? ''] ?? (order.order_type ?? '—')
  const tableStr     = order.table_number ? ` · Tisch ${order.table_number}` : ''

  // ── Artikelblock: aus gastro_order_items ODER aus notes-String parsen ──────
  let itemsHtml = ''

  if (items.length > 0) {
    // Standard: strukturierte Items aus gastro_order_items
    const rows = items.map(item => {
      let mods = ''
      if (item.modifiers) {
        try {
          const parsed = typeof item.modifiers === 'string' ? JSON.parse(item.modifiers) : item.modifiers
          if (typeof parsed === 'object' && !Array.isArray(parsed)) {
            mods = Object.entries(parsed as Record<string, string>).map(([k, v]) => `${k}: ${v}`).join(' · ')
          } else if (typeof parsed === 'string') { mods = parsed }
        } catch { mods = String(item.modifiers) }
      }
      return `<tr>
        <td style="padding:3px 4px;vertical-align:top;font-weight:800;font-size:14px;white-space:nowrap">${item.quantity}×</td>
        <td style="padding:3px 4px;vertical-align:top;width:100%">
          <span style="font-weight:700;font-size:13px">${item.item_name}</span>
          ${mods ? `<br><span style="font-size:11px;color:#444">+ ${mods}</span>` : ''}
          ${item.notes ? `<br><span style="font-size:11px;color:#444">📝 ${item.notes}</span>` : ''}
        </td>
        <td style="padding:3px 4px;vertical-align:top;text-align:right;white-space:nowrap;font-weight:700">
          ${(Number(item.unit_price) * item.quantity).toFixed(2).replace('.', ',')} €
        </td>
      </tr>`
    }).join('')
    itemsHtml = `<table style="width:100%;border-collapse:collapse;margin:4px 0">${rows}</table>`

    // Kustomizer-Config aus notes anhängen, wenn vorhanden
    // Format: "🥣 Kustomizer Bowl | 👤 Name · ⏰ Zeit | 📦 Basis: ... | 🍖 Warmspeise: ... | ..."
    // Config-Teile werden per Emoji-Präfix erkannt (robust gegen variable Anzahl Header-Parts)
    const CONFIG_EMOJIS = ['📦', '🍖', '🥦', '🫙', '✨', '➕', '📝']
    if (order.notes && order.notes.includes(' | ')) {
      const parts = order.notes.split(' | ').filter(Boolean)
      const configParts = parts.filter(p => CONFIG_EMOJIS.some(e => p.startsWith(e)))
      if (configParts.length > 0) {
        const configLines = configParts
          .map(p => `<div style="padding:1px 0;font-size:11px;color:#333">${p}</div>`)
          .join('')
        itemsHtml += `<div style="margin-top:6px;padding-top:6px;border-top:1px dashed #ccc">
          <div style="font-size:10px;font-weight:700;letter-spacing:0.05em;color:#888;margin-bottom:3px">KONFIGURATION</div>
          ${configLines}
        </div>`
      }
    }

  } else if (order.notes) {
    // Kustomizer-Flow ohne gastro_order_items: notes-String in lesbare Zeilen aufteilen
    const parts = order.notes.split(' | ').filter(Boolean)
    const lines = parts.map(part => {
      const isFirst = parts.indexOf(part) === 0
      return `<div style="padding:2px 0;font-size:${isFirst ? 14 : 12}px;font-weight:${isFirst ? 800 : 400}">${part}</div>`
    }).join('')
    itemsHtml = `<div style="margin:4px 0">${lines}</div>`
  } else {
    itemsHtml = '<p style="font-size:11px;color:#666;padding:4px 0">Keine Artikeldetails</p>'
  }

  const orderNum = order.order_number ?? order.id.slice(-4).toUpperCase()

  const html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <title>Bon #${orderNum}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Courier New', monospace;
      font-size: 13px;
      width: 80mm;
      padding: 8mm 5mm;
      color: #000;
      background: #fff;
    }
    .center  { text-align: center; }
    .bold    { font-weight: 700; }
    .divider { border-top: 1px dashed #000; margin: 8px 0; }
    @media print {
      body { width: 80mm; }
      @page { size: 80mm auto; margin: 0; }
    }
  </style>
</head>
<body>

  <!-- Bestellnummer + Zeit -->
  <div class="center bold" style="font-size:20px;letter-spacing:1px">
    #${orderNum}
  </div>
  <div class="center" style="font-size:10px;color:#555;margin-top:2px">${time}</div>

  <div class="divider"></div>

  <!-- Bestellart — groß und klar -->
  <div class="center bold" style="font-size:15px;letter-spacing:0.5px;margin:4px 0">
    ${orderTypeStr}${tableStr}
  </div>

  <div class="divider"></div>

  <!-- Kundenname + Telefon -->
  <div style="margin:6px 0">
    <div class="bold" style="font-size:15px">${order.customer_name ?? '—'}</div>
    ${order.customer_phone
      ? `<div style="font-size:11px;color:#555;margin-top:2px">${order.customer_phone}</div>`
      : ''}
  </div>

  <div class="divider"></div>

  <!-- Artikel / Konfiguration -->
  ${itemsHtml}

  <div class="divider"></div>

  <!-- Gesamtbetrag -->
  <div style="display:flex;justify-content:space-between;align-items:baseline;margin-top:4px">
    <span class="bold" style="font-size:13px">GESAMT</span>
    <span class="bold" style="font-size:18px">${Number(order.total).toFixed(2).replace('.', ',')} €</span>
  </div>

  <div style="text-align:center;margin-top:14px;font-size:10px;color:#888;border-top:1px solid #ccc;padding-top:6px">
    Danke! Bis bald.
  </div>

</body>
</html>`

  const win = window.open('', '_blank', 'width=420,height=650')
  if (!win) return
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => { win.print(); win.close() }, 400)
}

// ─── Drawer Component ─────────────────────────────────────────────────────────

function OrderDrawer({
  order,
  patchingId,
  onClose,
  onPatch,
}: {
  order: Order
  patchingId: string | null
  onClose: () => void
  onPatch: (id: string, status: OrderStatus) => void
}) {
  const items = order.gastro_order_items ?? []

  // ESC to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <>
      {/* Overlay */}
      <div className="drawer-overlay" onClick={onClose} aria-hidden="true" />

      {/* Panel */}
      <aside className="drawer-panel" role="dialog" aria-modal="true" aria-label={`Bestellung ${order.order_number ?? ''}`}>

        {/* Header */}
        <div className="drawer-header">
          <div className="drawer-header-left">
            <span className="drawer-order-num">#{order.order_number ?? '—'}</span>
            <span className={`betrieb-dash-badge betrieb-dash-badge-${order.status}`}>
              {STATUS_LABEL[order.status]}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Print button */}
            <button
              type="button"
              className="drawer-print-btn"
              onClick={() => printOrder(order)}
              aria-label="Bon drucken"
              title="Bon drucken"
            >
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} width={18} height={18}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
              </svg>
              <span>Bon</span>
            </button>
            <button type="button" className="drawer-close-btn" onClick={onClose} aria-label="Schließen">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Meta */}
        <div className="drawer-meta">
          <span className="drawer-meta-name">{order.customer_name ?? '—'}</span>
          {order.customer_phone && (
            <a href={`tel:${order.customer_phone}`} className="drawer-meta-phone">
              📞 {order.customer_phone}
            </a>
          )}
          <div className="drawer-meta-row">
            <span className="betrieb-order-type">{ORDER_TYPE_LABEL[order.order_type ?? ''] ?? order.order_type ?? '—'}</span>
            {order.table_number && (
              <span className="drawer-meta-table">Tisch {order.table_number}</span>
            )}
            <span className="drawer-meta-time">{fmt(order.created_at)}</span>
          </div>
        </div>

        <div className="drawer-divider" />

        {/* Item list */}
        <div className="drawer-section">
          <p className="drawer-section-label">Bestellte Artikel</p>
          {items.length === 0 ? (
            <p className="drawer-empty-items">Keine Artikeldetails verfügbar.</p>
          ) : (
            <div className="drawer-item-list">
              {items.map(item => {
                const mods = renderModifiers(item.modifiers)
                return (
                  <div key={item.id} className="drawer-item-row">
                    <div className="drawer-item-qty">{item.quantity}×</div>
                    <div className="drawer-item-body">
                      <span className="drawer-item-name">{item.item_name}</span>
                      {mods && (
                        <span className="drawer-item-mods">{mods}</span>
                      )}
                      {item.notes && (
                        <span className="drawer-item-note">📝 {item.notes}</span>
                      )}
                    </div>
                    <div className="drawer-item-price">
                      {fmtPrice(Number(item.unit_price) * item.quantity)}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Order-level notes */}
          {order.notes && (
            <div className="drawer-order-note">
              <span className="drawer-order-note-label">Notiz</span>
              <span>{order.notes}</span>
            </div>
          )}
        </div>

        <div className="drawer-divider" />

        {/* Total */}
        <div className="drawer-total-row">
          <span className="drawer-total-label">Gesamt</span>
          <span className="drawer-total-value">{fmtPrice(Number(order.total))}</span>
        </div>

        <div className="drawer-divider" />

        {/* Status flow */}
        <div className="drawer-section">
          <p className="drawer-section-label">Status ändern</p>
          <div className="drawer-status-btns">
            {(['pending', 'confirmed', 'done'] as const).map(st => (
              <button
                key={st}
                type="button"
                disabled={patchingId === order.id}
                className={`drawer-status-btn${order.status === st ? ' drawer-status-btn--active' : ''}`}
                onClick={() => onPatch(order.id, st)}
              >
                {order.status === st && <span className="drawer-status-check">✓</span>}
                {STATUS_LABEL[st]}
              </button>
            ))}
          </div>
        </div>

        {/* Footer spacer for mobile */}
        <div style={{ height: 32 }} />
      </aside>
    </>
  )
}

// ─── Main View ────────────────────────────────────────────────────────────────

type Props = { slug: string }

export function BestellungenView({ slug }: Props) {
  const [orders, setOrders]           = useState<Order[]>([])
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [statusFilter, setStatus]     = useState<'all' | OrderStatus>('all')
  const [typeFilter, setType]         = useState<'all' | string>('all')
  const [dateFilter, setDate]         = useState<'today' | 'week' | 'all'>('today')
  const [search, setSearch]           = useState('')
  const [drawerOrder, setDrawerOrder] = useState<Order | null>(null)
  const [patchingId, setPatching]     = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [newOrderFlash, setNewOrderFlash] = useState(false)
  const inputRef                      = useRef<HTMLInputElement>(null)
  const lastOrderCountRef             = useRef(0)
  const drawerOrderRef                = useRef<Order | null>(null)
  drawerOrderRef.current              = drawerOrder

  // ── Sound ─────────────────────────────────────────────────────────────────

  const playNotification = useCallback(() => {
    try {
      const ctx  = new AudioContext()
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.frequency.value = 880; osc.type = 'sine'
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5)
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.5)
      setNewOrderFlash(true)
      setTimeout(() => setNewOrderFlash(false), 2000)
    } catch { /* Audio blocked */ }
  }, [])

  // ── Data ──────────────────────────────────────────────────────────────────

  const fetchOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setError(null)
    try {
      const res  = await fetch(`/api/${slug}/admin/orders`, { cache: 'no-store' })
      const data = await res.json() as { orders?: Order[]; error?: string }
      if (!res.ok) { setError(data.error ?? 'Fehler'); return }
      const newOrders = data.orders ?? []
      const newPending = newOrders.filter(o => o.status === 'pending').length
      if (silent && newPending > lastOrderCountRef.current && lastOrderCountRef.current > 0) {
        playNotification()
      }
      lastOrderCountRef.current = newPending
      setOrders(newOrders)
      // Keep drawer in sync if open — use ref to avoid dependency cycle
      if (drawerOrderRef.current) {
        const updated = newOrders.find(o => o.id === drawerOrderRef.current!.id)
        if (updated) setDrawerOrder(updated)
      }
    } catch { if (!silent) setError('Netzwerkfehler') }
    finally   { if (!silent) setLoading(false) }
  }, [slug, playNotification])

  useEffect(() => { void fetchOrders() }, [fetchOrders])

  useEffect(() => {
    if (!autoRefresh) return
    const id = setInterval(() => { void fetchOrders(true) }, 15_000)
    return () => clearInterval(id)
  }, [autoRefresh, fetchOrders])

  // ── Patch ─────────────────────────────────────────────────────────────────

  const patchStatus = useCallback(async (id: string, status: OrderStatus) => {
    setPatching(id)
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o))
    if (drawerOrder?.id === id) setDrawerOrder(prev => prev ? { ...prev, status } : prev)
    try {
      await fetch(`/api/${slug}/admin/orders/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
    } catch { void fetchOrders() }
    finally   { setPatching(null) }
  }, [slug, fetchOrders, drawerOrder])

  // ── Filters ───────────────────────────────────────────────────────────────

  const now   = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const week  = new Date(today.getTime() - 6 * 86400_000)

  const filtered = orders.filter(o => {
    if (statusFilter !== 'all' && o.status !== statusFilter) return false
    if (typeFilter   !== 'all' && o.order_type !== typeFilter) return false
    if (dateFilter === 'today' && new Date(o.created_at) < today) return false
    if (dateFilter === 'week'  && new Date(o.created_at) < week)  return false
    if (search) {
      const q = search.toLowerCase()
      if (
        !(o.customer_name  ?? '').toLowerCase().includes(q) &&
        !(o.customer_phone ?? '').includes(q) &&
        !(o.order_number   ?? '').toLowerCase().includes(q)
      ) return false
    }
    return true
  })

  const stats = {
    total:   orders.filter(o =>
      dateFilter === 'today' ? new Date(o.created_at) >= today
      : dateFilter === 'week'  ? new Date(o.created_at) >= week
      : true
    ).length,
    pending: filtered.filter(o => o.status === 'pending').length,
    revenue: filtered.reduce((s, o) => s + Number(o.total), 0),
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="betrieb-dash">

      {/* New order flash banner */}
      {newOrderFlash && (
        <div className="bestellungen-new-flash">
          🔔 Neue Bestellung eingegangen!
        </div>
      )}

      {/* KPI row */}
      <div className="betrieb-filter-bar" style={{ marginBottom: 16 }}>
        <span className="betrieb-dash-pill">
          <span className="betrieb-dash-pill-muted">Bestellungen</span>{stats.total}
        </span>
        <span className="betrieb-dash-pill" style={stats.pending > 0 ? { background: 'var(--accent-tint)', border: '1.5px solid var(--accent)' } : {}}>
          <span className="betrieb-dash-pill-muted">Offen</span>
          <span style={stats.pending > 0 ? { color: 'var(--accent-deep)', fontWeight: 800 } : {}}>{stats.pending}</span>
        </span>
        <span className="betrieb-dash-pill">
          <span className="betrieb-dash-pill-muted">Umsatz</span>{fmtPrice(stats.revenue)}
        </span>
        <button
          type="button"
          className="betrieb-dash-pill"
          onClick={() => setAutoRefresh(v => !v)}
          style={{
            cursor: 'pointer', border: 'none', fontFamily: 'var(--font-body)',
            background: autoRefresh ? 'var(--accent-tint)' : 'transparent',
            color: autoRefresh ? 'var(--accent-deep)' : 'var(--text-3)',
            outline: autoRefresh ? '1.5px solid var(--accent)' : 'none',
          }}
        >
          <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.04em' }}>
            {autoRefresh ? '● LIVE' : '⏸ PAUSE'}
          </span>
        </button>
        <button
          type="button"
          className={`betrieb-dash-pill${loading ? ' betrieb-dash-pill--refresh-loading' : ''}`}
          onClick={() => void fetchOrders()}
          disabled={loading}
        >
          <svg className="betrieb-dash-refresh-icon" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Filter bar */}
      <div className="betrieb-filter-bar" style={{ marginBottom: 16 }}>
        <input
          ref={inputRef}
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Name, Telefon, Bestellnr…"
          className="bestellungen-search"
        />
        {(['today', 'week', 'all'] as const).map(d => (
          <button key={d} type="button" className={`betrieb-filter-btn${dateFilter === d ? ' active' : ''}`}
            onClick={() => setDate(d)}>
            {d === 'today' ? 'Heute' : d === 'week' ? '7 Tage' : 'Alle'}
          </button>
        ))}
        <select value={statusFilter} onChange={e => setStatus(e.target.value as typeof statusFilter)} className="bestellungen-select">
          <option value="all">Alle Status</option>
          <option value="pending">Offen</option>
          <option value="confirmed">Bestätigt</option>
          <option value="done">Abgeholt</option>
        </select>
        <select value={typeFilter} onChange={e => setType(e.target.value)} className="bestellungen-select">
          <option value="all">Alle Typen</option>
          <option value="pickup">Abholen</option>
          <option value="dine-in">Vor Ort</option>
          <option value="delivery">Liefern</option>
        </select>
      </div>

      {error && <p className="betrieb-dash-error" role="alert">{error}</p>}

      {/* Orders table */}
      <div className="betrieb-dash-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading && filtered.length === 0 ? (
          <div className="betrieb-dash-empty" style={{ padding: 40 }}>
            <div className="betrieb-dash-empty-icon">⏳</div>Lade Bestellungen…
          </div>
        ) : filtered.length === 0 ? (
          <div className="betrieb-dash-empty" style={{ padding: 40 }}>
            <div className="betrieb-dash-empty-icon">🎉</div>Keine Bestellungen gefunden.
          </div>
        ) : (
          <table className="bestellungen-table">
            <thead>
              <tr>
                {['Nr.', 'Kunde', 'Typ', 'Status', 'Summe', 'Zeit', ''].map((h, i) => (
                  <th key={i} className="bestellungen-th">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(o => {
                const isActive = drawerOrder?.id === o.id
                return (
                  <tr
                    key={o.id}
                    className={`bestellungen-row${isActive ? ' bestellungen-row--active' : ''}`}
                    onClick={() => setDrawerOrder(isActive ? null : o)}
                  >
                    <td className="bestellungen-td bestellungen-td--mono">
                      {o.order_number ?? '—'}
                    </td>
                    <td className="bestellungen-td">
                      <div className="bestellungen-td-name">{o.customer_name ?? '—'}</div>
                      {o.customer_phone && (
                        <div className="bestellungen-td-sub">{o.customer_phone}</div>
                      )}
                    </td>
                    <td className="bestellungen-td">
                      <span className="betrieb-order-type">{ORDER_TYPE_LABEL[o.order_type ?? ''] ?? o.order_type ?? '—'}</span>
                      {o.table_number && (
                        <div className="bestellungen-td-sub">Tisch {o.table_number}</div>
                      )}
                    </td>
                    <td className="bestellungen-td">
                      <span className={`betrieb-dash-badge betrieb-dash-badge-${o.status}`}>
                        {STATUS_LABEL[o.status]}
                      </span>
                    </td>
                    <td className="bestellungen-td bestellungen-td--price">
                      {fmtPrice(Number(o.total))}
                    </td>
                    <td className="bestellungen-td bestellungen-td--time">
                      {fmt(o.created_at)}
                    </td>
                    <td className="bestellungen-td bestellungen-td--chevron">
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                        style={{ transform: isActive ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease', opacity: 0.4 }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <p className="bestellungen-count">{filtered.length} Einträge</p>

      {/* Side Drawer */}
      {drawerOrder && (
        <OrderDrawer
          order={drawerOrder}
          patchingId={patchingId}
          onClose={() => setDrawerOrder(null)}
          onPatch={patchStatus}
        />
      )}
    </div>
  )
}
