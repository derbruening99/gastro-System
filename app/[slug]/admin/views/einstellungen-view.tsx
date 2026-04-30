'use client'

import { useState, useEffect, useCallback } from 'react'

type DayHours = { day: string; open: string; close: string; is_closed: boolean }
type NewsItem  = { id: string; title: string; body: string | null; is_published: boolean; created_at: string }

const DAYS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag']

function defaultHours(): DayHours[] {
  return DAYS.map(day => ({ day, open: '11:00', close: '21:00', is_closed: false }))
}

type Tab = 'hours' | 'contact' | 'news'

type Props = { slug: string }

export function EinstellungenView({ slug }: Props) {
  const [tab, setTab] = useState<Tab>('hours')

  return (
    <div className="betrieb-dash">
      {/* Tab bar */}
      <div className="betrieb-filter-bar" style={{ marginBottom: 20 }}>
        {([
          { key: 'hours',   label: '🕐 Öffnungszeiten' },
          { key: 'contact', label: '📍 Kontakt' },
          { key: 'news',    label: '📢 News' },
        ] as { key: Tab; label: string }[]).map(t => (
          <button key={t.key} type="button"
            className={`betrieb-filter-btn${tab === t.key ? ' active' : ''}`}
            onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'hours'   && <OpeningHoursTab slug={slug} />}
      {tab === 'contact' && <ContactTab      slug={slug} />}
      {tab === 'news'    && <NewsTab         slug={slug} />}
    </div>
  )
}

// ─── Opening Hours ──────────────────────────────────────────────────────────

function OpeningHoursTab({ slug }: { slug: string }) {
  const [hours, setHours]   = useState<DayHours[]>(defaultHours())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [toast, setToast]     = useState<string | null>(null)
  const [error, setError]     = useState<string | null>(null)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500) }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch(`/api/${slug}/admin/settings`, { cache: 'no-store' })
      const data = await res.json() as { settings?: Record<string, unknown> }
      if (data.settings?.opening_hours && Array.isArray(data.settings.opening_hours)) {
        setHours(data.settings.opening_hours as DayHours[])
      }
    } catch { /* keep defaults */ } finally { setLoading(false) }
  }, [slug])

  useEffect(() => { void load() }, [load])

  function updateDay(index: number, patch: Partial<DayHours>) {
    setHours(prev => prev.map((h, i) => i === index ? { ...h, ...patch } : h))
  }

  async function save() {
    setSaving(true); setError(null)
    try {
      const res = await fetch(`/api/${slug}/admin/settings`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'opening_hours', value: hours }),
      })
      if (!res.ok) { const d = await res.json() as { error?: string }; setError(d.error ?? 'Fehler'); return }
      showToast('Öffnungszeiten gespeichert ✓')
    } catch { setError('Netzwerkfehler') } finally { setSaving(false) }
  }

  if (loading) return <div className="betrieb-dash-empty"><div className="betrieb-dash-empty-icon">⏳</div>Lade…</div>

  return (
    <div className="betrieb-dash-card">
      <h2 style={{ margin: '0 0 16px', fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: '1rem' }}>Öffnungszeiten</h2>
      {error && <p className="betrieb-dash-error">{error}</p>}
      {toast && (
        <div style={{ marginBottom: 12, padding: '8px 16px', borderRadius: 10, background: 'var(--accent-tint)', color: 'var(--accent-deep)', fontSize: 13, fontWeight: 600 }}>
          {toast}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {hours.map((h, i) => (
          <div key={h.day} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border-soft)' }}>
            <div style={{ width: 100, fontSize: 14, fontWeight: 600, color: h.is_closed ? 'var(--text-3)' : 'var(--text)' }}>
              {h.day}
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', userSelect: 'none', color: 'var(--text-2)' }}>
              <input type="checkbox" checked={h.is_closed} onChange={e => updateDay(i, { is_closed: e.target.checked })} />
              Geschlossen
            </label>
            {!h.is_closed && (
              <>
                <input type="time" value={h.open} onChange={e => updateDay(i, { open: e.target.value })}
                  style={{ padding: '6px 10px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font-body)' }} />
                <span style={{ color: 'var(--text-3)', fontSize: 13 }}>–</span>
                <input type="time" value={h.close} onChange={e => updateDay(i, { close: e.target.value })}
                  style={{ padding: '6px 10px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font-body)' }} />
              </>
            )}
          </div>
        ))}
      </div>
      <button type="button" onClick={save} disabled={saving}
        style={{ marginTop: 20, padding: '10px 28px', borderRadius: 20, border: 'none', background: 'var(--accent)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'var(--font-body)', opacity: saving ? 0.7 : 1 }}>
        {saving ? 'Speichere…' : 'Speichern'}
      </button>
    </div>
  )
}

// ─── Contact ────────────────────────────────────────────────────────────────

function ContactTab({ slug }: { slug: string }) {
  const [phone, setPhone]     = useState('')
  const [address, setAddress] = useState('')
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [toast, setToast]     = useState<string | null>(null)
  const [error, setError]     = useState<string | null>(null)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500) }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch(`/api/${slug}/admin/settings`, { cache: 'no-store' })
      const data = await res.json() as { settings?: Record<string, unknown> }
      const c = data.settings?.contact as Record<string, string> | undefined
      if (c) { setPhone(c.phone ?? ''); setAddress(c.address ?? ''); setEmail(c.email ?? '') }
    } catch { /* keep defaults */ } finally { setLoading(false) }
  }, [slug])

  useEffect(() => { void load() }, [load])

  async function save() {
    setSaving(true); setError(null)
    try {
      const res = await fetch(`/api/${slug}/admin/settings`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'contact', value: { phone, address, email } }),
      })
      if (!res.ok) { const d = await res.json() as { error?: string }; setError(d.error ?? 'Fehler'); return }
      showToast('Kontaktdaten gespeichert ✓')
    } catch { setError('Netzwerkfehler') } finally { setSaving(false) }
  }

  if (loading) return <div className="betrieb-dash-empty"><div className="betrieb-dash-empty-icon">⏳</div>Lade…</div>

  const inputStyle = {
    padding: '10px 14px', borderRadius: 10, border: '1.5px solid var(--border)',
    background: 'var(--surface)', color: 'var(--text)', fontSize: 14,
    fontFamily: 'var(--font-body)', outline: 'none', width: '100%', boxSizing: 'border-box' as const,
  }
  const labelStyle = { fontSize: 11, fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 6, display: 'block' }

  return (
    <div className="betrieb-dash-card">
      <h2 style={{ margin: '0 0 16px', fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: '1rem' }}>Kontaktdaten</h2>
      {error && <p className="betrieb-dash-error">{error}</p>}
      {toast && (
        <div style={{ marginBottom: 12, padding: '8px 16px', borderRadius: 10, background: 'var(--accent-tint)', color: 'var(--accent-deep)', fontSize: 13, fontWeight: 600 }}>
          {toast}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={labelStyle}>Telefon</label>
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+49 5971 …" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Adresse</label>
          <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Musterstraße 1, 48431 Rheine" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>E-Mail</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="info@restaurant.de" style={inputStyle} />
        </div>
      </div>
      <button type="button" onClick={save} disabled={saving}
        style={{ marginTop: 20, padding: '10px 28px', borderRadius: 20, border: 'none', background: 'var(--accent)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'var(--font-body)', opacity: saving ? 0.7 : 1 }}>
        {saving ? 'Speichere…' : 'Speichern'}
      </button>
    </div>
  )
}

// ─── News ───────────────────────────────────────────────────────────────────

function NewsTab({ slug }: { slug: string }) {
  const [news, setNews]         = useState<NewsItem[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [title, setTitle]       = useState('')
  const [body, setBody]         = useState('')
  const [published, setPublished] = useState(false)
  const [creating, setCreating]   = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch(`/api/${slug}/admin/news`, { cache: 'no-store' })
      const data = await res.json() as { news?: NewsItem[]; error?: string }
      if (!res.ok) { setError(data.error ?? 'Fehler'); return }
      setNews(data.news ?? [])
    } catch { setError('Netzwerkfehler') } finally { setLoading(false) }
  }, [slug])

  useEffect(() => { void load() }, [load])

  async function create() {
    if (!title.trim()) return
    setCreating(true)
    try {
      const res = await fetch(`/api/${slug}/admin/news`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), body: body.trim() || null, is_published: published }),
      })
      if (res.ok) { setTitle(''); setBody(''); setPublished(false); void load() }
      else { const d = await res.json() as { error?: string }; setError(d.error ?? 'Fehler') }
    } catch { setError('Netzwerkfehler') } finally { setCreating(false) }
  }

  async function togglePublish(item: NewsItem) {
    await fetch(`/api/${slug}/admin/news/${item.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_published: !item.is_published }),
    })
    void load()
  }

  async function deleteNews(id: string) {
    if (!confirm('News löschen?')) return
    await fetch(`/api/${slug}/admin/news/${id}`, { method: 'DELETE' })
    void load()
  }

  const inputStyle = {
    padding: '10px 14px', borderRadius: 10, border: '1.5px solid var(--border)',
    background: 'var(--surface)', color: 'var(--text)', fontSize: 14,
    fontFamily: 'var(--font-body)', outline: 'none', width: '100%', boxSizing: 'border-box' as const,
  }
  const labelStyle = { fontSize: 11, fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 6, display: 'block' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Create form */}
      <div className="betrieb-dash-card">
        <h2 style={{ margin: '0 0 16px', fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: '1rem' }}>Neue Meldung</h2>
        {error && <p className="betrieb-dash-error">{error}</p>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={labelStyle}>Titel</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="z.B. Heute geschlossen" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Text (optional)</label>
            <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Weitere Infos…" rows={3}
              style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer' }}>
            <input type="checkbox" checked={published} onChange={e => setPublished(e.target.checked)} />
            Sofort veröffentlichen
          </label>
        </div>
        <button type="button" onClick={create} disabled={creating || !title.trim()}
          style={{ marginTop: 16, padding: '10px 28px', borderRadius: 20, border: 'none', background: 'var(--accent)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'var(--font-body)', opacity: (creating || !title.trim()) ? 0.6 : 1 }}>
          {creating ? 'Erstelle…' : '+ Erstellen'}
        </button>
      </div>

      {/* List */}
      <div className="betrieb-dash-card">
        <h2 style={{ margin: '0 0 16px', fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: '1rem' }}>Meldungen</h2>
        {loading ? (
          <div className="betrieb-dash-empty"><div className="betrieb-dash-empty-icon">⏳</div>Lade…</div>
        ) : news.length === 0 ? (
          <div className="betrieb-dash-empty"><div className="betrieb-dash-empty-icon">📢</div>Noch keine Meldungen.</div>
        ) : news.map(n => (
          <div key={n.id} className="betrieb-dash-order-mini" style={{ opacity: n.is_published ? 1 : 0.6 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{n.title}</div>
                {n.body && <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{n.body}</div>}
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
                  {new Date(n.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                  {' · '}
                  <span style={{ color: n.is_published ? 'var(--accent-deep)' : 'var(--text-3)', fontWeight: 600 }}>
                    {n.is_published ? '✓ Veröffentlicht' : 'Entwurf'}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button type="button" onClick={() => void togglePublish(n)}
                  style={{ padding: '4px 12px', borderRadius: 14, border: '1.5px solid var(--border)', background: n.is_published ? 'var(--surface-2)' : 'var(--accent-tint)', color: n.is_published ? 'var(--text-2)' : 'var(--accent-deep)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                  {n.is_published ? 'Ausblenden' : 'Veröffentlichen'}
                </button>
                <button type="button" onClick={() => void deleteNews(n.id)}
                  style={{ padding: '4px 10px', borderRadius: 14, border: '1.5px solid rgba(220,38,38,0.25)', background: 'transparent', color: '#dc2626', fontSize: 12, cursor: 'pointer' }}
                  title="Löschen">✕</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
