'use client'

import { useState, useEffect, useCallback } from 'react'

type TaskStatus = 'open' | 'in_progress' | 'done'
type Task = { id: string; title: string; description: string | null; status: TaskStatus; assigned_to: string | null; due_at: string | null; created_at: string; updated_at: string }
type Sop  = { id: string; title: string; category: string; steps: string[]; is_active: boolean; created_at: string }
type Handover = { id: string; created_by: string; received_by: string | null; shift_date: string; shift_type: string; status: string; summary: string; open_tasks: string | null; incidents: string | null; inventory_notes: string | null; cash_register_amount: number | null; customer_feedback: string | null; created_at: string; accepted_at: string | null }

const TASK_STATUS_LABEL: Record<TaskStatus, string> = { open: 'Offen', in_progress: 'In Arbeit', done: 'Erledigt' }
const TASK_STATUS_COLOR: Record<TaskStatus, string> = { open: '#f59e0b', in_progress: '#3b82f6', done: '#22c55e' }
const SHIFT_LABELS: Record<string, string> = { morning: '☀️ Früh', afternoon: '🌤️ Mittag', evening: '🌙 Abend', full: '📅 Ganztag' }
const HO_STATUS_LABEL: Record<string, string> = { open: 'Offen', accepted: 'Angenommen', archived: 'Archiviert' }
const HO_STATUS_COLOR: Record<string, string> = { open: '#f59e0b', accepted: '#22c55e', archived: '#6b7280' }

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  const today = new Date()
  if (d.toDateString() === today.toDateString()) return 'Heute'
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
}

type Props = { slug: string }

