import { NextRequest, NextResponse } from 'next/server'
import { getTenant } from '@/lib/tenant'
import { createServerClient } from '@/lib/supabase'

const SESSION_COOKIE = '__gastro_admin'

function isAuthorized(request: NextRequest, slug: string): boolean {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  if (!token) return false
  try { return Buffer.from(token, 'base64').toString('utf8').split(':')[0] === slug }
  catch { return false }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  if (!isAuthorized(request, slug))
    return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 401 })
  const tenant = await getTenant(slug)
  if (!tenant) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('meso_shift_handovers')
    .select('*')
    .eq('restaurant_id', tenant.id)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ handovers: data ?? [] })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  if (!isAuthorized(request, slug))
    return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 401 })
  const tenant = await getTenant(slug)
  if (!tenant) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json() as {
    created_by: string; shift_type: string; summary: string
    open_tasks?: string; incidents?: string; inventory_notes?: string
    cash_register_amount?: number; customer_feedback?: string
  }

  if (!body.created_by || !body.summary || !body.shift_type) {
    return NextResponse.json({ error: 'Pflichtfelder: created_by, shift_type, summary' }, { status: 400 })
  }

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('meso_shift_handovers')
    .insert({
      restaurant_id: tenant.id,
      created_by: body.created_by,
      shift_type: body.shift_type,
      summary: body.summary,
      open_tasks: body.open_tasks || null,
      incidents: body.incidents || null,
      inventory_notes: body.inventory_notes || null,
      cash_register_amount: body.cash_register_amount || null,
      customer_feedback: body.customer_feedback || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ handover: data }, { status: 201 })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  if (!isAuthorized(request, slug))
    return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 401 })
  const tenant = await getTenant(slug)
  if (!tenant) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json() as { id: string; received_by?: string; status?: string }
  if (!body.id) return NextResponse.json({ error: 'ID erforderlich' }, { status: 400 })

  const supabase = createServerClient()
  const updateData: Record<string, unknown> = {}
  if (body.received_by) updateData.received_by = body.received_by
  if (body.status === 'accepted') { updateData.status = 'accepted'; updateData.accepted_at = new Date().toISOString() }
  if (body.status === 'archived') updateData.status = 'archived'

  const { error } = await supabase
    .from('meso_shift_handovers')
    .update(updateData)
    .eq('id', body.id)
    .eq('restaurant_id', tenant.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
