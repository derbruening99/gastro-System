'use client'

import { useState, useEffect, useCallback } from 'react'

type Customer = {
  id: string; name: string | null; phone: string | null; email: string | null
  orderCount: number; totalSpent: number; lastOrderAt: string | null; source: 'registered' | 'order'
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })
}
function fmtPrice(n: number) { return n.toFixed(2).replace('.', ',') + ' €' }

type Props = { slug: string }

export function KundenView({ slug }: Props) {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [search, setSearch]       = useState('')

  const fetch_ = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res  = await fetch(`/api/${slug}/admin/customers`, { cache: 'no-store' })
      const data = await res.json() as { customers?: Customer[]; error?: string }
      if (!res.ok) { setError(data.error ?? 'Fehler'); return }
      setCustomers(data.customers ?? [])
    } catch { setError('Netzwerkfehler') } finally { setLoading(false) }
  }, [slug])

  useEffect(() => { void fetch_() }, [fetch_])

  const filtered = customers.filter(c => {
    if (!search) return true
    const q = search.toLowerCase()
    return (c.name ?? '').toLowerCase().includes(q) || (c.phone ?? '').includes(q) || (c.email ?? '').toLowerCase().includes(q)
  })

  const totalRevenue = customers.reduce((s, c) => s + c.totalSpent, 0)
  const avgOrders    = customers.length > 0 ? (customers.reduce((s, c) => s + c.orderCount, 0) / customers.length) : 0

  return (
    <div className="betrieb-dash">
      {/* KPI */}
      <div className="betrieb-filter-bar" style={{ marginBottom: 16 }}>
        <span className="betrieb-dash-pill"><span className="betrieb-dash-pill-muted">Kunden</span>{customers.length}</span>
        <span className="betrieb-dash-pill"><span className="betrieb-dash-pill-muted">Gesamtumsatz</span>{fmtPrice(totalRevenue)}</span>
        <span className="betrieb-dash-pill"><span className="betrieb-dash-pill-muted">Ø Bestellungen</span>{avgOrders.toFixed(1)}</span>
        <button type="button" className={`betrieb-dash-pill${loading ? ' betrieb-dash-pill--refresh-loading' : ''}`}
          onClick={() => void fetch_()} disabled={loading}>
          <svg className="betrieb-dash-refresh-icon" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Search */}
      <div className="betrieb-filter-bar">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Name, Telefon, E-Mail suchen…"
          style={{ padding: '7px 14px', borderRadius: 20, border: '1.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font-body)', outline: 'none', minWidth: 240 }} />
      </div>

      {error && <p className="betrieb-dash-error" role="alert">{error}</p>}

      <div className="betrieb-dash-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading && filtered.length === 0 ? (
          <div className="betrieb-dash-empty" style={{ padding: 40 }}><div className="betrieb-dash-empty-icon">⏳</div>Lade Kunden…</div>
        ) : filtered.length === 0 ? (
          <div className="betrieb-dash-empty" style={{ padding: 40 }}><div className="betrieb-dash-empty-icon">👤</div>Keine Kunden gefunden.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Kunde', 'Telefon', 'E-Mail', 'Bestellungen', 'Umsatz', 'Letzte Bestellung'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-head)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--border-soft)' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{c.name ?? '—'}</div>
                    {c.source === 'registered' && (
                      <span style={{ fontSize: 10, background: 'var(--accent-soft)', color: 'var(--accent-deep)', borderRadius: 4, padding: '1px 5px', fontWeight: 700 }}>Registriert</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13 }}>
                    {c.phone ? <a href={`tel:${c.phone}`} style={{ color: 'var(--accent-deep)', textDecoration: 'none' }}>{c.phone}</a> : '—'}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-2)' }}>{c.email ?? '—'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: 18, color: c.orderCount > 2 ? 'var(--accent-deep)' : 'var(--text)' }}>
                      {c.orderCount}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 13 }}>
                    {fmtPrice(c.totalSpent)}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-2)' }}>
                    {fmtDate(c.lastOrderAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 10, textAlign: 'right' }}>{filtered.length} Kunden</p>
    </div>
  )
}
