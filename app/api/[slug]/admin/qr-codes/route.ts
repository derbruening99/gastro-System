import { NextRequest, NextResponse } from 'next/server'
import { getTenant } from '@/lib/tenant'
import { createServerClient } from '@/lib/supabase'

const SESSION_COOKIE = '__gastro_admin'

function isAuthorized(request: NextRequest, slug: string): boolean {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  if (!token) return false
  try {
    return Buffer.from(token, 'base64').toString('utf8').split(':')[0] === slug
  } catch { return false }
}

// GET — alle QR-Codes für das Restaurant laden
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  if (!isAuthorized(request, slug))
    return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 401 })

  const tenant = await getTenant(slug)
  if (!tenant) return NextResponse.json({ error: 'Restaurant nicht gefunden.' }, { status: 404 })

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('qr_codes')
    .select('*')
    .eq('restaurant_id', tenant.id)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ qr_codes: data })
}

// POST — neuen QR-Code erstellen
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  if (!isAuthorized(request, slug))
    return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 401 })

  const tenant = await getTenant(slug)
  if (!tenant) return NextResponse.json({ error: 'Restaurant nicht gefunden.' }, { status: 404 })

  const body = await request.json() as {
    label: string
    source_type: 'table' | 'counter' | 'box'
    table_number?: number | null
  }

  if (!body.label?.trim()) return NextResponse.json({ error: 'Label ist erforderlich.' }, { status: 400 })
  if (!body.source_type || !['table', 'counter', 'box'].includes(body.source_type))
    return NextResponse.json({ error: 'Ungültiger source_type.' }, { status: 400 })

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('qr_codes')
    .insert({
      restaurant_id: tenant.id,
      label: body.label.trim(),
      source_type: body.source_type,
      table_number: body.source_type === 'table' ? (body.table_number ?? null) : null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ qr_code: data }, { status: 201 })
}

// PUT — QR-Code bearbeiten
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  if (!isAuthorized(request, slug))
    return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 401 })

  const tenant = await getTenant(slug)
  if (!tenant) return NextResponse.json({ error: 'Restaurant nicht gefunden.' }, { status: 404 })

  const body = await request.json() as {
    id: string
    label?: string
    source_type?: 'table' | 'counter' | 'box'
    table_number?: number | null
    is_active?: boolean
  }

  if (!body.id) return NextResponse.json({ error: 'ID ist erforderlich.' }, { status: 400 })

  const updates: Record<string, unknown> = {}
  if (body.label !== undefined) updates.label = body.label.trim()
  if (body.source_type !== undefined) updates.source_type = body.source_type
  if (body.table_number !== undefined) updates.table_number = body.table_number
  if (body.is_active !== undefined) updates.is_active = body.is_active

  if (Object.keys(updates).length === 0)
    return NextResponse.json({ error: 'Keine Änderungen.' }, { status: 400 })

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('qr_codes')
    .update(updates)
    .eq('id', body.id)
    .eq('restaurant_id', tenant.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ qr_code: data })
}

// DELETE — QR-Code löschen
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  if (!isAuthorized(request, slug))
    return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 401 })

  const tenant = await getTenant(slug)
  if (!tenant) return NextResponse.json({ error: 'Restaurant nicht gefunden.' }, { status: 404 })

  const { id } = await request.json() as { id: string }
  if (!id) return NextResponse.json({ error: 'ID ist erforderlich.' }, { status: 400 })

  const supabase = createServerClient()
  const { error } = await supabase
    .from('qr_codes')
    .delete()
    .eq('id', id)
    .eq('restaurant_id', tenant.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
