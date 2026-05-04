'use client'

import { useState, useTransition, use } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'
import { useTenant } from '@/contexts/tenant-context'
import { SiteNav } from '../landing/site-nav'

// SSR-fähiger Browser-Client — speichert Session in Cookies, nicht localStorage
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Props = { params: Promise<{ slug: string }> }
type Tab = 'login' | 'register'

function normalizePhone(raw: string): string {
  let p = raw.replace(/\s+/g, '').replace(/-/g, '')
  if (p.startsWith('0')) p = '+49' + p.slice(1)
  if (!p.startsWith('+')) p = '+49' + p
  return p
}

function phoneToEmail(phone: string): string {
  return normalizePhone(phone).replace('+', '') + '@gastro-app.com'
}

function isValidPhone(p: string): boolean {
  const cleaned = p.replace(/\s+/g, '').replace(/-/g, '')
  return /^(\+?\d{7,15})$/.test(cleaned)
}

export default function AuthPage({ params }: Props) {
  const { slug } = use(params)
  const tenant = useTenant()

  const [tab, setTab] = useState<Tab>('login')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function switchTab(t: Tab) {
    setTab(t)
    setError(null)
  }

  // ── Login ────────────────────────────────────────────────────────────────────
  function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!isValidPhone(phone)) {
      setError('Bitte eine gültige Handynummer eingeben.')
      return
    }
    if (!password) return

    startTransition(async () => {
      const { error: err } = await supabase.auth.signInWithPassword({
        email: phoneToEmail(phone),
        password,
      })
      if (err) {
        setError('Nummer oder Passwort falsch. Noch kein Konto? Jetzt registrieren.')
        return
      }
      window.location.href = `/${slug}/konto`
    })
  }

  // ── Registrierung ────────────────────────────────────────────────────────────
  function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!isValidPhone(phone)) {
      setError('Bitte eine gültige Handynummer eingeben.')
      return
    }
    if (password.length < 6) {
      setError('Passwort muss mindestens 6 Zeichen haben.')
      return
    }

    startTransition(async () => {
      // Server-seitige Registrierung (Service Role, sofort bestätigt)
      const res = await fetch(`/api/${slug}/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), password, name: name.trim() }),
      })
      const body = await res.json().catch(() => ({}))

      if (!res.ok && res.status !== 200) {
        setError(body.error ?? 'Registrierung fehlgeschlagen.')
        return
      }

      // Direkt einloggen
      const { error: loginErr } = await supabase.auth.signInWithPassword({
        email: phoneToEmail(phone),
        password,
      })
      if (loginErr) {
        setError('Konto erstellt — bitte jetzt anmelden.')
        switchTab('login')
        return
      }
      window.location.href = `/${slug}/konto`
    })
  }

  return (
    <div className="odis-landing odis-customer-site has-glass-nav" style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      background: 'radial-gradient(50% 58% at 82% 0%, rgba(255,167,38,0.07), transparent 70%), radial-gradient(42% 58% at 8% 92%, rgba(76,175,80,0.07), transparent 72%), linear-gradient(180deg, #0a0d0a 0%, #0e1410 46%, #0a0d0a 100%)',
    }}>
      <SiteNav slug={slug} restaurantName={tenant.name} isLoggedIn={false} />
      <div style={{ maxWidth: 440, margin: '0 auto', padding: '132px 20px 48px', width: '100%' }}>

        {/* Zurück */}
        <Link href={`/${slug}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none', color: 'rgba(255,255,255,0.58)', fontSize: 14, fontWeight: 600, marginBottom: 28 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Zurück
        </Link>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'inline-flex', background: 'rgba(255,167,38,0.12)', color: 'rgba(255,167,38,0.96)', border: '1px solid rgba(255,167,38,0.22)', fontSize: 10, fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase', padding: '4px 12px', borderRadius: 99, marginBottom: 14 }}>
            Mein Bereich
          </div>
          <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 30, fontWeight: 900, color: '#fff', lineHeight: 1.08, letterSpacing: '-0.02em', marginBottom: 10, textShadow: '0 2px 24px rgba(0,0,0,0.35)' }}>
            Dein Bowl-Konto,<br /><span style={{ color: 'rgba(255,244,207,0.96)' }}>ohne Umwege.</span>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.64)', fontSize: 14, lineHeight: 1.6 }}>
            Schnell anmelden, Stempel sammeln und deine Bestellungen im Blick behalten.
          </p>
        </div>

        <div style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 22,
          padding: 18,
          background: 'linear-gradient(180deg, rgba(255,255,255,0.075), rgba(255,255,255,0.032))',
          border: '1px solid rgba(255,255,255,0.10)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 14px 34px rgba(0,0,0,0.30)',
          backdropFilter: 'blur(12px) saturate(1.12)',
          WebkitBackdropFilter: 'blur(12px) saturate(1.12)',
        }}>
          <div style={{
            position: 'absolute',
            top: -2,
            left: 24,
            right: 24,
            height: 2,
            background: 'linear-gradient(90deg, transparent, rgba(255,167,38,0.82), transparent)',
            opacity: 0.72,
          }} />

        {/* Tabs */}
        <div style={{ display: 'flex', background: 'rgba(0,0,0,0.16)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 16, padding: 4, marginBottom: 18, gap: 4, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' }}>
          {(['login', 'register'] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => switchTab(t)}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 9, border: 'none', cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 14, fontWeight: 700, transition: 'all 0.18s',
                background: tab === t ? 'rgba(255,167,38,0.13)' : 'transparent',
                color: tab === t ? 'rgba(255,244,207,0.96)' : 'rgba(255,255,255,0.56)',
                boxShadow: tab === t ? 'inset 0 0 0 1px rgba(255,167,38,0.22)' : 'none',
              }}
            >
              {t === 'login' ? 'Anmelden' : 'Registrieren'}
            </button>
          ))}
        </div>

        {/* ── Login-Tab ────────────────────────────────────────────── */}
        {tab === 'login' && (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              type="tel"
              placeholder="Handynummer (z.B. 0151 12345678)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              autoComplete="tel"
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = '#22c55e')}
              onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.10)')}
            />
            <input
              type="password"
              placeholder="Passwort"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = '#22c55e')}
              onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.10)')}
            />

            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#b91c1c', fontWeight: 500, lineHeight: 1.5 }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={isPending} className="vip-cta-btn" style={btnStyle(isPending)}>
              {isPending ? 'Anmelden…' : 'Anmelden'}
            </button>

            <p style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: 13, marginTop: 4 }}>
              Noch kein Konto?{' '}
              <button type="button" onClick={() => switchTab('register')} style={linkBtnStyle}>
                Jetzt registrieren
              </button>
            </p>
          </form>
        )}

        {/* ── Register-Tab ─────────────────────────────────────────── */}
        {tab === 'register' && (
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              type="tel"
              placeholder="Handynummer (z.B. 0151 12345678)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              autoComplete="tel"
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = '#22c55e')}
              onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.10)')}
            />
            <input
              type="text"
              placeholder="Dein Name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = '#22c55e')}
              onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.10)')}
            />
            <input
              type="password"
              placeholder="Passwort wählen (min. 6 Zeichen)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = '#22c55e')}
              onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.10)')}
            />

            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#b91c1c', fontWeight: 500, lineHeight: 1.5 }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={isPending} className="vip-cta-btn" style={btnStyle(isPending)}>
              {isPending ? 'Konto anlegen…' : 'Konto anlegen & anmelden'}
            </button>

            <p style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: 13, marginTop: 4 }}>
              Schon ein Konto?{' '}
              <button type="button" onClick={() => switchTab('login')} style={linkBtnStyle}>
                Anmelden
              </button>
            </p>
          </form>
        )}
        </div>

        <p style={{ marginTop: 22, textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.42)', lineHeight: 1.5 }}>
          8 Bestellungen = 1 Gratis-Bowl. Deine Nummer reicht.
        </p>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '14px 16px', fontSize: 16,
  borderRadius: 14, border: '1px solid rgba(255,255,255,0.10)',
  background: 'rgba(255,255,255,0.055)', color: '#fff',
  outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.18s, background 0.18s',
}

const linkBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer',
  color: '#16a34a', fontWeight: 700, fontSize: 13, padding: 0,
}

function btnStyle(disabled: boolean): React.CSSProperties {
  return { opacity: disabled ? 0.7 : 1, cursor: disabled ? 'not-allowed' : 'pointer', border: 'none' }
}
