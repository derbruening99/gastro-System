'use client'

/**
 * QR-Code Landing Page
 *
 * Wird über einen QR-Code an der Theke geöffnet.
 * Zeigt kurz eine Willkommens-Animation und leitet dann direkt
 * zum Bestellflow weiter — mit vorausgewähltem Modus "Vor Ort essen".
 *
 * URL-Parameter:
 *   ?table=4        → Tischnummer vorausgefüllt
 *   ?mode=pickup    → "Abholen" vorausgewählt (Standard: dine-in)
 *   ?mode=kustomizer → direkt zum Kustomizer
 */

import { useEffect, useState } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { useTenant } from '@/contexts/tenant-context'

export default function QrLandingPage() {
  const params     = useParams()
  const search     = useSearchParams()
  const router     = useRouter()
  const tenant     = useTenant()
  const slug       = params.slug as string
  const mode       = search.get('mode') ?? 'dine-in'
  const table      = search.get('table') ?? ''
  const sourceType = search.get('source_type') ?? 'unknown'
  const sourceLabel = search.get('source_label') ?? ''
  const [count, setCount] = useState(3)
  const [tracked, setTracked] = useState(false)
  const [scanId, setScanId] = useState<string | null>(null)

  useEffect(() => {
    if (tracked) return
    // Determine source type from URL params
    let sType: 'table' | 'counter' | 'box' = 'table'
    let sLabel = sourceLabel || ''
    if (mode === 'pickup') { sType = 'counter'; sLabel = sLabel || 'Theke' }
    else if (mode === 'box' || sourceType === 'box') { sType = 'box'; sLabel = sLabel || 'Box' }
    else if (table) { sLabel = sLabel || `Tisch ${table}` }

    void fetch(`/api/${slug}/qr-scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_type: sType,
        source_label: sLabel,
        table_number: table ? Number(table) : null,
      }),
    })
      .then(r => r.json())
      .then(d => { if (d.scan_id) setScanId(d.scan_id) })
      .catch(() => { /* Tracking ist sekundär */ })
    setTracked(true)
  }, [tracked, slug, mode, table, sourceType, sourceLabel])

  // Countdown + redirect
  useEffect(() => {
    if (count <= 0) {
      if (mode === 'kustomizer') {
        router.replace(`/${slug}/kustomizer`)
      } else {
        const qs = new URLSearchParams({ mode })
        if (table) qs.set('table', table)
        if (scanId) qs.set('scan_id', scanId)
        router.replace(`/${slug}/order?${qs}`)
      }
      return
    }
    const t = setTimeout(() => setCount((c) => c - 1), 800)
    return () => clearTimeout(t)
  }, [count, slug, mode, table, router])

  const modeLabel =
    mode === 'pickup'     ? '🥡 Zum Abholen'
    : mode === 'delivery' ? '🛵 Lieferbestellung'
    : mode === 'kustomizer' ? '🥣 Bowl konfigurieren'
    : '🪑 Vor Ort bestellen'

  // Use tenant's primary color and name
  const gradientColor = tenant.primary_color || '#15803d'
  const lighterColor = tenant.primary_color ? adjustColorBrightness(tenant.primary_color, 0.2) : '#14532d'
  const darkerColor = tenant.primary_color ? adjustColorBrightness(tenant.primary_color, -0.2) : '#166534'

  return (
    <div style={{
      minHeight: '100vh',
      background: `linear-gradient(160deg, ${lighterColor} 0%, ${darkerColor} 40%, ${gradientColor} 100%)`,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Inter', system-ui, sans-serif",
      padding: 32, textAlign: 'center',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@700;800;900&family=Inter:wght@400;500;600&display=swap');
        @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
      `}</style>

      {/* Logo / bowl */}
      <div style={{ fontSize: 72, marginBottom: 24, animation: 'pulse 1.6s ease-in-out infinite' }}>🥣</div>

      {/* Brand */}
      <h1 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 32, fontWeight: 900, color: '#fff', marginBottom: 8 }}>
        {tenant.name}
      </h1>
      <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.75)', marginBottom: 40, animation: 'fadeIn 0.5s ease 0.2s both', opacity: 0 }}>
        {modeLabel}
        {table ? ` · Tisch ${table}` : ''}
      </p>

      {/* Countdown ring */}
      <div style={{ position: 'relative', width: 80, height: 80, marginBottom: 24 }}>
        <svg width="80" height="80" viewBox="0 0 80 80" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="6" />
          <circle cx="40" cy="40" r="34" fill="none" stroke={gradientColor} strokeWidth="6"
            strokeDasharray={`${2 * Math.PI * 34}`}
            strokeDashoffset={`${2 * Math.PI * 34 * (count / 3)}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.7s ease' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 24, fontWeight: 900, color: '#fff' }}>
          {count}
        </div>
      </div>

      <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.60)' }}>
        Weiterleitung in {count} Sekunde{count !== 1 ? 'n' : ''}…
      </p>

      {/* Manual skip */}
      <button
        onClick={() => setCount(0)}
        style={{ marginTop: 32, padding: '14px 28px', background: 'rgba(255,255,255,0.12)', border: '1.5px solid rgba(255,255,255,0.25)', borderRadius: 14, fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 15, fontWeight: 700, color: '#fff', cursor: 'pointer', backdropFilter: 'blur(8px)' }}
      >
        Jetzt bestellen →
      </button>

      {/* QR info for operators — hidden on customer phones */}
      <p style={{ marginTop: 48, fontSize: 11, color: 'rgba(255,255,255,0.30)', letterSpacing: '0.05em' }}>
        QR · {slug}{table ? ` · Tisch ${table}` : ''}
      </p>
    </div>
  )
}

/**
 * Helper to adjust a hex color's brightness
 * factor: positive = lighter, negative = darker
 */
function adjustColorBrightness(hex: string, factor: number): string {
  const num = parseInt(hex.slice(1), 16)
  const r = Math.max(0, Math.min(255, Math.round((num >> 16) + (factor > 0 ? 255 - (num >> 16) : (num >> 16)) * factor)))
  const g = Math.max(0, Math.min(255, Math.round(((num >> 8) & 255) + (factor > 0 ? 255 - ((num >> 8) & 255) : ((num >> 8) & 255)) * factor)))
  const b = Math.max(0, Math.min(255, Math.round((num & 255) + (factor > 0 ? 255 - (num & 255) : (num & 255)) * factor)))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}
