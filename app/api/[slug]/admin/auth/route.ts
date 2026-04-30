import { NextRequest, NextResponse } from 'next/server'
import { getTenant } from '@/lib/tenant'
import { createServerClient } from '@/lib/supabase'

const SESSION_COOKIE = '__gastro_admin'

// ── Types ─────────────────────────────────────────────────────────────────────

export type AdminRole = 'owner' | 'admin' | 'staff'

// ── POST /api/[slug]/admin/auth — PIN prüfen, Session-Cookie setzen ───────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const tenant = await getTenant(slug)
  if (!tenant) return NextResponse.json({ ok: false, error: 'Restaurant nicht gefunden.' }, { status: 404 })

  let pin: string
  try {
    const body = await request.json()
    pin = String(body.pin ?? '')
  } catch {
    return NextResponse.json({ ok: false, error: 'Ungültiges Format.' }, { status: 400 })
  }

  // admin_pin + staff_pin aus DB lesen
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('restaurants')
    .select('admin_pin, staff_pin')
    .eq('id', tenant.id)
    .single()

  if (error) return NextResponse.json({ ok: false, error: 'Datenbankfehler.' }, { status: 500 })
  if (!data) return NextResponse.json({ ok: false, error: 'Restaurant-Daten nicht gefunden.' }, { status: 404 })

  const row = data as { admin_pin?: string; staff_pin?: string }
  const adminPin = row.admin_pin ?? '1234'
  const staffPin = row.staff_pin ?? null

  // Rolle bestimmen: owner-PIN → 'owner', staff-PIN → 'staff', sonst 401
  let role: AdminRole
  if (pin.trim() === adminPin.trim()) {
    role = 'owner'
  } else if (staffPin && pin.trim() === staffPin.trim()) {
    role = 'staff'
  } else {
    return NextResponse.json({ ok: false, error: 'Falscher PIN.' }, { status: 401 })
  }

  // Session-Token = base64(slug:pin:timestamp:role)
  const token = Buffer.from(`${slug}:${pin}:${Date.now()}:${role}`).toString('base64')

  const response = NextResponse.json({ ok: true, role })
  
  // ÄNDERUNG: path auf '/' gesetzt, damit das Cookie im gesamten Projekt gilt
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/', 
    maxAge: 60 * 60 * 12, // 12 Stunden
  })
  return response
}

// ── GET — Session prüfen ──────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const token = request.cookies.get(SESSION_COOKIE)?.value
  if (!token) return NextResponse.json({ ok: false }, { status: 401 })

  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8')
    const parts = decoded.split(':')
    const [tokenSlug] = parts
    if (tokenSlug !== slug) return NextResponse.json({ ok: false }, { status: 401 })
    // 4th segment is role (backward-compat: default 'owner' if absent)
    const role: AdminRole = (parts[3] as AdminRole | undefined) ?? 'owner'
    return NextResponse.json({ ok: true, role })
  } catch {
    return NextResponse.json({ ok: false }, { status: 401 })
  }
}

// ── DELETE — Logout ───────────────────────────────────────────────────────────

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const response = NextResponse.json({ ok: true })
  // ÄNDERUNG: Auch hier path auf '/' setzen
  response.cookies.delete({ name: SESSION_COOKIE, path: '/' })
  return response
}
