'use client'

import { useState, useEffect, useCallback } from 'react'
import * as QRCode from 'qrcode'
import { jsPDF } from 'jspdf'

type Props = { slug: string }

type SavedQR = {
  id: string
  label: string
  source_type: 'table' | 'counter' | 'box'
  table_number: number | null
  is_active: boolean
  created_at: string
  updated_at: string
}

type Analytics = {
  totalScans: number
  conversions: number
  conversionRate: number
  scansBySource: { source_type: string; count: number }[]
  scansByDay: { date: string; count: number; conversions: number }[]
  topTables: { table_number: number; count: number }[]
  recentScans: { id: string; source_type: string; source_label: string | null; table_number: number | null; scanned_at: string; converted: boolean }[]
}

const SOURCE_LABELS: Record<string, string> = { table: '🪑 Tisch', counter: '🏪 Theke', box: '📦 Box' }
const SOURCE_OPTS: { id: 'table' | 'counter' | 'box'; label: string; emoji: string }[] = [
  { id: 'table', label: 'Tisch', emoji: '🪑' },
  { id: 'counter', label: 'Theke', emoji: '🏪' },
  { id: 'box', label: 'Box', emoji: '📦' },
]
const PERIOD_LABELS: Record<string, string> = { today: 'Heute', week: 'Woche', month: 'Monat', all: 'Gesamt' }

function fmtTime(iso: string) { return new Date(iso).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) }
function fmtPct(n: number) { return `${Math.round(n * 100)}%` }

function buildQrUrl(baseUrl: string, slug: string, qr: SavedQR) {
  if (qr.source_type === 'counter') return `${baseUrl}/${slug}/qr?mode=pickup`
  if (qr.source_type === 'box') return `${baseUrl}/${slug}/qr?mode=box&source_type=box&source_label=${encodeURIComponent(qr.label)}`
  return `${baseUrl}/${slug}/qr?table=${qr.table_number ?? 1}`
}

