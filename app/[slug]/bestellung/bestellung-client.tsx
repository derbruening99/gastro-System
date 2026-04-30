'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

// ─── Types ─────────────────────────────────────────────────────────────────────

type KustomizerConfig = {
  type: 'kustomizer'
  basis: string
  protein: string
  zutaten: string[]
  sauce: string
  crunch: string[]
  extras: string[]
  price: number
}

type OrderType = 'pickup' | 'dine-in' | 'delivery'

type Props = {
  slug: string
  tenantName: string
  tenantPhone: string | null
  tenantAddress: string | null
  defaultOrderType?: OrderType | null
  defaultTable?: string | null
}

type Step = 'form' | 'confirm' | 'success'

// ─── Time Slots ────────────────────────────────────────────────────────────────

const TIME_SLOTS = [
  '11:30', '12:00', '12:15', '12:30', '12:45',
  '13:00', '13:30', '14:00', '14:30', '15:00',
  '17:00', '17:30',
]

// ─── Order Type Config ─────────────────────────────────────────────────────────

const ORDER_TYPES: { id: OrderType; emoji: string; label: string; sub: string }[] = [
  { id: 'pickup',   emoji: '🥡', label: 'Abholen',      sub: 'Ich komme selbst vorbei' },
  { id: 'dine-in',  emoji: '🪑', label: 'Vor Ort essen', sub: 'Ich bin bereits da / komme gleich' },
  { id: 'delivery', emoji: '🛵', label: 'Liefern',       sub: 'Bitte an meine Adresse liefern' },
]

// ─── Confetti ──────────────────────────────────────────────────────────────────

function launchConfetti() {
  const colors = ['#22c55e', '#16a34a', '#ffffff', '#bbf7d0', '#fbbf24', '#fb923c']
  for (let i = 0; i < 60; i++) {
    setTimeout(() => {
      const el = document.createElement('div')
      el.style.cssText = `
        position:fixed; pointer-events:none; z-index:9999;
        left:${Math.random() * 100}vw; top:-10px;
        width:${6 + Math.random() * 8}px; height:${6 + Math.random() * 8}px;
        background:${colors[Math.floor(Math.random() * colors.length)]};
        border-radius:${Math.random() > 0.5 ? '50%' : '3px'};
        animation: confFall ${0.9 + Math.random() * 1.2}s linear ${Math.random() * 0.3}s forwards;
      `
      document.body.appendChild(el)
      setTimeout(() => el.remove(), 2200)
    }, i * 25)
  }
}

// ─── Page Header ───────────────────────────────────────────────────────────────

