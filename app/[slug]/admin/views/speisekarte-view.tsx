'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

type Category = { id: string; name: string; sort_order: number; is_active: boolean }
type Item = { id: string; category_id: string | null; name: string; description: string | null; price: number; is_active: boolean; sort_order: number; image_url: string | null }
type Upsell = { id: string; label: string; price: number; is_active: boolean; sort_order: number; image_url: string | null }
type Ingredient = { id: string; name: string; allergen_group: string | null; is_active: boolean }
type ItemIngredient = { id: string; item_id: string; ingredient_id: string }

type EditingState = { type: 'category' | 'item' | 'upsell'; id: string | null; data: Record<string, any> } | null
type DeletingState = { type: 'category' | 'item' | 'upsell' | 'ingredient'; id: string } | null

// Allergen-Gruppen mit Emoji
const ALLERGEN_GROUPS = [
  { value: 'gluten', label: '🌾 Gluten' },
  { value: 'laktose', label: '🥛 Laktose' },
  { value: 'nüsse', label: '🥜 Nüsse' },
  { value: 'eier', label: '🥚 Eier' },
  { value: 'fisch', label: '🐟 Fisch' },
  { value: 'schalentiere', label: '🦐 Schalentiere' },
  { value: 'soja', label: '🫘 Soja' },
  { value: 'sellerie', label: '🥬 Sellerie' },
  { value: 'senf', label: '🌿 Senf' },
  { value: 'sesam', label: '✨ Sesam' },
  { value: 'sulfite', label: '🍷 Sulfite' },
]

function allergenEmoji(group: string | null) {
  return ALLERGEN_GROUPS.find(a => a.value === group)?.label.split(' ')[0] ?? '⚠️'
}

function fmtPrice(n: number) { return n.toFixed(2).replace('.', ',') + ' €' }

type Props = { slug: string }

