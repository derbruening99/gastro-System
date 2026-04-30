import { NextRequest, NextResponse } from 'next/server'
import { getTenant } from '@/lib/tenant'
import { createServerClient } from '@/lib/supabase'

const STAFF_COOKIE = '__gastro_staff'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const token = request.cookies.get(STAFF_COOKIE)?.value
  if (!token) return NextResponse.json({ ok: false }, { status: 401 })
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8')
    const parts = decoded.split(':')
    if (parts[0] !== slug) return NextResponse.json({ ok: false }, { status: 401 })
    return NextResponse.json({ ok: true, name: parts[3] ?? 'Mitarbeiter' })
  } catch {
    return NextResponse.json({ ok: false }, { status: 401 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const tenant = await getTenant(slug)
  if (!tenant) return NextResponse.json({ error: 'Restaurant nicht gefunden.' }, { status: 404 })

  const body = await request.json() as { pin: string; name: string }
  if (!body.pin?.trim()) return NextResponse.json({ error: 'PIN fehlt.' }, { status: 400 })
  if (!body.name?.trim()) return NextResponse.json({ error: 'Name fehlt.' }, { status: 400 })

  const supabase = createServerClient()
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('staff_pin')
    .eq('id', tenant.id)
    .single()

  const validPin = restaurant?.staff_pin
  if (!validPin || body.pin.trim() !== validPin) {
    return NextResponse.json({ error: 'Falscher PIN.' }, { status: 401 })
  }

  const token = Buffer.from(
    `${slug}:${body.pin}:${Date.now()}:${body.name.trim()}`
  ).toString('base64')

  const res = NextResponse.json({ ok: true, name: body.name.trim() })
  res.cookies.set(STAFF_COOKIE, token, {
    httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 12,
  })
  return res
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  void params
  const res = NextResponse.json({ ok: true })
  res.cookies.set(STAFF_COOKIE, '', { maxAge: 0, path: '/' })
  return res
}
