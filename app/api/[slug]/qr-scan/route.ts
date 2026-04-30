import { NextRequest, NextResponse } from 'next/server'
import { getTenant } from '@/lib/tenant'
import { createServerClient } from '@/lib/supabase'
import { createHash } from 'crypto'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const tenant = await getTenant(slug)
  if (!tenant) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json() as {
    source_type: 'table' | 'counter' | 'box'
    source_label?: string
    table_number?: number
  }

  if (!body.source_type || !['table', 'counter', 'box'].includes(body.source_type)) {
    return NextResponse.json({ error: 'Invalid source_type' }, { status: 400 })
  }

  const ua = request.headers.get('user-agent') || null
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const ipHash = createHash('sha256').update(ip).digest('hex').slice(0, 16)

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('qr_scans')
    .insert({
      restaurant_id: tenant.id,
      source_type: body.source_type,
      source_label: body.source_label || null,
      table_number: body.table_number || null,
      user_agent: ua,
      ip_hash: ipHash,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ scan_id: data?.id })
}