export function QrCodeView({ slug }: Props) {
  const [baseUrl, setBaseUrl] = useState('')
  const [tab, setTab] = useState<'codes' | 'analytics'>('codes')

  // Saved QR codes
  const [savedCodes, setSavedCodes] = useState<SavedQR[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{ label: string; source_type: 'table' | 'counter' | 'box'; table_number: number | null }>({ label: '', source_type: 'table', table_number: null })
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState<{ label: string; source_type: 'table' | 'counter' | 'box'; table_number: number | null }>({ label: '', source_type: 'table', table_number: 1 })
  const [batchFrom, setBatchFrom] = useState(1)
  const [batchTo, setBatchTo] = useState(10)
  const [showBatch, setShowBatch] = useState(false)
  const [saving, setSaving] = useState(false)
  const [qrImages, setQrImages] = useState<Record<string, string>>({})
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [scanCounts, setScanCounts] = useState<Record<string, number>>({})

  // Analytics state
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [period, setPeriod] = useState('week')
  const [analyticsLoading, setAnalyticsLoading] = useState(false)


  useEffect(() => { if (typeof window !== 'undefined') setBaseUrl(window.location.origin) }, [])

  // Fetch saved QR codes
  const fetchCodes = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/${slug}/admin/qr-codes`, { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setSavedCodes(data.qr_codes ?? [])
      }
    } catch { /* silent */ } finally { setLoading(false) }
  }, [slug])

  useEffect(() => { void fetchCodes() }, [fetchCodes])

  // Generate QR images for saved codes
  useEffect(() => {
    if (!baseUrl || savedCodes.length === 0) return
    const gen = async () => {
      const opts = { errorCorrectionLevel: 'H' as const, type: 'image/png' as const, width: 300, margin: 1, color: { dark: '#000000', light: '#ffffff' } }
      const imgs: Record<string, string> = {}
      for (const qr of savedCodes) {
        const url = buildQrUrl(baseUrl, slug, qr)
        imgs[qr.id] = await (QRCode as any).toDataURL(url, opts)
      }
      setQrImages(imgs)
    }
    void gen()
  }, [savedCodes, baseUrl, slug])

  // Fetch analytics
  const fetchAnalytics = useCallback(async () => {
    setAnalyticsLoading(true)
    try {
      const res = await fetch(`/api/${slug}/admin/qr-analytics?period=${period}`, { cache: 'no-store' })
      if (res.ok) setAnalytics(await res.json() as Analytics)
    } catch { /* silent */ } finally { setAnalyticsLoading(false) }
  }, [slug, period])

  useEffect(() => { if (tab === 'analytics') void fetchAnalytics() }, [fetchAnalytics, tab])

  // Fetch scan counts per source_label
  useEffect(() => {
    if (savedCodes.length === 0) return
    void (async () => {
      try {
        const res = await fetch(`/api/${slug}/admin/qr-analytics?period=all`, { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json() as Analytics
          const counts: Record<string, number> = {}
          // Map scans to QR codes by matching source_label
          for (const qr of savedCodes) {
            const matching = data.recentScans?.filter(s =>
              (s.source_type === qr.source_type) &&
              (qr.source_type === 'table' ? s.table_number === qr.table_number : s.source_label === qr.label)
            ) ?? []
            counts[qr.id] = matching.length
          }
          // Also use scansBySource for totals
          setScanCounts(counts)
        }
      } catch { /* silent */ }
    })()
  }, [savedCodes, slug])

  // Copy URL to clipboard
  const copyUrl = (qr: SavedQR) => {
    if (!baseUrl) return
    const url = buildQrUrl(baseUrl, slug, qr)
    void navigator.clipboard.writeText(url)
    setCopiedId(qr.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  // Sort: tables by number, then counter, then boxes
  const sortedCodes = [...savedCodes].sort((a, b) => {
    const typeOrder = { table: 0, counter: 1, box: 2 }
    const ta = typeOrder[a.source_type] ?? 3
    const tb = typeOrder[b.source_type] ?? 3
    if (ta !== tb) return ta - tb
    if (a.source_type === 'table' && b.source_type === 'table') return (a.table_number ?? 0) - (b.table_number ?? 0)
    return a.label.localeCompare(b.label)
  })

  // CRUD handlers
  const createCode = async () => {
    if (!createForm.label.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/${slug}/admin/qr-codes`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      })
      if (res.ok) {
        setShowCreate(false)
        setCreateForm({ label: '', source_type: 'table', table_number: 1 })
        void fetchCodes()
      }
    } catch { /* silent */ } finally { setSaving(false) }
  }

  // Batch create table QR codes
  const batchCreateTables = async () => {
    if (batchFrom > batchTo || batchTo - batchFrom > 50) return
    setSaving(true)
    try {
      for (let i = batchFrom; i <= batchTo; i++) {
        await fetch(`/api/${slug}/admin/qr-codes`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ label: `Tisch ${i}`, source_type: 'table', table_number: i }),
        })
      }
      setShowBatch(false)
      void fetchCodes()
    } catch { /* silent */ } finally { setSaving(false) }
  }

  const updateCode = async (id: string) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/${slug}/admin/qr-codes`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...editForm }),
      })
      if (res.ok) {
        setEditingId(null)
        void fetchCodes()
      }
    } catch { /* silent */ } finally { setSaving(false) }
  }

  const toggleActive = async (qr: SavedQR) => {
    await fetch(`/api/${slug}/admin/qr-codes`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: qr.id, is_active: !qr.is_active }),
    })
    void fetchCodes()
  }

  const deleteCode = async (id: string) => {
    await fetch(`/api/${slug}/admin/qr-codes`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setDeleteConfirm(null)
    void fetchCodes()
  }

  const downloadQr = (name: string, dataUrl: string) => {
    const a = document.createElement('a'); a.href = dataUrl; a.download = `${name}.png`
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
  }

  const downloadAllPdf = (codes: { label: string; dataUrl: string }[]) => {
    if (codes.length === 0) return
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pw = pdf.internal.pageSize.getWidth(), m = 10, cols = 3
    const qrW = (pw - m * 2) / cols, rowH = qrW + 10
    let col = 0, row = 0
    for (const { label, dataUrl } of codes) {
      const x = m + col * qrW, y = m + row * rowH
      pdf.addImage(dataUrl, 'PNG', x + 5, y + 2, qrW - 10, qrW - 10)
      pdf.setFontSize(9); pdf.text(label, x + qrW / 2, y + qrW - 2, { align: 'center' })
      col++
      if (col >= cols) { col = 0; row++ }
      if (y + rowH * 2 > pdf.internal.pageSize.getHeight() && col === 0) { pdf.addPage(); row = 0 }
    }
    pdf.save('qr-codes-alle.pdf')
  }


  const startEdit = (qr: SavedQR) => {
    setEditingId(qr.id)
    setEditForm({ label: qr.label, source_type: qr.source_type, table_number: qr.table_number })
  }

  const maxDayCount = analytics ? Math.max(...analytics.scansByDay.map(d => d.count), 1) : 1
  const maxTableCount2 = analytics ? Math.max(...analytics.topTables.map(t => t.count), 1) : 1

  const inputStyle = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text)', fontSize: 13, boxSizing: 'border-box' as const }
  const btnPrimary = { padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }
  const btnSecondary = { padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-2)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }

  return (
    <div className="betrieb-dash">
      {/* Tab Switcher */}
      <div className="betrieb-filter-bar" style={{ marginBottom: 20 }}>
        {(['codes', 'analytics'] as const).map(t => (
          <button key={t} type="button" onClick={() => setTab(t)}
            style={{ background: tab === t ? 'var(--accent)' : 'var(--surface-2)', color: tab === t ? '#fff' : 'var(--text-2)', cursor: 'pointer', border: 'none', fontWeight: 700, fontSize: 13, padding: '6px 14px', borderRadius: 8 }}>
            {t === 'codes' ? '📋 QR-Codes' : '📊 Analytics'}
          </button>
        ))}
      </div>

      {/* ═══ SAVED QR CODES TAB ═══ */}
      {tab === 'codes' && (
        <>
          {/* Header + Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
            <span className="betrieb-dash-pill">
              <span className="betrieb-dash-pill-muted">Gespeichert</span>{savedCodes.length}
            </span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {savedCodes.length > 0 && Object.keys(qrImages).length > 0 && (
                <button type="button" onClick={() => downloadAllPdf(sortedCodes.filter(c => c.is_active).map(c => ({ label: c.label, dataUrl: qrImages[c.id] })).filter(c => c.dataUrl))}
                  style={{ ...btnSecondary, fontSize: 12 }}>
                  📄 Alle als PDF
                </button>
              )}
              <button type="button" onClick={() => setShowBatch(true)} style={{ ...btnSecondary, fontSize: 12 }}>
                📋 Tische Batch
              </button>
              <button type="button" onClick={() => setShowCreate(true)} style={btnPrimary}>
                + Neuer QR-Code
              </button>
            </div>
          </div>

          {/* Batch Create Form */}
          {showBatch && (
            <div className="betrieb-dash-card" style={{ padding: 20, marginBottom: 16, border: '2px solid #3b82f6' }}>
              <h3 style={{ margin: '0 0 10px', fontFamily: 'var(--font-head)', fontSize: '0.9rem', fontWeight: 800 }}>📋 Tisch-QR-Codes auf einmal erstellen</h3>
              <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '0 0 12px' }}>Erstellt automatisch QR-Codes für Tisch X bis Y.</p>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>Von Tisch</label>
                  <input type="number" value={batchFrom} onChange={e => setBatchFrom(Math.max(1, parseInt(e.target.value) || 1))} min={1} style={{ ...inputStyle, width: 80 }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>Bis Tisch</label>
                  <input type="number" value={batchTo} onChange={e => setBatchTo(Math.max(1, parseInt(e.target.value) || 1))} min={1} style={{ ...inputStyle, width: 80 }} />
                </div>
                <span style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 600, paddingBottom: 8 }}>
                  = {Math.max(0, batchTo - batchFrom + 1)} QR-Codes
                </span>
                <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
                  <button type="button" onClick={() => setShowBatch(false)} style={btnSecondary}>Abbrechen</button>
                  <button type="button" onClick={() => void batchCreateTables()} disabled={saving || batchFrom > batchTo}
                    style={{ ...btnPrimary, background: '#3b82f6', opacity: saving || batchFrom > batchTo ? 0.5 : 1 }}>
                    {saving ? 'Erstelle…' : 'Erstellen'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Create Form */}
          {showCreate && (
            <div className="betrieb-dash-card" style={{ padding: 20, marginBottom: 16, border: '2px solid var(--accent)' }}>
              <h3 style={{ margin: '0 0 14px', fontFamily: 'var(--font-head)', fontSize: '0.9rem', fontWeight: 800 }}>Neuen QR-Code erstellen</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ flex: '0 0 auto' }}>
                  <label style={{ fontSize: 12, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>Typ</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {SOURCE_OPTS.map(o => (
                      <button key={o.id} type="button" onClick={() => setCreateForm(f => ({ ...f, source_type: o.id, table_number: o.id === 'table' ? 1 : null }))}
                        style={{ padding: '6px 12px', borderRadius: 8, border: createForm.source_type === o.id ? '2px solid var(--accent)' : '1px solid var(--border)', background: createForm.source_type === o.id ? 'var(--accent-tint)' : 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                        {o.emoji} {o.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ flex: '1 1 180px' }}>
                  <label style={{ fontSize: 12, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>Label</label>
                  <input type="text" value={createForm.label} onChange={e => setCreateForm(f => ({ ...f, label: e.target.value }))}
                    placeholder={createForm.source_type === 'table' ? 'z.B. Tisch 1' : createForm.source_type === 'counter' ? 'z.B. Theke Haupteingang' : 'z.B. Flyer Innenstadt'}
                    style={inputStyle} />
                </div>
                {createForm.source_type === 'table' && (
                  <div style={{ flex: '0 0 100px' }}>
                    <label style={{ fontSize: 12, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>Tisch-Nr.</label>
                    <input type="number" value={createForm.table_number ?? ''} onChange={e => setCreateForm(f => ({ ...f, table_number: parseInt(e.target.value) || null }))} min={1}
                      style={inputStyle} />
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowCreate(false)} style={btnSecondary}>Abbrechen</button>
                <button type="button" onClick={() => void createCode()} disabled={saving || !createForm.label.trim()} style={{ ...btnPrimary, opacity: saving || !createForm.label.trim() ? 0.5 : 1 }}>
                  {saving ? 'Speichern…' : 'Speichern'}
                </button>
              </div>
            </div>
          )}

          {/* Loading */}
          {loading && <div className="betrieb-dash-card"><div className="betrieb-dash-empty">Lade QR-Codes…</div></div>}

          {/* Empty State */}
          {!loading && savedCodes.length === 0 && (
            <div className="betrieb-dash-card">
              <div className="betrieb-dash-empty">
                <div className="betrieb-dash-empty-icon">🔲</div>
                Noch keine QR-Codes gespeichert. Erstelle deinen ersten QR-Code!
              </div>
            </div>
          )}

          {/* QR Code Grid */}
          {!loading && savedCodes.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
              {sortedCodes.map(qr => {
                const isEditing = editingId === qr.id
                const img = qrImages[qr.id]
                const url = baseUrl ? buildQrUrl(baseUrl, slug, qr) : ''
                const scans = scanCounts[qr.id] ?? 0

                return (
                  <div key={qr.id} className="betrieb-dash-card" style={{ padding: 16, opacity: qr.is_active ? 1 : 0.5, position: 'relative' }}>
                    {/* Badges */}
                    <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 4 }}>
                      {scans > 0 && (
                        <span style={{ fontSize: 10, fontWeight: 700, background: 'var(--accent-tint)', color: 'var(--accent-deep)', padding: '2px 8px', borderRadius: 4 }}>
                          {scans} Scans
                        </span>
                      )}
                      {!qr.is_active && (
                        <span style={{ fontSize: 10, fontWeight: 700, background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: 4 }}>
                          Deaktiviert
                        </span>
                      )}
                    </div>

                    {/* QR Image */}
                    {img && (
                      <div style={{ padding: 8, background: '#fff', borderRadius: 8, border: '1px solid var(--border)', marginBottom: 10, textAlign: 'center' }}>
                        <img src={img} alt={qr.label} style={{ maxWidth: '100%', height: 'auto', maxHeight: 180 }} />
                      </div>
                    )}

                    {isEditing ? (
                      /* Edit Form */
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {SOURCE_OPTS.map(o => (
                            <button key={o.id} type="button" onClick={() => setEditForm(f => ({ ...f, source_type: o.id }))}
                              style={{ padding: '4px 8px', borderRadius: 6, border: editForm.source_type === o.id ? '2px solid var(--accent)' : '1px solid var(--border)', background: editForm.source_type === o.id ? 'var(--accent-tint)' : 'transparent', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
                              {o.emoji}
                            </button>
                          ))}
                        </div>
                        <input type="text" value={editForm.label} onChange={e => setEditForm(f => ({ ...f, label: e.target.value }))}
                          style={{ ...inputStyle, fontSize: 12 }} />
                        {editForm.source_type === 'table' && (
                          <input type="number" value={editForm.table_number ?? ''} onChange={e => setEditForm(f => ({ ...f, table_number: parseInt(e.target.value) || null }))} min={1} placeholder="Tisch-Nr."
                            style={{ ...inputStyle, fontSize: 12 }} />
                        )}
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button type="button" onClick={() => setEditingId(null)} style={{ ...btnSecondary, fontSize: 11, padding: '5px 10px' }}>Abbrechen</button>
                          <button type="button" onClick={() => void updateCode(qr.id)} disabled={saving} style={{ ...btnPrimary, fontSize: 11, padding: '5px 10px' }}>Speichern</button>
                        </div>
                      </div>
                    ) : (
                      /* Display */
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <span style={{ fontSize: 16 }}>{SOURCE_LABELS[qr.source_type]?.split(' ')[0]}</span>
                          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{qr.label}</span>
                        </div>

                        {/* URL Display + Copy */}
                        {url && (
                          <button type="button" onClick={() => copyUrl(qr)}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '6px 10px', background: 'var(--surface-2)', borderRadius: 6, border: '1px solid var(--border)', cursor: 'pointer', marginBottom: 8, textAlign: 'left' }}>
                            <span style={{ fontSize: 11, color: 'var(--text-3)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {url.replace(/^https?:\/\//, '')}
                            </span>
                            <span style={{ fontSize: 11, fontWeight: 600, color: copiedId === qr.id ? 'var(--accent-deep)' : 'var(--text-2)', flexShrink: 0 }}>
                              {copiedId === qr.id ? '✓ Kopiert' : '📋 Copy'}
                            </span>
                          </button>
                        )}

                        <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 8 }}>
                          Erstellt: {fmtTime(qr.created_at)}
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {img && (
                            <button type="button" onClick={() => downloadQr(qr.label.replace(/\s/g, '-'), img)}
                              style={{ ...btnSecondary, fontSize: 11, padding: '4px 10px' }}>
                              📥 PNG
                            </button>
                          )}
                          <button type="button" onClick={() => startEdit(qr)}
                            style={{ ...btnSecondary, fontSize: 11, padding: '4px 10px' }}>
                            ✏️
                          </button>
                          <button type="button" onClick={() => void toggleActive(qr)}
                            style={{ ...btnSecondary, fontSize: 11, padding: '4px 10px' }}>
                            {qr.is_active ? '⏸' : '▶️'}
                          </button>
                          {deleteConfirm === qr.id ? (
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button type="button" onClick={() => void deleteCode(qr.id)}
                                style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: '#ef4444', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                                Ja, löschen
                              </button>
                              <button type="button" onClick={() => setDeleteConfirm(null)}
                                style={{ ...btnSecondary, fontSize: 11, padding: '4px 8px' }}>
                                Nein
                              </button>
                            </div>
                          ) : (
                            <button type="button" onClick={() => setDeleteConfirm(qr.id)}
                              style={{ ...btnSecondary, fontSize: 11, padding: '4px 10px', color: '#ef4444', borderColor: '#fecaca' }}>
                              🗑️
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ═══ ANALYTICS TAB ═══ */}
      {tab === 'analytics' && (
        <>
          <div className="betrieb-filter-bar" style={{ marginBottom: 20 }}>
            {Object.entries(PERIOD_LABELS).map(([key, label]) => (
              <button key={key} type="button" className="betrieb-dash-pill"
                onClick={() => setPeriod(key)}
                style={{ background: period === key ? 'var(--accent-tint)' : 'transparent', color: period === key ? 'var(--accent-deep)' : 'var(--text-2)', border: period === key ? '1.5px solid var(--accent)' : '1px solid var(--border)', cursor: 'pointer', fontWeight: 600, fontSize: 12 }}>
                {label}
              </button>
            ))}
            <button type="button" onClick={() => void fetchAnalytics()} disabled={analyticsLoading}
              style={{ ...btnSecondary, fontSize: 11, padding: '4px 10px', opacity: analyticsLoading ? 0.5 : 1 }}>
              🔄
            </button>
          </div>

          <div className="betrieb-filter-bar" style={{ marginBottom: 20 }}>
            <span className="betrieb-dash-pill"><span className="betrieb-dash-pill-muted">Scans</span>{analytics?.totalScans ?? 0}</span>
            <span className="betrieb-dash-pill"><span className="betrieb-dash-pill-muted">Conversions</span>{analytics?.conversions ?? 0}</span>
            <span className="betrieb-dash-pill"><span className="betrieb-dash-pill-muted">Rate</span>{analytics ? fmtPct(analytics.conversionRate) : '—'}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
            {['table', 'counter', 'box'].map(src => {
              const count = analytics?.scansBySource.find(s => s.source_type === src)?.count ?? 0
              const pct = analytics && analytics.totalScans > 0 ? count / analytics.totalScans : 0
              return (
                <div key={src} className="betrieb-dash-card" style={{ padding: 16, textAlign: 'center' }}>
                  <div style={{ fontSize: 24, marginBottom: 4 }}>{SOURCE_LABELS[src]?.split(' ')[0] || '📊'}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-head)', color: 'var(--accent-deep)' }}>{count}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{SOURCE_LABELS[src]?.split(' ')[1] || src}</div>
                  <div style={{ marginTop: 8, height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct * 100}%`, background: 'var(--accent)', borderRadius: 2, transition: 'width 0.3s' }} />
                  </div>
                </div>
              )
            })}
          </div>

          {analytics && analytics.scansByDay.length > 0 && (
            <div className="betrieb-dash-card" style={{ padding: 20, marginBottom: 20 }}>
              <h2 style={{ margin: '0 0 16px', fontFamily: 'var(--font-head)', fontSize: '0.9rem', fontWeight: 800 }}>Scans pro Tag</h2>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 120 }}>
                {analytics.scansByDay.map(d => (
                  <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 10, color: 'var(--text-2)', fontWeight: 600 }}>{d.count}</span>
                    <div style={{ width: '100%', maxWidth: 32, height: `${Math.max((d.count / maxDayCount) * 100, 4)}%`, background: 'var(--accent)', borderRadius: '4px 4px 0 0', transition: 'height 0.3s', position: 'relative' }}>
                      {d.conversions > 0 && (
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${(d.conversions / d.count) * 100}%`, background: 'var(--accent-deep)', borderRadius: '0 0 0 0', opacity: 0.6 }} />
                      )}
                    </div>
                    <span style={{ fontSize: 9, color: 'var(--text-3)', transform: 'rotate(-45deg)', whiteSpace: 'nowrap' }}>{d.date.slice(5)}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 11, color: 'var(--text-3)' }}>
                <span><span style={{ display: 'inline-block', width: 10, height: 10, background: 'var(--accent)', borderRadius: 2, marginRight: 4 }} />Scans</span>
                <span><span style={{ display: 'inline-block', width: 10, height: 10, background: 'var(--accent-deep)', borderRadius: 2, marginRight: 4, opacity: 0.6 }} />Conversions</span>
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div className="betrieb-dash-card" style={{ padding: 20 }}>
              <h2 style={{ margin: '0 0 12px', fontFamily: 'var(--font-head)', fontSize: '0.9rem', fontWeight: 800 }}>Top Tische</h2>
              {(!analytics || analytics.topTables.length === 0) ? (
                <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Noch keine Tisch-Scans.</div>
              ) : analytics.topTables.map((t, i) => (
                <div key={t.table_number} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: i < 3 ? 'var(--accent-deep)' : 'var(--text-2)', width: 24 }}>#{i + 1}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, flex: '0 0 60px' }}>Tisch {t.table_number}</span>
                  <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(t.count / maxTableCount2) * 100}%`, background: 'var(--accent)', borderRadius: 3 }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)' }}>{t.count}</span>
                </div>
              ))}
            </div>

            <div className="betrieb-dash-card" style={{ padding: 20 }}>
              <h2 style={{ margin: '0 0 12px', fontFamily: 'var(--font-head)', fontSize: '0.9rem', fontWeight: 800 }}>Letzte Scans</h2>
              {(!analytics || analytics.recentScans.length === 0) ? (
                <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Noch keine Scans erfasst.</div>
              ) : analytics.recentScans.slice(0, 8).map(s => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: 12 }}>
                  <span>{SOURCE_LABELS[s.source_type]?.split(' ')[0] || '📊'}</span>
                  <span style={{ flex: 1, color: 'var(--text-2)' }}>{s.source_label || s.source_type}{s.table_number ? ` ${s.table_number}` : ''}</span>
                  {s.converted && <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent-deep)', background: 'var(--accent-tint)', padding: '1px 6px', borderRadius: 4 }}>Bestellt</span>}
                  <span style={{ color: 'var(--text-3)', fontSize: 11 }}>{fmtTime(s.scanned_at)}</span>
                </div>
              ))}
            </div>
          </div>

          {analytics && analytics.totalScans === 0 && (
            <div className="betrieb-dash-card">
              <div className="betrieb-dash-empty">
                <div className="betrieb-dash-empty-icon">📊</div>
                Noch keine QR-Scans erfasst. Generiere QR-Codes und verteile sie, um Daten zu sammeln.
              </div>
            </div>
          )}
        </>
      )}

    </div>
  )
}