export function SpeisekarteView({ slug }: Props) {
  const [categories, setCategories] = useState<Category[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [upsells, setUpsells] = useState<Upsell[]>([])
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [itemIngredients, setItemIngredients] = useState<ItemIngredient[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [editing, setEditing] = useState<EditingState>(null)
  const [deleting, setDeleting] = useState<DeletingState>(null)
  const [upsellsOpen, setUpsellsOpen] = useState(false)

  // Zutaten-Panel
  const [zutatenOpen, setZutatenOpen] = useState(false)
  const [newIngName, setNewIngName] = useState('')
  const [newIngAllergen, setNewIngAllergen] = useState('')
  const [editingIng, setEditingIng] = useState<Ingredient | null>(null)

  // Foto-Upload State
  const [uploadingFor, setUploadingFor] = useState<string | null>(null) // item-id oder 'upsell-<id>'
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadTarget, setUploadTarget] = useState<{ type: 'item' | 'upsell'; id: string } | null>(null)

  // Zutaten-Zuordnung Modal
  const [assigningItem, setAssigningItem] = useState<Item | null>(null)

  const fetchMenu = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch(`/api/${slug}/admin/menu`, { cache: 'no-store' })
      const data = await res.json() as { categories?: Category[]; items?: Item[]; upsells?: Upsell[]; error?: string }
      if (!res.ok) { setError(data.error ?? 'Fehler'); return }
      setCategories(data.categories ?? [])
      setItems(data.items ?? [])
      setUpsells(data.upsells ?? [])
    } catch { setError('Netzwerkfehler') } finally { setLoading(false) }
  }, [slug])

  const fetchIngredients = useCallback(async () => {
    try {
      const res = await fetch(`/api/${slug}/admin/ingredients`, { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json() as { ingredients: Ingredient[]; itemIngredients: ItemIngredient[] }
        setIngredients(data.ingredients ?? [])
        setItemIngredients(data.itemIngredients ?? [])
      }
    } catch { /* silent */ }
  }, [slug])

  useEffect(() => {
    void fetchMenu()
    void fetchIngredients()
  }, [fetchMenu, fetchIngredients])

  function showSuccess(msg: string) {
    setSuccess(msg)
    setTimeout(() => setSuccess(null), 2500)
  }

  // ─── Toggle aktiv/inaktiv ─────────────────────────────────────────────────
  async function toggleItem(id: string, is_active: boolean, type: 'item' | 'category') {
    setSaving(id)
    try {
      await fetch(`/api/${slug}/admin/menu`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_active, type }),
      })
      if (type === 'item') setItems(prev => prev.map(i => i.id === id ? { ...i, is_active } : i))
      else setCategories(prev => prev.map(c => c.id === id ? { ...c, is_active } : c))
      showSuccess('Gespeichert')
    } catch { void fetchMenu() } finally { setSaving(null) }
  }

  // ─── Speichern (Item/Kategorie/Upsell) ───────────────────────────────────
  async function saveItem() {
    if (!editing) return
    setSaving(editing.id || 'new')
    try {
      const priceRaw = editing.data.price
      const priceNum = typeof priceRaw === 'string' ? parseFloat(priceRaw.replace(',', '.')) : priceRaw
      const dataToSend = editing.type === 'item' || editing.type === 'upsell'
        ? { ...editing.data, price: isNaN(priceNum) ? 0 : priceNum }
        : editing.data

      const method = editing.id ? 'PUT' : 'POST'
      const res = await fetch(`/api/${slug}/admin/menu`, {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: editing.type, ...(editing.id && { id: editing.id }), data: dataToSend }),
      })
      if (!res.ok) throw new Error('Speichern fehlgeschlagen')
      await fetchMenu()
      setEditing(null)
      showSuccess(editing.id ? 'Aktualisiert' : 'Erstellt')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler beim Speichern')
    } finally { setSaving(null) }
  }

  // ─── Löschen ──────────────────────────────────────────────────────────────
  async function deleteConfirmed() {
    if (!deleting) return
    setSaving(deleting.id)
    try {
      if (deleting.type === 'ingredient') {
        await fetch(`/api/${slug}/admin/ingredients`, {
          method: 'DELETE', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: deleting.id }),
        })
        await fetchIngredients()
      } else {
        const res = await fetch(`/api/${slug}/admin/menu`, {
          method: 'DELETE', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: deleting.type, id: deleting.id }),
        })
        if (!res.ok) throw new Error('Löschen fehlgeschlagen')
        await fetchMenu()
      }
      setDeleting(null)
      showSuccess('Gelöscht')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler beim Löschen')
    } finally { setSaving(null) }
  }

  // ─── Foto-Upload ──────────────────────────────────────────────────────────
  function triggerUpload(type: 'item' | 'upsell', id: string) {
    setUploadTarget({ type, id })
    fileInputRef.current?.click()
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !uploadTarget) return
    e.target.value = ''

    const key = uploadTarget.type === 'upsell' ? `upsell-${uploadTarget.id}` : uploadTarget.id
    setUploadingFor(key)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const uploadRes = await fetch(`/api/${slug}/admin/upload`, { method: 'POST', body: formData })
      const uploadData = await uploadRes.json() as { url?: string; error?: string }
      if (!uploadRes.ok || !uploadData.url) throw new Error(uploadData.error ?? 'Upload fehlgeschlagen')

      // URL im Item/Upsell speichern
      const menuRes = await fetch(`/api/${slug}/admin/menu`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: uploadTarget.type,
          id: uploadTarget.id,
          data: { image_url: uploadData.url },
        }),
      })
      if (!menuRes.ok) throw new Error('Bild-URL speichern fehlgeschlagen')

      await fetchMenu()
      showSuccess('Foto hochgeladen ✓')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload-Fehler')
    } finally {
      setUploadingFor(null)
      setUploadTarget(null)
    }
  }

  async function removePhoto(type: 'item' | 'upsell', id: string, imageUrl: string) {
    setSaving(id)
    try {
      // Aus Storage löschen
      await fetch(`/api/${slug}/admin/upload`, {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: imageUrl }),
      })
      // URL aus DB entfernen
      await fetch(`/api/${slug}/admin/menu`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, id, data: { image_url: null } }),
      })
      await fetchMenu()
      showSuccess('Foto entfernt')
    } catch { setError('Fehler beim Löschen') } finally { setSaving(null) }
  }

  // ─── Zutaten CRUD ─────────────────────────────────────────────────────────
  async function createIngredient() {
    if (!newIngName.trim()) return
    setSaving('ing-new')
    try {
      await fetch(`/api/${slug}/admin/ingredients`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', name: newIngName.trim(), allergen_group: newIngAllergen || null }),
      })
      setNewIngName(''); setNewIngAllergen('')
      await fetchIngredients()
      showSuccess('Zutat erstellt')
    } catch { setError('Fehler') } finally { setSaving(null) }
  }

  async function saveIngredient() {
    if (!editingIng) return
    setSaving('ing-edit')
    try {
      await fetch(`/api/${slug}/admin/ingredients`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingIng.id, name: editingIng.name, allergen_group: editingIng.allergen_group }),
      })
      setEditingIng(null)
      await fetchIngredients()
      showSuccess('Zutat aktualisiert')
    } catch { setError('Fehler') } finally { setSaving(null) }
  }

  // ─── Zutaten-Zuordnung ────────────────────────────────────────────────────
  function getItemIngredients(itemId: string): string[] {
    return itemIngredients.filter(ii => ii.item_id === itemId).map(ii => ii.ingredient_id)
  }

  async function toggleIngredientAssignment(itemId: string, ingredientId: string, assigned: boolean) {
    try {
      await fetch(`/api/${slug}/admin/ingredients`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: assigned ? 'unassign' : 'assign', item_id: itemId, ingredient_id: ingredientId }),
      })
      await fetchIngredients()
    } catch { setError('Fehler bei Zuordnung') }
  }

  // ─── Styles ───────────────────────────────────────────────────────────────
  const btnPrimary: React.CSSProperties = { padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: 'none', background: 'var(--accent)', color: '#fff', fontFamily: 'var(--font-body)' }
  const btnSecondary: React.CSSProperties = { padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', fontFamily: 'var(--font-body)' }
  const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, fontFamily: 'var(--font-body)', boxSizing: 'border-box', background: 'var(--bg-2)', color: 'var(--text)' }

  const activeItems = items.filter(i => i.is_active).length
  const inactiveItems = items.filter(i => !i.is_active).length

  return (
    <div className="betrieb-dash">
      {/* Hidden file input für Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={(e) => void handleFileChange(e)}
      />

      {/* KPI-Bar */}
      <div className="betrieb-filter-bar" style={{ marginBottom: 20 }}>
        <span className="betrieb-dash-pill"><span className="betrieb-dash-pill-muted">Kategorien</span>{categories.length}</span>
        <span className="betrieb-dash-pill"><span className="betrieb-dash-pill-muted">Aktive Items</span>{activeItems}</span>
        {inactiveItems > 0 && (
          <span className="betrieb-dash-pill" style={{ color: '#dc2626' }}><span className="betrieb-dash-pill-muted">Inaktiv</span>{inactiveItems}</span>
        )}
        <span className="betrieb-dash-pill"><span className="betrieb-dash-pill-muted">Zutaten</span>{ingredients.length}</span>
        <button type="button" className={`betrieb-dash-pill${loading ? ' betrieb-dash-pill--refresh-loading' : ''}`}
          onClick={() => { void fetchMenu(); void fetchIngredients() }} disabled={loading}>
          <svg className="betrieb-dash-refresh-icon" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Aktions-Buttons */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <button type="button" onClick={() => setEditing({ type: 'category', id: null, data: { name: '' } })} style={btnPrimary}>
          + Kategorie
        </button>
        <button type="button" onClick={() => setEditing({ type: 'item', id: null, data: { category_id: categories[0]?.id || null, name: '', description: '', price: '0' } })} style={btnPrimary}>
          + Produkt
        </button>
        <button type="button" onClick={() => setZutatenOpen(!zutatenOpen)}
          style={{ ...btnSecondary, background: zutatenOpen ? 'var(--accent-tint)' : 'transparent', borderColor: zutatenOpen ? 'var(--accent)' : 'var(--border)', color: zutatenOpen ? 'var(--accent-deep)' : 'var(--text)' }}>
          🥗 Zutaten-Liste {zutatenOpen ? '▲' : '▼'}
        </button>
      </div>

      {error && <p className="betrieb-dash-error" role="alert">{error}</p>}
      {success && <p style={{ color: 'var(--accent-deep)', fontSize: 13, fontWeight: 600, padding: '8px 14px', background: 'var(--accent-tint)', border: '1px solid var(--accent)', borderRadius: 8, marginBottom: 16 }}>{success}</p>}

      {/* ═══ ZUTATEN-MASTER-LISTE ═══ */}
      {zutatenOpen && (
        <div className="betrieb-dash-card" style={{ marginBottom: 20, border: '2px solid var(--accent)' }}>
          <h2 style={{ margin: '0 0 14px', fontFamily: 'var(--font-head)', fontSize: '0.95rem', fontWeight: 800 }}>🥗 Zutaten-Bibliothek</h2>
          <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '0 0 14px' }}>Erstelle hier alle Zutaten & Allergene. Du kannst sie dann jedem Produkt zuordnen.</p>

          {/* Neue Zutat */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <input type="text" value={newIngName} onChange={e => setNewIngName(e.target.value)} placeholder="Zutat (z.B. Weizen, Rindfleisch…)"
              onKeyDown={e => e.key === 'Enter' && void createIngredient()}
              style={{ ...inputStyle, flex: '1 1 180px' }} />
            <select value={newIngAllergen} onChange={e => setNewIngAllergen(e.target.value)}
              style={{ ...inputStyle, flex: '0 1 160px', width: 'auto' }}>
              <option value="">Kein Allergen</option>
              {ALLERGEN_GROUPS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
            <button type="button" onClick={() => void createIngredient()} disabled={!newIngName.trim() || saving === 'ing-new'}
              style={{ ...btnPrimary, opacity: !newIngName.trim() ? 0.5 : 1, padding: '8px 14px' }}>
              + Hinzufügen
            </button>
          </div>

          {/* Zutaten-Liste */}
          {ingredients.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-3)', textAlign: 'center', padding: '12px 0' }}>Noch keine Zutaten. Füge deine erste Zutat hinzu.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {ingredients.map(ing => (
                <div key={ing.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--surface-2)', borderRadius: 8 }}>
                  {editingIng?.id === ing.id ? (
                    <>
                      <input type="text" value={editingIng.name} onChange={e => setEditingIng({ ...editingIng, name: e.target.value })}
                        style={{ ...inputStyle, flex: 1, padding: '4px 8px', fontSize: 12 }} />
                      <select value={editingIng.allergen_group ?? ''} onChange={e => setEditingIng({ ...editingIng, allergen_group: e.target.value || null })}
                        style={{ ...inputStyle, width: 'auto', padding: '4px 8px', fontSize: 12 }}>
                        <option value="">Kein Allergen</option>
                        {ALLERGEN_GROUPS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                      </select>
                      <button type="button" onClick={() => void saveIngredient()} style={{ ...btnPrimary, padding: '4px 10px', fontSize: 11 }}>✓</button>
                      <button type="button" onClick={() => setEditingIng(null)} style={{ ...btnSecondary, padding: '4px 8px', fontSize: 11 }}>✕</button>
                    </>
                  ) : (
                    <>
                      {ing.allergen_group && (
                        <span style={{ fontSize: 16 }} title={ing.allergen_group}>{allergenEmoji(ing.allergen_group)}</span>
                      )}
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{ing.name}</span>
                      {ing.allergen_group && (
                        <span style={{ fontSize: 10, background: '#fef3c7', color: '#92400e', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
                          {ALLERGEN_GROUPS.find(a => a.value === ing.allergen_group)?.label}
                        </span>
                      )}
                      <button type="button" onClick={() => setEditingIng(ing)} style={{ ...btnSecondary, padding: '3px 8px', fontSize: 11 }}>✎</button>
                      <button type="button" onClick={() => setDeleting({ type: 'ingredient', id: ing.id })}
                        style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid #dc2626', background: 'rgba(220,38,38,0.08)', cursor: 'pointer', color: '#dc2626', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        🗑
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {loading && items.length === 0 ? (
        <div className="betrieb-dash-card"><div className="betrieb-dash-empty"><div className="betrieb-dash-empty-icon">⏳</div>Lade Speisekarte…</div></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* ═══ EXTRAS / UPSELLS ═══ */}
          <div className="betrieb-dash-card" style={{ cursor: 'pointer' }} onClick={() => setUpsellsOpen(!upsellsOpen)}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: upsellsOpen ? 14 : 0 }}>
              <h2 style={{ margin: 0, fontFamily: 'var(--font-head)', fontSize: '1rem', fontWeight: 800 }}>Extras</h2>
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ transform: upsellsOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
            {upsellsOpen && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }} onClick={e => e.stopPropagation()}>
                {upsells.length === 0 ? (
                  <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '8px 0 0 0' }}>Keine Extras vorhanden.</p>
                ) : (
                  upsells.map(up => (
                    <div key={up.id} className="betrieb-dash-order-mini" style={{ opacity: up.is_active ? 1 : 0.5 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {/* Foto-Vorschau */}
                        {up.image_url ? (
                          <div style={{ position: 'relative', flexShrink: 0 }}>
                            <img src={up.image_url} alt={up.label} style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--border)' }} />
                            <button type="button" onClick={() => void removePhoto('upsell', up.id, up.image_url!)}
                              style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button type="button" onClick={() => triggerUpload('upsell', up.id)} disabled={uploadingFor === `upsell-${up.id}`}
                            style={{ width: 44, height: 44, borderRadius: 8, border: '2px dashed var(--border)', background: 'var(--surface-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                            {uploadingFor === `upsell-${up.id}` ? '⏳' : '📷'}
                          </button>
                        )}
                        <div style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>{up.label}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                          <span style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: 15, color: 'var(--accent-deep)' }}>{fmtPrice(Number(up.price))}</span>
                          <button type="button" disabled={saving === up.id} onClick={() => void toggleItem(up.id, !up.is_active, 'category')}
                            style={{ width: 40, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', background: up.is_active ? 'var(--accent)' : 'var(--border)', position: 'relative' }}>
                            <span style={{ position: 'absolute', top: 3, left: up.is_active ? 18 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s ease' }} />
                          </button>
                          <button type="button" onClick={() => setEditing({ type: 'upsell', id: up.id, data: { label: up.label, price: up.price.toString() } })}
                            style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)', fontSize: 14 }}>✎</button>
                          <button type="button" onClick={() => setDeleting({ type: 'upsell', id: up.id })}
                            style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid #dc2626', background: 'rgba(220,38,38,0.08)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626', fontSize: 14 }}>🗑</button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <button type="button" onClick={() => setEditing({ type: 'upsell', id: null, data: { label: '', price: '' } })}
                  style={{ ...btnSecondary, marginTop: 8, borderStyle: 'dashed' }}>
                  + Extra hinzufügen
                </button>
              </div>
            )}
          </div>

          {/* ═══ KATEGORIEN & ITEMS ═══ */}
          {categories.map(cat => {
            const catItems = items.filter(i => i.category_id === cat.id)
            const isEditingCat = editing?.type === 'category' && editing.id === cat.id
            return (
              <div key={cat.id} className="betrieb-dash-card">
                {isEditingCat ? (
                  <div style={{ padding: 12, background: 'var(--accent-tint)', borderRadius: 8, marginBottom: 14 }}>
                    <input type="text" placeholder="Kategorie Name" value={editing.data.name || ''}
                      onChange={(e) => setEditing({ ...editing, data: { ...editing.data, name: e.target.value } })}
                      style={{ ...inputStyle, border: '1px solid var(--accent)', marginBottom: 10 }} />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="button" onClick={() => void saveItem()} disabled={saving !== null} style={btnPrimary}>Speichern</button>
                      <button type="button" onClick={() => setEditing(null)} style={btnSecondary}>Abbrechen</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div style={{ flex: 1 }}>
                      <h2 style={{ margin: 0, fontFamily: 'var(--font-head)', fontSize: '1rem', fontWeight: 800 }}>{cat.name}</h2>
                      <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{catItems.length} Items</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      <button type="button" disabled={saving === cat.id} onClick={() => setEditing({ type: 'category', id: cat.id, data: { name: cat.name } })}
                        style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>✎</button>
                      <button type="button" disabled={saving === cat.id} onClick={() => setDeleting({ type: 'category', id: cat.id })}
                        style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #dc2626', background: 'rgba(220,38,38,0.08)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626', fontSize: 14 }}>🗑</button>
                      <button type="button" disabled={saving === cat.id} onClick={() => void toggleItem(cat.id, !cat.is_active, 'category')}
                        style={{ padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: '1.5px solid', fontFamily: 'var(--font-body)', borderColor: cat.is_active ? 'var(--accent)' : 'var(--border)', background: cat.is_active ? 'var(--accent-tint)' : 'var(--surface-2)', color: cat.is_active ? 'var(--accent-deep)' : 'var(--text-2)' }}>
                        {cat.is_active ? 'Aktiv' : 'Inaktiv'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Items */}
                {catItems.length === 0 ? (
                  <p style={{ fontSize: 13, color: 'var(--text-3)', margin: 0 }}>Keine Items in dieser Kategorie.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {catItems.map(item => {
                      const isEditingItem = editing?.type === 'item' && editing.id === item.id
                      const assignedIngIds = getItemIngredients(item.id)
                      const assignedIngs = ingredients.filter(i => assignedIngIds.includes(i.id))
                      const allergens = assignedIngs.filter(i => i.allergen_group)

                      return (
                        <div key={item.id}>
                          {isEditingItem && editing ? (
                            /* ─── Edit-Formular ─── */
                            <div style={{ padding: 12, background: 'var(--accent-tint)', borderRadius: 8 }}>
                              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                                {/* Kategorie-Auswahl */}
                                <select value={editing.data.category_id || ''} onChange={e => setEditing({ ...editing, data: { ...editing.data, category_id: e.target.value } })}
                                  style={{ ...inputStyle, flex: '0 1 160px', width: 'auto', border: '1px solid var(--accent)' }}>
                                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                              </div>
                              <input type="text" placeholder="Name" value={editing.data.name || ''}
                                onChange={(e) => setEditing({ ...editing, data: { ...editing.data, name: e.target.value } })}
                                style={{ ...inputStyle, border: '1px solid var(--accent)', marginBottom: 8 }} />
                              <input type="text" placeholder="Beschreibung (optional)" value={editing.data.description || ''}
                                onChange={(e) => setEditing({ ...editing, data: { ...editing.data, description: e.target.value } })}
                                style={{ ...inputStyle, border: '1px solid var(--accent)', marginBottom: 8 }} />
                              <input type="text" placeholder="Preis (z.B. 12,50)" value={editing.data.price || ''}
                                onChange={(e) => setEditing({ ...editing, data: { ...editing.data, price: e.target.value } })}
                                style={{ ...inputStyle, border: '1px solid var(--accent)', marginBottom: 10 }} />
                              <div style={{ display: 'flex', gap: 8 }}>
                                <button type="button" onClick={() => void saveItem()} disabled={saving !== null} style={btnPrimary}>Speichern</button>
                                <button type="button" onClick={() => setEditing(null)} style={btnSecondary}>Abbrechen</button>
                              </div>
                            </div>
                          ) : (
                            /* ─── Item-Karte ─── */
                            <div className="betrieb-dash-order-mini" style={{ opacity: item.is_active ? 1 : 0.5 }}>
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                                {/* Foto-Bereich */}
                                <div style={{ flexShrink: 0 }}>
                                  {item.image_url ? (
                                    <div style={{ position: 'relative' }}>
                                      <img src={item.image_url} alt={item.name} style={{ width: 52, height: 52, borderRadius: 10, objectFit: 'cover', border: '1px solid var(--border)', display: 'block' }} />
                                      <button type="button" onClick={() => void removePhoto('item', item.id, item.image_url!)}
                                        style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        ✕
                                      </button>
                                    </div>
                                  ) : (
                                    <button type="button" onClick={() => triggerUpload('item', item.id)} disabled={uploadingFor === item.id}
                                      style={{ width: 52, height: 52, borderRadius: 10, border: '2px dashed var(--border)', background: 'var(--surface-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                                      {uploadingFor === item.id ? '⏳' : '📷'}
                                    </button>
                                  )}
                                </div>

                                {/* Inhalt */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontWeight: 600, fontSize: 14 }}>{item.name}</div>
                                  {item.description && (
                                    <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {item.description}
                                    </div>
                                  )}
                                  {/* Allergene-Badges */}
                                  {allergens.length > 0 && (
                                    <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                                      {allergens.map(a => (
                                        <span key={a.id} style={{ fontSize: 10, background: '#fef3c7', color: '#92400e', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                                          {allergenEmoji(a.allergen_group)} {a.name}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                  {/* Zutaten-Count */}
                                  <button type="button" onClick={() => setAssigningItem(item)}
                                    style={{ fontSize: 11, color: 'var(--accent-deep)', background: 'var(--accent-tint)', border: 'none', borderRadius: 6, padding: '2px 8px', marginTop: 5, cursor: 'pointer', fontWeight: 600 }}>
                                    🥗 {assignedIngIds.length} Zutat{assignedIngIds.length !== 1 ? 'en' : ''}
                                  </button>
                                </div>

                                {/* Aktionen */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                                  <span style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: 15, color: 'var(--accent-deep)' }}>
                                    {fmtPrice(Number(item.price))}
                                  </span>
                                  <button type="button" disabled={saving === item.id} onClick={() => void toggleItem(item.id, !item.is_active, 'item')}
                                    style={{ width: 40, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', background: item.is_active ? 'var(--accent)' : 'var(--border)', position: 'relative' }}>
                                    <span style={{ position: 'absolute', top: 3, left: item.is_active ? 18 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s ease' }} />
                                  </button>
                                  <button type="button" disabled={saving === item.id}
                                    onClick={() => setEditing({ type: 'item', id: item.id, data: { category_id: item.category_id, name: item.name, description: item.description || '', price: item.price.toString() } })}
                                    style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>✎</button>
                                  <button type="button" disabled={saving === item.id} onClick={() => setDeleting({ type: 'item', id: item.id })}
                                    style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid #dc2626', background: 'rgba(220,38,38,0.08)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626', fontSize: 14 }}>🗑</button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* + Item in Kategorie */}
                <button type="button"
                  onClick={() => setEditing({ type: 'item', id: null, data: { category_id: cat.id, name: '', description: '', price: '0' } })}
                  style={{ ...btnSecondary, marginTop: 10, borderStyle: 'dashed', fontSize: 12 }}>
                  + Produkt in {cat.name}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* ═══ ZUTATEN-ZUORDNUNG MODAL ═══ */}
      {assigningItem && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }}
          onClick={() => setAssigningItem(null)}>
          <div className="betrieb-dash-card" style={{ maxWidth: 420, width: '90%', maxHeight: '80vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontFamily: 'var(--font-head)', fontSize: '0.95rem', fontWeight: 800 }}>
                🥗 Zutaten für: {assigningItem.name}
              </h3>
              <button type="button" onClick={() => setAssigningItem(null)}
                style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: 16 }}>✕</button>
            </div>

            {ingredients.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-3)', textAlign: 'center' }}>
                Erstelle zuerst Zutaten in der Zutaten-Bibliothek (🥗 Zutaten-Liste Button oben).
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {ingredients.map(ing => {
                  const assigned = getItemIngredients(assigningItem.id).includes(ing.id)
                  return (
                    <button key={ing.id} type="button"
                      onClick={() => void toggleIngredientAssignment(assigningItem.id, ing.id, assigned)}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, border: assigned ? '2px solid var(--accent)' : '1px solid var(--border)', background: assigned ? 'var(--accent-tint)' : 'var(--surface-2)', cursor: 'pointer', textAlign: 'left' }}>
                      <span style={{ width: 22, height: 22, borderRadius: 6, border: assigned ? 'none' : '2px solid var(--border)', background: assigned ? 'var(--accent)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, flexShrink: 0 }}>
                        {assigned ? '✓' : ''}
                      </span>
                      {ing.allergen_group && <span style={{ fontSize: 16 }}>{allergenEmoji(ing.allergen_group)}</span>}
                      <span style={{ flex: 1, fontSize: 13, fontWeight: assigned ? 700 : 500 }}>{ing.name}</span>
                      {ing.allergen_group && (
                        <span style={{ fontSize: 10, background: '#fef3c7', color: '#92400e', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
                          {ALLERGEN_GROUPS.find(a => a.value === ing.allergen_group)?.label}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            <div style={{ marginTop: 14, fontSize: 12, color: 'var(--text-3)', textAlign: 'center' }}>
              Änderungen werden sofort gespeichert.
            </div>
          </div>
        </div>
      )}

      {/* ═══ EDIT-MODAL (Kategorie / Item / Upsell — wenn kein Inline) ═══ */}
      {editing && !items.find(i => i.id === editing.id) && !categories.find(c => c.id === editing.id) && !upsells.find(u => u.id === editing.id) && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
          onClick={() => setEditing(null)}>
          <div className="betrieb-dash-card" style={{ maxWidth: 380, width: '90%' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 14px', fontFamily: 'var(--font-head)', fontSize: '0.95rem', fontWeight: 800 }}>
              {editing.id ? 'Bearbeiten' : editing.type === 'category' ? 'Neue Kategorie' : editing.type === 'upsell' ? 'Neues Extra' : 'Neues Produkt'}
            </h3>
            {editing.type === 'category' && (
              <input type="text" placeholder="Kategorie Name" value={editing.data.name || ''}
                onChange={(e) => setEditing({ ...editing, data: { ...editing.data, name: e.target.value } })}
                style={{ ...inputStyle, border: '1px solid var(--accent)', marginBottom: 14 }} />
            )}
            {(editing.type === 'item' || editing.type === 'upsell') && (
              <>
                {editing.type === 'item' && (
                  <select value={editing.data.category_id || ''} onChange={e => setEditing({ ...editing, data: { ...editing.data, category_id: e.target.value } })}
                    style={{ ...inputStyle, marginBottom: 8 }}>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                )}
                <input type="text" placeholder={editing.type === 'upsell' ? 'Label (z.B. Extra Käse)' : 'Name'} value={editing.data.name || editing.data.label || ''}
                  onChange={(e) => setEditing({ ...editing, data: { ...editing.data, [editing.type === 'upsell' ? 'label' : 'name']: e.target.value } })}
                  style={{ ...inputStyle, marginBottom: 8 }} />
                {editing.type === 'item' && (
                  <input type="text" placeholder="Beschreibung (optional)" value={editing.data.description || ''}
                    onChange={(e) => setEditing({ ...editing, data: { ...editing.data, description: e.target.value } })}
                    style={{ ...inputStyle, marginBottom: 8 }} />
                )}
                <input type="text" placeholder="Preis (z.B. 12,50)" value={editing.data.price || ''}
                  onChange={(e) => setEditing({ ...editing, data: { ...editing.data, price: e.target.value } })}
                  style={{ ...inputStyle, marginBottom: 14 }} />
              </>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => void saveItem()} disabled={saving !== null} style={btnPrimary}>Speichern</button>
              <button type="button" onClick={() => setEditing(null)} style={btnSecondary}>Abbrechen</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ LÖSCHEN-BESTÄTIGUNG ═══ */}
      {deleting && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
          onClick={() => setDeleting(null)}>
          <div className="betrieb-dash-card" style={{ maxWidth: 360 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 12px', fontFamily: 'var(--font-head)', fontSize: '1rem', fontWeight: 800 }}>Wirklich löschen?</h3>
            <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--text-2)' }}>Diese Aktion kann nicht rückgängig gemacht werden.</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => void deleteConfirmed()} disabled={saving !== null}
                style={{ flex: 1, padding: '8px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', background: '#dc2626', color: '#fff', fontFamily: 'var(--font-body)' }}>
                Ja, löschen
              </button>
              <button type="button" onClick={() => setDeleting(null)}
                style={{ flex: 1, padding: '8px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'var(--font-body)' }}>
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