function PageHeader({
  title, slug, dark, onBack, toggleDark,
}: {
  title: string
  slug: string
  dark: boolean
  onBack?: () => void
  toggleDark: () => void
}) {
  const bg      = dark ? '#071a0e' : '#f0fdf4'
  const surface = dark ? '#0f2a18' : '#ffffff'
  const border  = dark ? '#1a3d28' : '#d1fae5'
  const text    = dark ? '#e8f5eb' : '#0f1a12'
  return (
    <header style={{ background: surface, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: `1px solid ${border}`, position: 'sticky', top: 0, zIndex: 100 }}>
      {onBack
        ? <button onClick={onBack} style={iconBtn(bg, text)}>←</button>
        : <Link href={`/${slug}/kustomizer`} style={{ ...iconBtn(bg, text), textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</Link>
      }
      <h1 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 17, fontWeight: 800, flex: 1, color: text, margin: 0 }}>{title}</h1>
      <button onClick={toggleDark} style={iconBtn(bg, text)}>{dark ? '☀️' : '🌙'}</button>
    </header>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function BestellungClient({ slug, tenantName, tenantPhone, tenantAddress, defaultOrderType, defaultTable }: Props) {
  const [config, setConfig] = useState<KustomizerConfig | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [step, setStep] = useState<Step>('form')

  // Form state
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [orderType, setOrderType] = useState<OrderType | null>(defaultOrderType ?? null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [tableNumber, setTableNumber] = useState(defaultTable ?? '')
  const [address, setAddress] = useState('')
  const [note, setNote] = useState('')
  const [loyaltyEnabled, setLoyaltyEnabled] = useState(true)

  // Errors
  const [nameError, setNameError] = useState(false)
  const [phoneError, setPhoneError] = useState(false)
  const [orderTypeError, setOrderTypeError] = useState(false)
  const [timeError, setTimeError] = useState(false)
  const [addressError, setAddressError] = useState(false)

  // Submit
  const [submitting, setSubmitting] = useState(false)
  const [stampsLeft, setStampsLeft] = useState<number | null>(null)

  // Dark mode
  const [dark, setDark] = useState(false)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('odis_kustomizer')
      if (raw) setConfig(JSON.parse(raw))
    } catch {}
    if (localStorage.getItem('odis-theme') === 'dark') setDark(true)
    setLoaded(true)
  }, [])

  function toggleDark() {
    const next = !dark
    setDark(next)
    localStorage.setItem('odis-theme', next ? 'dark' : 'light')
  }

  // ── Theme tokens ─────────────────────────────────────────────────────────────

  const bg      = dark ? '#071a0e' : '#f0fdf4'
  const surface = dark ? '#0f2a18' : '#ffffff'
  const surface2= dark ? '#132e1c' : '#f8fdf9'
  const border  = dark ? '#1a3d28' : '#d1fae5'
  const text    = dark ? '#e8f5eb' : '#0f1a12'
  const text2   = dark ? '#a7d4b5' : '#3d5c47'
  const text3   = dark ? '#6b9e7a' : '#6b7c72'
  const shadow  = dark ? '0 4px 24px rgba(0,0,0,0.30)' : '0 4px 24px rgba(0,0,0,0.08)'

  // ── Derived ──────────────────────────────────────────────────────────────────

  const tags: string[] = config
    ? [config.basis, config.protein, ...config.zutaten.slice(0, 3),
       ...(config.zutaten.length > 3 ? [`+${config.zutaten.length - 3}`] : [])].filter(Boolean)
    : []

  const descParts: string[] = config
    ? [config.zutaten.join(' · '), config.sauce ? `Sauce: ${config.sauce}` : '', config.crunch.length ? `Crunch: ${config.crunch.join(', ')}` : ''].filter(Boolean)
    : []

  // ── Order-type label for display ─────────────────────────────────────────────

  function orderTypeLabel(t: OrderType | null) {
    return ORDER_TYPES.find((o) => o.id === t)?.label ?? '–'
  }

  // ── Confirm row: timing/location ─────────────────────────────────────────────

  function locationRow(): [string, string][] {
    if (orderType === 'pickup')   return [['Abholzeit', selectedTime ? `${selectedTime} Uhr` : '–']]
    if (orderType === 'dine-in')  return [['Tischnummer', tableNumber || 'Kein Tisch angegeben']]
    if (orderType === 'delivery') return [['Lieferadresse', address], ...(selectedTime ? [['Wunschzeit', `${selectedTime} Uhr`] as [string, string]] : [])]
    return []
  }

  // ── Validation ───────────────────────────────────────────────────────────────

  function goConfirm() {
    let valid = true
    setNameError(false); setPhoneError(false); setOrderTypeError(false)
    setTimeError(false); setAddressError(false)

    if (!name.trim())                            { setNameError(true);      valid = false }
    if (phone.replace(/\s/g, '').length < 6)     { setPhoneError(true);     valid = false }
    if (!orderType)                               { setOrderTypeError(true); valid = false }
    if (orderType === 'pickup' && !selectedTime)  { setTimeError(true);      valid = false }
    if (orderType === 'delivery' && !address.trim()) { setAddressError(true); valid = false }

    if (!valid) { if (navigator.vibrate) navigator.vibrate([60, 30, 60]); return }
    if (navigator.vibrate) navigator.vibrate(8)
    setStep('confirm')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ── Submit ───────────────────────────────────────────────────────────────────

  async function submitOrder() {
    if (!config || submitting) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/${slug}/bestellung`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          order_type: orderType,
          pickup_time: selectedTime,
          table_number: tableNumber || null,
          address: address || null,
          notes: note.trim() || null,
          loyalty_enabled: loyaltyEnabled,
          config,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setStampsLeft(data.stamps_left ?? null)
        sessionStorage.removeItem('odis_kustomizer')
      }
    } catch {}
    setStep('success')
    setTimeout(() => launchConfetti(), 100)
    setSubmitting(false)
  }

  // ── WhatsApp URL ─────────────────────────────────────────────────────────────

  function buildWaUrl() {
    if (!tenantPhone || !config) return null
    const ph = tenantPhone.replace(/\D/g, '')
    const typeEmoji = { pickup: '🥡', 'dine-in': '🪑', delivery: '🛵' }[orderType ?? 'pickup']
    const lines = [
      `🥣 Kustomizer Bowl — ${tenantName}`,
      '',
      `${typeEmoji} ${orderTypeLabel(orderType)}`,
      `👤 Name: ${name}`,
      ...(orderType === 'pickup'   ? [`⏰ Abholung: ${selectedTime} Uhr`] : []),
      ...(orderType === 'dine-in'  ? [tableNumber ? `🪑 Tisch: ${tableNumber}` : '🪑 Vor Ort'] : []),
      ...(orderType === 'delivery' ? [`📍 Lieferung an: ${address}`, ...(selectedTime ? [`⏰ Wunschzeit: ${selectedTime} Uhr`] : [])] : []),
      '',
      `📦 Basis:   ${config.basis}`,
      `🍖 Warmspeise: ${config.protein}`,
      `🥦 Zutaten: ${config.zutaten.join(', ') || '–'}`,
      `🫙 Sauce:   ${config.sauce}`,
      `✨ Crunch:  ${config.crunch.join(', ') || '–'}`,
      ...(config.extras.length ? [`➕ Extras:  ${config.extras.join(', ')}`] : []),
      '',
      `💶 Preis: ${config.price.toFixed(2).replace('.', ',')} €`,
      ...(note ? [`📝 ${note}`] : []),
    ]
    return `https://wa.me/${ph}?text=${encodeURIComponent(lines.join('\n'))}`
  }

  const waUrl = buildWaUrl()

  const globalStyles = `
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600&display=swap');
    @keyframes fadeUp   { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
    @keyframes checkPop { 0%{transform:scale(0.5)} 60%{transform:scale(1.3)} 100%{transform:scale(1)} }
    @keyframes confFall { 0%{transform:translateY(-10px) rotate(0);opacity:1} 100%{transform:translateY(130px) rotate(720deg);opacity:0} }
    @keyframes successBounce { 0%{transform:scale(0.5) rotate(-10deg);opacity:0} 60%{transform:scale(1.15) rotate(3deg);opacity:1} 100%{transform:scale(1) rotate(0)} }
    .rev { opacity:0; transform:translateY(18px); animation: fadeUp 0.4s ease forwards; }
    .d1{animation-delay:.05s}.d2{animation-delay:.10s}.d3{animation-delay:.15s}.d4{animation-delay:.20s}.d5{animation-delay:.25s}.d6{animation-delay:.30s}
    input:focus,textarea:focus { outline:none!important; border-color:#22c55e!important; }
    .ot-card:hover { border-color:#22c55e!important; transform:translateY(-1px); }
    .tc:hover { border-color:#22c55e!important; color:#16a34a!important; }
    .cta:hover { transform:translateY(-2px); box-shadow:0 8px 36px rgba(34,197,94,0.55)!important; }
    .cta:active { transform:scale(0.98); }
  `

  // ─────────────────────────────────────────────────────────────────────────────

  if (!loaded) return null

  // ── No config guard ───────────────────────────────────────────────────────────

  if (!config) {
    return (
      <div style={{ background: bg, minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif' }}>
        <style>{globalStyles}</style>
        <PageHeader title="Direkt bestellen" slug={slug} dark={dark} toggleDark={toggleDark} />
        <div style={{ maxWidth: 480, margin: '0 auto', padding: '64px 24px', textAlign: 'center' }}>
          <span style={{ fontSize: 56, display: 'block', marginBottom: 16 }}>🥣</span>
          <h3 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 20, fontWeight: 800, color: text, marginBottom: 10 }}>Keine Bestellung gefunden</h3>
          <p style={{ fontSize: 14, color: text3, lineHeight: 1.6, marginBottom: 24 }}>Konfiguriere zuerst deine Bowl im Kustomizer.</p>
          <Link href={`/${slug}/kustomizer`} style={btnPrimary}>Bowl konfigurieren →</Link>
        </div>
      </div>
    )
  }

  // ── Success ───────────────────────────────────────────────────────────────────

  if (step === 'success') {
    return (
      <div style={{ background: bg, minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif', paddingBottom: 48 }}>
        <style>{globalStyles}</style>
        <header style={{ background: surface, padding: '14px 20px', borderBottom: `1px solid ${border}` }}>
          <h1 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 17, fontWeight: 800, color: text, margin: 0 }}>Bestellung eingegangen 🎉</h1>
        </header>
        <div style={{ maxWidth: 480, margin: '0 auto', padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <span style={{ fontSize: 64, display: 'block', marginBottom: 20, animation: 'successBounce 0.6s cubic-bezier(0.34,1.56,0.64,1)' }}>🎉</span>
          <h2 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 26, fontWeight: 900, color: text, marginBottom: 10 }}>Bestellung eingegangen!</h2>
          <p style={{ fontSize: 15, color: text3, lineHeight: 1.6, maxWidth: 300, marginBottom: 6 }}>
            {orderType === 'delivery'
              ? 'Wir kümmern uns um deine Lieferung — sende uns die Bestellung per WhatsApp.'
              : orderType === 'dine-in'
              ? 'Kurz Bescheid geben und wir bereiten deine Bowl zu.'
              : 'Sende uns die Bestellung per WhatsApp — dann legen wir los.'}
          </p>

          {/* Summary */}
          <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 20, padding: '16px 20px', margin: '20px 0', width: '100%', maxWidth: 360, textAlign: 'left', boxShadow: shadow, animation: 'fadeUp 0.5s ease 0.1s both' }}>
            {[
              ['Name', name],
              ['Bowl', `${config.basis} Bowl`],
              ['Art', `${ORDER_TYPES.find(o=>o.id===orderType)?.emoji} ${orderTypeLabel(orderType)}`],
              ...(orderType === 'pickup' && selectedTime ? [['Abholung', `${selectedTime} Uhr`]] : []),
              ...(orderType === 'dine-in' && tableNumber  ? [['Tisch', tableNumber]] : []),
              ...(orderType === 'delivery' ? [['Lieferung', address]] : []),
              ['Preis', `${config.price.toFixed(2).replace('.', ',')} €`],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '6px 0', borderBottom: `1px solid ${border}` }}>
                <span style={{ color: text3 }}>{k}</span>
                <span style={{ fontWeight: 600, color: text, textAlign: 'right', maxWidth: '60%' }}>{v}</span>
              </div>
            ))}
          </div>

          {/* Loyalty */}
          {loyaltyEnabled && (
            <div style={{ background: dark ? 'linear-gradient(135deg,#14532d,#1a3d28)' : 'linear-gradient(135deg,#dcfce7,#bbf7d0)', borderRadius: 16, padding: '14px 16px', maxWidth: 360, width: '100%', marginBottom: 20, animation: 'fadeUp 0.5s ease 0.2s both' }}>
              <p style={{ fontSize: 14, color: dark ? '#86efac' : '#15803d', margin: 0, lineHeight: 1.5 }}>
                🥣 <strong>+1 Stempel</strong> für deine Treuecard!{stampsLeft !== null ? ` Noch ${stampsLeft} bis zur Gratis-Bowl.` : ' Melde dich im VIP-Bereich an.'}
              </p>
            </div>
          )}

          {/* WhatsApp CTA */}
          {waUrl && (
            <a href={waUrl} target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, width: '100%', maxWidth: 360, padding: '18px', background: '#25D366', borderRadius: 16, textDecoration: 'none', fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 17, fontWeight: 800, color: '#fff', boxShadow: '0 6px 24px rgba(37,211,102,0.40)', marginBottom: 12, animation: 'fadeUp 0.5s ease 0.3s both' }}>
              <WaIcon />
              Bestellung per WhatsApp senden
            </a>
          )}

          <Link href={`/${slug}`} style={{ display: 'inline-block', padding: '14px 28px', background: 'transparent', border: `1.5px solid ${border}`, borderRadius: 16, textDecoration: 'none', fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 15, fontWeight: 700, color: text2 }}>
            🏠 Zurück zur Startseite
          </Link>
        </div>
      </div>
    )
  }

  // ── Confirm ───────────────────────────────────────────────────────────────────

  if (step === 'confirm') {
    return (
      <div style={{ background: bg, minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif', paddingBottom: 48 }}>
        <style>{globalStyles}</style>
        <PageHeader title="Alles stimmt?" slug={slug} dark={dark} toggleDark={toggleDark} onBack={() => setStep('form')} />
        <div style={{ maxWidth: 480, margin: '0 auto', padding: '20px 16px' }}>
          <StepDots current={1} dark={dark} border={border} />
          <SummaryCard config={config} tags={tags} descParts={descParts} />

          <SLabel text="Schritt 2 — Bestellübersicht" color={text3} />
          <div style={{ background: surface, borderRadius: 20, padding: 20, boxShadow: shadow, border: `1px solid ${border}`, marginBottom: 14 }}>
            <h3 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 15, fontWeight: 800, color: text, marginBottom: 14 }}>✅ Deine Angaben</h3>
            {[
              ['Bowl',      `${config.basis} Bowl`],
              ['Preis',     `${config.price.toFixed(2).replace('.', ',')} €`],
              ['Name',      name],
              ['Nummer',    `+49 ${phone.replace(/^0+/, '')}`],
              ['Art',       `${ORDER_TYPES.find(o=>o.id===orderType)?.emoji} ${orderTypeLabel(orderType)}`],
              ...locationRow(),
              ...(note ? [['Anmerkung', note]] : []),
              ['Treuecard', loyaltyEnabled ? '✅ Stempel wird vergeben' : '❌ Nicht aktiviert'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '7px 0', borderBottom: `1px solid ${border}` }}>
                <span style={{ color: text3 }}>{k}</span>
                <span style={{ fontWeight: 600, color: text, textAlign: 'right', maxWidth: '55%' }}>{v}</span>
              </div>
            ))}
          </div>

          <button onClick={submitOrder} disabled={submitting} className="cta"
            style={{ width: '100%', padding: '18px', background: 'linear-gradient(135deg,#22c55e,#16a34a)', border: 'none', borderRadius: 16, fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 18, fontWeight: 800, color: '#fff', cursor: submitting ? 'not-allowed' : 'pointer', boxShadow: '0 6px 28px rgba(34,197,94,0.40)', opacity: submitting ? 0.7 : 1, marginBottom: 12, transition: 'all 0.2s' }}>
            {submitting ? '⏳ Wird übermittelt…' : '🥣 Jetzt verbindlich bestellen'}
          </button>
          <button onClick={() => setStep('form')}
            style={{ width: '100%', padding: '14px', background: 'transparent', border: `1.5px solid ${border}`, borderRadius: 16, fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 15, fontWeight: 700, color: text2, cursor: 'pointer' }}>
            ← Zurück bearbeiten
          </button>
        </div>
      </div>
    )
  }

  // ── Form ──────────────────────────────────────────────────────────────────────

  return (
    <div style={{ background: bg, minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif', paddingBottom: 48 }}>
      <style>{globalStyles}</style>
      <PageHeader title="Direkt bestellen" slug={slug} dark={dark} toggleDark={toggleDark} />

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '20px 16px' }}>

        {/* Step dots */}
        <div className="rev d1"><StepDots current={0} dark={dark} border={border} /></div>

        {/* Bowl summary card */}
        <div className="rev d2"><SummaryCard config={config} tags={tags} descParts={descParts} /></div>

        {/* Contact */}
        <SLabel className="rev d2" text="Schritt 1 — Deine Daten" color={text3} />
        <div className="rev d3" style={card(surface, shadow, border)}>
          <h3 style={cardTitle(text)}>📱 Kontakt</h3>

          {/* Name */}
          <div style={{ marginBottom: 12 }}>
            <label style={inputLabel(text3)}>Name</label>
            <input type="text" value={name} onChange={e=>{setName(e.target.value);setNameError(false)}}
              placeholder="Dein Vorname" autoComplete="given-name"
              style={inputStyle(surface2, nameError ? '#ef4444' : border, text)} />
          </div>

          {/* Phone */}
          <div>
            <label style={inputLabel(text3)}>Handynummer</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 15, fontWeight: 600, color: text3, pointerEvents: 'none' }}>+49</span>
              <input type="tel" value={phone} onChange={e=>{setPhone(e.target.value);setPhoneError(false)}}
                placeholder="015X XXXXXXXX" inputMode="tel" autoComplete="tel"
                style={{ ...inputStyle(surface2, phoneError ? '#ef4444' : border, text), paddingLeft: 46 }} />
            </div>
          </div>
        </div>

        {/* ── Order Type ── */}
        <SLabel className="rev d3" text="Wie möchtest du bestellen?" color={text3} />
        <div className="rev d4" style={{ marginBottom: 14 }}>
          {orderTypeError && (
            <p style={{ fontSize: 12, color: '#ef4444', marginBottom: 8 }}>Bitte eine Option wählen</p>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {ORDER_TYPES.map(({ id, emoji, label, sub }) => {
              const selected = orderType === id
              return (
                <button key={id} className="ot-card"
                  onClick={() => { setOrderType(id); setOrderTypeError(false); setSelectedTime(null); if (navigator.vibrate) navigator.vibrate(8) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '16px 18px',
                    background: selected
                      ? (dark ? 'linear-gradient(135deg,#14532d,#166534)' : 'linear-gradient(135deg,#dcfce7,#bbf7d0)')
                      : surface,
                    border: `2px solid ${selected ? '#22c55e' : border}`,
                    borderRadius: 16, cursor: 'pointer', textAlign: 'left',
                    boxShadow: selected ? '0 4px 20px rgba(34,197,94,0.22)' : shadow,
                    transition: 'all 0.2s',
                  }}>
                  {/* Emoji bubble */}
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: selected ? 'rgba(255,255,255,0.2)' : (dark ? '#1a3d28' : '#f0fdf4'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>
                    {emoji}
                  </div>
                  {/* Text */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 15, fontWeight: 800, color: selected ? (dark ? '#22c55e' : '#15803d') : text }}>
                      {label}
                    </div>
                    <div style={{ fontSize: 12, color: selected ? (dark ? '#86efac' : '#16a34a') : text3, marginTop: 2 }}>
                      {sub}
                    </div>
                  </div>
                  {/* Check indicator */}
                  <div style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${selected ? '#22c55e' : border}`, background: selected ? '#22c55e' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#fff', flexShrink: 0, transition: 'all 0.2s' }}>
                    {selected ? '✓' : ''}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Conditional fields based on order type ── */}

        {/* PICKUP: time slots */}
        {orderType === 'pickup' && (
          <div className="rev d1" style={{ ...card(surface, shadow, border), marginBottom: 14 }}>
            <h3 style={cardTitle(text)}>⏰ Abholzeit wählen</h3>
            {timeError && <p style={{ fontSize: 12, color: '#ef4444', marginBottom: 8 }}>Bitte eine Zeit wählen</p>}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {TIME_SLOTS.map((t) => {
                const sel = selectedTime === t
                return (
                  <button key={t} className="tc"
                    onClick={() => { setSelectedTime(t); setTimeError(false); if (navigator.vibrate) navigator.vibrate(8) }}
                    style={{ padding: '12px 4px', textAlign: 'center', background: sel ? (dark ? 'linear-gradient(135deg,#14532d,#166534)' : 'linear-gradient(135deg,#dcfce7,#bbf7d0)') : surface2, border: `1.5px solid ${sel ? '#22c55e' : (timeError ? '#ef4444' : border)}`, borderRadius: 10, fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 12, fontWeight: 700, color: sel ? (dark ? '#22c55e' : '#15803d') : text2, cursor: 'pointer', transition: 'all 0.2s' }}>
                    {t}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* DINE-IN: table number */}
        {orderType === 'dine-in' && (
          <div className="rev d1" style={{ ...card(surface, shadow, border), marginBottom: 14 }}>
            <h3 style={cardTitle(text)}>🪑 Tischnummer (optional)</h3>
            <p style={{ fontSize: 13, color: text3, marginBottom: 12, lineHeight: 1.5 }}>Du kannst auch direkt bestellen ohne Tischnummer — wir finden dich.</p>
            <input type="text" value={tableNumber} onChange={e => setTableNumber(e.target.value)}
              placeholder="z.B. Tisch 4 oder Ecktisch links"
              style={inputStyle(surface2, border, text)} />

            {/* Sofort-Info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, padding: '10px 14px', background: dark ? '#1a3d28' : '#f0fdf4', borderRadius: 10, border: `1px solid ${border}` }}>
              <span style={{ fontSize: 18 }}>⚡</span>
              <p style={{ fontSize: 12, color: text3, margin: 0 }}>Deine Bowl wird sofort nach Eingang zubereitet.</p>
            </div>
          </div>
        )}

        {/* DELIVERY: address + optional time */}
        {orderType === 'delivery' && (
          <div className="rev d1" style={{ ...card(surface, shadow, border), marginBottom: 14 }}>
            <h3 style={cardTitle(text)}>📍 Lieferadresse</h3>
            <div style={{ marginBottom: 16 }}>
              <label style={inputLabel(text3)}>Straße, Hausnummer, Ort</label>
              <input type="text" value={address} onChange={e=>{setAddress(e.target.value);setAddressError(false)}}
                placeholder="z.B. Borneplatz 2, 48431 Rheine"
                autoComplete="street-address"
                style={inputStyle(surface2, addressError ? '#ef4444' : border, text)} />
              {addressError && <p style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>Bitte Adresse angeben</p>}
            </div>
            <SLabel text="Wunschzeit (optional)" color={text3} style={{ margin: '0 0 8px' }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {TIME_SLOTS.map((t) => {
                const sel = selectedTime === t
                return (
                  <button key={t} className="tc"
                    onClick={() => { setSelectedTime(sel ? null : t); if (navigator.vibrate) navigator.vibrate(8) }}
                    style={{ padding: '12px 4px', textAlign: 'center', background: sel ? (dark ? 'linear-gradient(135deg,#14532d,#166534)' : 'linear-gradient(135deg,#dcfce7,#bbf7d0)') : surface2, border: `1.5px solid ${sel ? '#22c55e' : border}`, borderRadius: 10, fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 12, fontWeight: 700, color: sel ? (dark ? '#22c55e' : '#15803d') : text2, cursor: 'pointer', transition: 'all 0.2s' }}>
                    {t}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Loyalty */}
        <div className="rev d5" style={{ background: surface, borderRadius: 20, padding: '16px 18px', boxShadow: shadow, border: `1px solid ${border}`, marginBottom: 14 }}>
          <div onClick={() => setLoyaltyEnabled(!loyaltyEnabled)}
            style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer', background: dark ? 'linear-gradient(135deg,#14532d,#1a3d28)' : 'linear-gradient(135deg,#dcfce7,#bbf7d0)', borderRadius: 14, padding: '14px 16px', border: '1.5px solid #22c55e' }}>
            <div style={{ width: 22, height: 22, borderRadius: 6, border: '2px solid #16a34a', background: loyaltyEnabled ? '#22c55e' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#fff', flexShrink: 0, marginTop: 1, transition: 'background 0.2s' }}>
              {loyaltyEnabled ? '✓' : ''}
            </div>
            <div>
              <h4 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 14, fontWeight: 800, color: dark ? '#22c55e' : '#15803d', marginBottom: 3 }}>🥣 Stempel sammeln aktivieren</h4>
              <p style={{ fontSize: 12, color: dark ? '#a7f3d0' : '#15803d', lineHeight: 1.4 }}>Deine Nummer wird gespeichert — nach 8 Bestellungen eine Gratis-Bowl.</p>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="rev d5" style={{ ...card(surface, shadow, border), marginBottom: 14 }}>
          <h3 style={cardTitle(text)}>📝 Anmerkungen (optional)</h3>
          <textarea value={note} onChange={e => setNote(e.target.value)}
            placeholder="z.B. kein Koriander, extra scharf, bitte Gabel einpacken …"
            style={{ width: '100%', height: 80, padding: 14, background: surface2, border: `1.5px solid ${border}`, borderRadius: 10, fontFamily: 'Inter, sans-serif', fontSize: 15, color: text, resize: 'none', lineHeight: 1.5, boxSizing: 'border-box' }} />
        </div>

        {/* CTA */}
        <button onClick={goConfirm} className="cta rev d6"
          style={{ width: '100%', padding: '18px', background: 'linear-gradient(135deg,#22c55e,#16a34a)', border: 'none', borderRadius: 16, fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 18, fontWeight: 800, color: '#fff', cursor: 'pointer', boxShadow: '0 6px 28px rgba(34,197,94,0.40)', transition: 'all 0.2s' }}>
          Weiter zur Bestätigung →
        </button>

      </div>
    </div>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function StepDots({ current, dark, border }: { current: number; dark: boolean; border: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{ display: 'contents' }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 12, fontWeight: 800, flexShrink: 0, transition: 'all 0.3s', background: i < current ? '#16a34a' : i === current ? 'linear-gradient(135deg,#22c55e,#16a34a)' : (dark ? '#1a3d28' : '#d1fae5'), color: i <= current ? '#fff' : (dark ? '#6b9e7a' : '#6b7c72'), boxShadow: i === current ? '0 4px 16px rgba(34,197,94,0.40)' : 'none' }}>
            {i < current ? '✓' : i + 1}
          </div>
          {i < 2 && <div style={{ flex: 1, height: 2, background: i < current ? '#16a34a' : border, transition: 'background 0.4s' }} />}
        </span>
      ))}
    </div>
  )
}

function SummaryCard({ config, tags, descParts }: { config: KustomizerConfig; tags: string[]; descParts: string[] }) {
  return (
    <div style={{ background: 'linear-gradient(135deg,#14532d,#166534)', borderRadius: 24, padding: 20, marginBottom: 20, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -30, right: -30, width: 100, height: 100, borderRadius: '50%', background: 'radial-gradient(circle,rgba(34,197,94,0.2),transparent 70%)', pointerEvents: 'none' }} />
      <span style={{ fontSize: 32, display: 'block', marginBottom: 10 }}>🥣</span>
      <h2 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 18, fontWeight: 800, color: '#fff', marginBottom: 4 }}>{config.basis} Bowl</h2>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.70)', lineHeight: 1.5, marginBottom: 12 }}>{descParts.join(' · ') || 'Individuelle Bowl'}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
        {tags.map(t => <span key={t} style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 50, padding: '4px 10px', fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>{t}</span>)}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.15)' }}>
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)' }}>Gesamtpreis</span>
        <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 22, fontWeight: 900, color: '#fff' }}>{config.price.toFixed(2).replace('.', ',')} €</span>
      </div>
    </div>
  )
}

function SLabel({ text, color, className, style }: { text: string; color: string; className?: string; style?: React.CSSProperties }) {
  return <p className={className} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 11, fontWeight: 700, color, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '20px 0 10px', ...style }}>{text}</p>
}

function WaIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zm-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884zm8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
    </svg>
  )
}

// ─── Style helpers ─────────────────────────────────────────────────────────────

const btnPrimary: React.CSSProperties = {
  display: 'inline-block', padding: '14px 28px',
  background: 'linear-gradient(135deg,#22c55e,#16a34a)',
  borderRadius: 16, textDecoration: 'none',
  fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 15, fontWeight: 800,
  color: '#fff', boxShadow: '0 6px 24px rgba(34,197,94,0.40)',
}

function card(surface: string, shadow: string, border: string): React.CSSProperties {
  return { background: surface, borderRadius: 20, padding: 20, boxShadow: shadow, border: `1px solid ${border}` }
}
function cardTitle(text: string): React.CSSProperties {
  return { fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 15, fontWeight: 800, color: text, marginBottom: 16 }
}
function inputLabel(color: string): React.CSSProperties {
  return { display: 'block', fontSize: 12, fontWeight: 600, color, marginBottom: 6, letterSpacing: '0.03em' }
}
function inputStyle(bg: string, borderColor: string, color: string): React.CSSProperties {
  return { width: '100%', padding: 14, background: bg, border: `1.5px solid ${borderColor}`, borderRadius: 10, fontFamily: 'Inter, sans-serif', fontSize: 16, fontWeight: 500, color, boxSizing: 'border-box', transition: 'border-color 0.2s' }
}
function iconBtn(bg: string, color: string): React.CSSProperties {
  return { width: 36, height: 36, background: bg, borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color, flexShrink: 0 }
}