export function TeamView({ slug }: Props) {
  const [tab, setTab]           = useState<'tasks' | 'sops' | 'handovers'>('tasks')
  const [tasks, setTasks]       = useState<Task[]>([])
  const [sops, setSops]         = useState<Sop[]>([])
  const [handovers, setHandovers] = useState<Handover[]>([])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  // New task form
  const [newTitle, setNewTitle]       = useState('')
  const [newDesc, setNewDesc]         = useState('')
  const [newAssigned, setNewAssigned] = useState('')
  const [newDue, setNewDue]           = useState('')
  const [saving, setSaving]           = useState(false)

  // New SOP form
  const [sopTitle, setSopTitle]     = useState('')
  const [sopCat, setSopCat]         = useState('')
  const [sopSteps, setSopSteps]     = useState<string[]>([''])
  const [sopSaving, setSopSaving]   = useState(false)
  const [expandedSop, setExpSop]    = useState<string | null>(null)

  // Handover form
  const [hoCreatedBy, setHoCreatedBy] = useState('')
  const [hoShiftType, setHoShiftType] = useState('morning')
  const [hoSummary, setHoSummary] = useState('')
  const [hoOpenTasks, setHoOpenTasks] = useState('')
  const [hoIncidents, setHoIncidents] = useState('')
  const [hoInventory, setHoInventory] = useState('')
  const [hoCash, setHoCash] = useState('')
  const [hoFeedback, setHoFeedback] = useState('')
  const [hoSaving, setHoSaving] = useState(false)
  const [expandedHo, setExpandedHo] = useState<string | null>(null)

  const fetchTasks = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [tr, sr, hr] = await Promise.all([
        fetch(`/api/${slug}/admin/meso/tasks`, { cache: 'no-store' }),
        fetch(`/api/${slug}/admin/meso/sops`,  { cache: 'no-store' }),
        fetch(`/api/${slug}/admin/meso/handovers`, { cache: 'no-store' }),
      ])
      const [td, sd, hd] = await Promise.all([tr.json(), sr.json(), hr.json()]) as [
        { tasks?: Task[]; error?: string },
        { sops?: Sop[]; error?: string },
        { handovers?: Handover[]; error?: string }
      ]
      if (!tr.ok) { setError(td.error ?? 'Fehler'); return }
      setTasks(td.tasks ?? [])
      setSops(sd.sops ?? [])
      setHandovers(hd.handovers ?? [])
    } catch { setError('Netzwerkfehler') } finally { setLoading(false) }
  }, [slug])

  useEffect(() => { void fetchTasks() }, [fetchTasks])

  async function patchTaskStatus(id: string, status: TaskStatus) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t))
    try {
      await fetch(`/api/${slug}/admin/meso/tasks/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
    } catch { void fetchTasks() }
  }

  async function deleteTask(id: string) {
    setTasks(prev => prev.filter(t => t.id !== id))
    try {
      await fetch(`/api/${slug}/admin/meso/tasks/${id}`, { method: 'DELETE' })
    } catch { void fetchTasks() }
  }

  async function createTask() {
    if (!newTitle.trim()) return
    setSaving(true)
    try {
      const res  = await fetch(`/api/${slug}/admin/meso/tasks`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim(), description: newDesc || undefined, assigned_to: newAssigned || undefined, due_at: newDue || undefined }),
      })
      const data = await res.json() as { task?: Task; error?: string }
      if (data.task) {
        setTasks(prev => [data.task!, ...prev])
        setNewTitle(''); setNewDesc(''); setNewAssigned(''); setNewDue('')
      }
    } catch { void fetchTasks() } finally { setSaving(false) }
  }

  async function createSop() {
    if (!sopTitle.trim()) return
    setSopSaving(true)
    const steps = sopSteps.filter(s => s.trim())
    try {
      const res  = await fetch(`/api/${slug}/admin/meso/sops`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: sopTitle.trim(), category: sopCat || 'Allgemein', steps }),
      })
      const data = await res.json() as { sop?: Sop; error?: string }
      if (data.sop) {
        setSops(prev => [data.sop!, ...prev])
        setSopTitle(''); setSopCat(''); setSopSteps([''])
      }
    } catch { void fetchTasks() } finally { setSopSaving(false) }
  }

  async function deleteSop(id: string) {
    setSops(prev => prev.filter(s => s.id !== id))
    try { await fetch(`/api/${slug}/admin/meso/sops/${id}`, { method: 'DELETE' }) }
    catch { void fetchTasks() }
  }

  async function createHandover() {
    if (!hoCreatedBy.trim() || !hoSummary.trim()) return
    setHoSaving(true)
    try {
      const res = await fetch(`/api/${slug}/admin/meso/handovers`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          created_by: hoCreatedBy.trim(), shift_type: hoShiftType, summary: hoSummary.trim(),
          open_tasks: hoOpenTasks || undefined, incidents: hoIncidents || undefined,
          inventory_notes: hoInventory || undefined,
          cash_register_amount: hoCash ? parseFloat(hoCash.replace(',', '.')) : undefined,
          customer_feedback: hoFeedback || undefined,
        }),
      })
      const data = await res.json() as { handover?: Handover }
      if (data.handover) {
        setHandovers(prev => [data.handover!, ...prev])
        setHoCreatedBy(''); setHoSummary(''); setHoOpenTasks(''); setHoIncidents('')
        setHoInventory(''); setHoCash(''); setHoFeedback('')
      }
    } catch { void fetchTasks() } finally { setHoSaving(false) }
  }

  async function acceptHandover(id: string, receivedBy: string) {
    try {
      await fetch(`/api/${slug}/admin/meso/handovers`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, received_by: receivedBy, status: 'accepted' }),
      })
      void fetchTasks()
    } catch { /* silent */ }
  }

  const openTasks      = tasks.filter(t => t.status === 'open').length
  const inProgressTask = tasks.filter(t => t.status === 'in_progress').length
  const sopCategories  = [...new Set(sops.map(s => s.category))]
  const openHandovers  = handovers.filter(h => h.status === 'open').length

  return (
    <div className="betrieb-dash">
      {/* Header KPI */}
      <div className="betrieb-filter-bar" style={{ marginBottom: 16 }}>
        <span className="betrieb-dash-pill"><span className="betrieb-dash-pill-muted">Aufgaben offen</span>{openTasks}</span>
        <span className="betrieb-dash-pill"><span className="betrieb-dash-pill-muted">In Arbeit</span>{inProgressTask}</span>
        <span className="betrieb-dash-pill"><span className="betrieb-dash-pill-muted">SOPs</span>{sops.length}</span>
        {openHandovers > 0 && <span className="betrieb-dash-pill" style={{ color: '#f59e0b', borderColor: 'rgba(245,158,11,0.3)' }}><span className="betrieb-dash-pill-muted">Übergaben offen</span>{openHandovers}</span>}
        <button type="button" className={`betrieb-dash-pill${loading ? ' betrieb-dash-pill--refresh-loading' : ''}`}
          onClick={() => void fetchTasks()} disabled={loading}>
          <svg className="betrieb-dash-refresh-icon" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Meso light badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <span style={{
          padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 800,
          background: 'linear-gradient(135deg,rgba(34,197,94,0.15),rgba(59,130,246,0.12))',
          border: '1px solid rgba(34,197,94,0.3)', color: 'var(--accent-deep)', letterSpacing: '0.04em',
        }}>✦ MESO LIGHT</span>
        <span style={{ fontSize: 12, color: 'var(--text-2)' }}>Betriebswissen & Aufgaben-Management</span>
      </div>

      {/* Tabs */}
      <div className="betrieb-filter-bar" style={{ marginBottom: 20 }}>
        <button type="button" className={`betrieb-filter-btn${tab === 'tasks' ? ' active' : ''}`} onClick={() => setTab('tasks')}>
          📋 Aufgaben ({tasks.length})
        </button>
        <button type="button" className={`betrieb-filter-btn${tab === 'sops' ? ' active' : ''}`} onClick={() => setTab('sops')}>
          📖 SOPs ({sops.length})
        </button>
        <button type="button" className={`betrieb-filter-btn${tab === 'handovers' ? ' active' : ''}`} onClick={() => setTab('handovers')}>
          🔄 Schichtübergabe ({handovers.length})
        </button>
      </div>

      {error && <p className="betrieb-dash-error" role="alert">{error}</p>}

      {/* ── TASKS ──────────────────────────────────────────── */}
      {tab === 'tasks' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, alignItems: 'start' }}>
          {/* Task list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {tasks.length === 0 ? (
              <div className="betrieb-dash-card">
                <div className="betrieb-dash-empty"><div className="betrieb-dash-empty-icon">✓</div>Keine Aufgaben — leg gleich los!</div>
              </div>
            ) : (
              tasks.map(t => (
                <div key={t.id} className="betrieb-dash-order-mini">
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{t.title}</div>
                      {t.description && <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 3 }}>{t.description}</div>}
                      <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                        {t.assigned_to && (
                          <span style={{ fontSize: 11, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, padding: '1px 7px' }}>
                            👤 {t.assigned_to}
                          </span>
                        )}
                        {t.due_at && (
                          <span style={{ fontSize: 11, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, padding: '1px 7px', color: new Date(t.due_at) < new Date() ? '#dc2626' : 'var(--text-2)' }}>
                            📅 {fmtDate(t.due_at)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: TASK_STATUS_COLOR[t.status] + '22', color: TASK_STATUS_COLOR[t.status] }}>
                        {TASK_STATUS_LABEL[t.status]}
                      </span>
                    </div>
                  </div>

                  {/* Status change buttons */}
                  <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                    {(['open', 'in_progress', 'done'] as const).map(st => (
                      <button key={st} type="button"
                        className={`betrieb-dash-status-btn${t.status === st ? ' betrieb-dash-status-btn-active' : ''}`}
                        style={{ minWidth: 80, minHeight: 36, padding: '6px 10px', fontSize: 12 }}
                        onClick={() => void patchTaskStatus(t.id, st)}>
                        {TASK_STATUS_LABEL[st]}
                      </button>
                    ))}
                    <button type="button"
                      onClick={() => void deleteTask(t.id)}
                      style={{ padding: '6px 10px', borderRadius: 10, border: '1.5px solid rgba(220,38,38,0.25)', background: 'transparent', color: '#dc2626', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)', marginLeft: 'auto' }}>
                      ✕
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* New task form */}
          <div className="betrieb-dash-card" style={{ position: 'sticky', top: 20 }}>
            <h2 style={{ fontFamily: 'var(--font-head)', fontSize: '1rem', fontWeight: 800, margin: '0 0 14px' }}>+ Neue Aufgabe</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Titel *', value: newTitle, setter: setNewTitle, placeholder: 'Aufgabe beschreiben…' },
                { label: 'Beschreibung', value: newDesc, setter: setNewDesc, placeholder: 'Optional…' },
                { label: 'Zugewiesen an', value: newAssigned, setter: setNewAssigned, placeholder: 'Name…' },
              ].map(({ label, value, setter, placeholder }) => (
                <div key={label}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>{label}</label>
                  <input value={value} onChange={e => setter(e.target.value)} placeholder={placeholder}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              ))}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>Fällig am</label>
                <input type="date" value={newDue} onChange={e => setNewDue(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <button type="button" onClick={() => void createTask()} disabled={saving || !newTitle.trim()}
                className="admin-login-btn" style={{ padding: '12px', marginTop: 4 }}>
                {saving ? 'Speichern…' : '+ Aufgabe erstellen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SOPs ──────────────────────────────────────────── */}
      {tab === 'sops' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, alignItems: 'start' }}>
          <div>
            {sops.length === 0 ? (
              <div className="betrieb-dash-card">
                <div className="betrieb-dash-empty"><div className="betrieb-dash-empty-icon">📖</div>Noch keine SOPs. Dokumentiere deine Prozesse!</div>
              </div>
            ) : (
              sopCategories.map(cat => (
                <div key={cat} className="betrieb-dash-card" style={{ marginBottom: 16 }}>
                  <h2 style={{ fontFamily: 'var(--font-head)', fontSize: '1rem', fontWeight: 800, margin: '0 0 12px', color: 'var(--text)' }}>{cat}</h2>
                  {sops.filter(s => s.category === cat).map(sop => (
                    <div key={sop.id} className="betrieb-dash-order-mini" style={{ opacity: sop.is_active ? 1 : 0.5 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                        <button type="button" onClick={() => setExpSop(expandedSop === sop.id ? null : sop.id)}
                          style={{ fontWeight: 700, fontSize: 14, background: 'transparent', border: 'none', textAlign: 'left', cursor: 'pointer', flex: 1, color: 'var(--text)', fontFamily: 'var(--font-body)' }}>
                          {sop.title}
                          {sop.steps.length > 0 && <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 8 }}>{sop.steps.length} Schritte</span>}
                        </button>
                        <button type="button" onClick={() => void deleteSop(sop.id)}
                          style={{ padding: '4px 8px', borderRadius: 8, border: '1px solid rgba(220,38,38,0.2)', background: 'transparent', color: '#dc2626', fontSize: 11, cursor: 'pointer' }}>
                          ✕
                        </button>
                      </div>
                      {expandedSop === sop.id && sop.steps.length > 0 && (
                        <ol style={{ margin: '10px 0 0', padding: '0 0 0 20px', fontSize: 13, lineHeight: 1.8, color: 'var(--text-2)' }}>
                          {sop.steps.map((step, i) => <li key={i}>{step}</li>)}
                        </ol>
                      )}
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>

          <div className="betrieb-dash-card" style={{ position: 'sticky', top: 20 }}>
            <h2 style={{ fontFamily: 'var(--font-head)', fontSize: '1rem', fontWeight: 800, margin: '0 0 14px' }}>+ Neuer Prozess</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>Titel *</label>
                <input value={sopTitle} onChange={e => setSopTitle(e.target.value)} placeholder="z.B. Tagesöffnung…"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>Kategorie</label>
                <input value={sopCat} onChange={e => setSopCat(e.target.value)} placeholder="z.B. Küche, Service…"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>Schritte</label>
                {sopSteps.map((step, i) => (
                  <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', marginTop: 10, minWidth: 16 }}>{i + 1}.</span>
                    <input value={step} onChange={e => { const n = [...sopSteps]; n[i] = e.target.value; setSopSteps(n) }}
                      placeholder={`Schritt ${i + 1}…`}
                      style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)', fontSize: 12, fontFamily: 'var(--font-body)', outline: 'none' }} />
                    {sopSteps.length > 1 && (
                      <button type="button" onClick={() => setSopSteps(sopSteps.filter((_, j) => j !== i))}
                        style={{ padding: '6px 8px', borderRadius: 8, border: 'none', background: 'transparent', color: 'var(--text-3)', cursor: 'pointer', fontSize: 14 }}>✕</button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => setSopSteps([...sopSteps, ''])}
                  style={{ fontSize: 12, color: 'var(--accent-deep)', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', padding: 0 }}>
                  + Schritt hinzufügen
                </button>
              </div>
              <button type="button" onClick={() => void createSop()} disabled={sopSaving || !sopTitle.trim()}
                className="admin-login-btn" style={{ padding: '12px', marginTop: 4 }}>
                {sopSaving ? 'Speichern…' : '+ Prozess erstellen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SCHICHTÜBERGABE ────────────────────────────────── */}
      {tab === 'handovers' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16, alignItems: 'start' }}>
          {/* Handover list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {handovers.length === 0 ? (
              <div className="betrieb-dash-card">
                <div className="betrieb-dash-empty"><div className="betrieb-dash-empty-icon">🔄</div>Noch keine Schichtübergaben. Erstelle die erste!</div>
              </div>
            ) : handovers.map(ho => (
              <div key={ho.id} className="betrieb-dash-card" style={{ padding: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{SHIFT_LABELS[ho.shift_type] || ho.shift_type}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{new Date(ho.shift_date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })}</span>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: (HO_STATUS_COLOR[ho.status] || '#6b7280') + '22', color: HO_STATUS_COLOR[ho.status] || '#6b7280' }}>
                    {HO_STATUS_LABEL[ho.status] || ho.status}
                  </span>
                </div>

                <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 6 }}>
                  <strong>Von:</strong> {ho.created_by}{ho.received_by ? <> · <strong>An:</strong> {ho.received_by}</> : ''}
                </div>

                <p style={{ fontSize: 13, color: 'var(--text)', margin: '0 0 8px', lineHeight: 1.5 }}>{ho.summary}</p>

                <button type="button" onClick={() => setExpandedHo(expandedHo === ho.id ? null : ho.id)}
                  style={{ fontSize: 11, color: 'var(--accent-deep)', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-body)' }}>
                  {expandedHo === ho.id ? '▲ Weniger' : '▼ Details'}
                </button>

                {expandedHo === ho.id && (
                  <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-2)', display: 'flex', flexDirection: 'column', gap: 6, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                    {ho.open_tasks && <div><strong>Offene Aufgaben:</strong> {ho.open_tasks}</div>}
                    {ho.incidents && <div><strong>Vorkommnisse:</strong> {ho.incidents}</div>}
                    {ho.inventory_notes && <div><strong>Bestand:</strong> {ho.inventory_notes}</div>}
                    {ho.cash_register_amount != null && <div><strong>Kasse:</strong> {Number(ho.cash_register_amount).toFixed(2).replace('.', ',')} €</div>}
                    {ho.customer_feedback && <div><strong>Kundenfeedback:</strong> {ho.customer_feedback}</div>}
                  </div>
                )}

                {ho.status === 'open' && (
                  <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                    <button type="button" onClick={() => {
                      const name = prompt('Dein Name (Schicht-Übernehmer):')
                      if (name?.trim()) void acceptHandover(ho.id, name.trim())
                    }}
                      style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      ✓ Übernehmen
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* New handover form */}
          <div className="betrieb-dash-card" style={{ position: 'sticky', top: 20 }}>
            <h2 style={{ fontFamily: 'var(--font-head)', fontSize: '1rem', fontWeight: 800, margin: '0 0 14px' }}>+ Schichtübergabe</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>Dein Name *</label>
                <input value={hoCreatedBy} onChange={e => setHoCreatedBy(e.target.value)} placeholder="Wer übergibt?"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>Schicht</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {Object.entries(SHIFT_LABELS).map(([key, label]) => (
                    <button key={key} type="button" onClick={() => setHoShiftType(key)}
                      style={{ padding: '6px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: hoShiftType === key ? '1.5px solid var(--accent)' : '1px solid var(--border)', background: hoShiftType === key ? 'var(--accent-tint)' : 'transparent', color: hoShiftType === key ? 'var(--accent-deep)' : 'var(--text-2)' }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>Zusammenfassung *</label>
                <textarea value={hoSummary} onChange={e => setHoSummary(e.target.value)} placeholder="Wie war die Schicht? Was ist wichtig?"
                  rows={3} style={{ width: '100%', padding: '8px 12px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box', resize: 'vertical' }} />
              </div>
              {[
                { label: 'Offene Aufgaben', value: hoOpenTasks, setter: setHoOpenTasks, placeholder: 'Was muss noch erledigt werden?' },
                { label: 'Vorkommnisse', value: hoIncidents, setter: setHoIncidents, placeholder: 'Besondere Ereignisse / Probleme?' },
                { label: 'Bestand / Inventar', value: hoInventory, setter: setHoInventory, placeholder: 'Nachbestellen? Engpässe?' },
                { label: 'Kundenfeedback', value: hoFeedback, setter: setHoFeedback, placeholder: 'Lob, Beschwerden?' },
              ].map(({ label, value, setter, placeholder }) => (
                <div key={label}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>{label}</label>
                  <input value={value} onChange={e => setter(e.target.value)} placeholder={placeholder}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              ))}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>Kassenstand (€)</label>
                <input value={hoCash} onChange={e => setHoCash(e.target.value)} placeholder="z.B. 342,50" type="text"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <button type="button" onClick={() => void createHandover()} disabled={hoSaving || !hoCreatedBy.trim() || !hoSummary.trim()}
                className="admin-login-btn" style={{ padding: '12px', marginTop: 4 }}>
                {hoSaving ? 'Speichern…' : '🔄 Schicht übergeben'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
