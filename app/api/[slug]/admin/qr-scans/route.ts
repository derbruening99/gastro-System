import { NextRequest, NextResponse } from 'next/server'
import { getTenant } from '@/lib/tenant'
import { createServerClient } from '@/lib/supabase'

const SESSION_COOKIE = '__gastro_admin'
function isAuthorized(request: NextRequest, slug: string): boolean {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  if (!token) return false
  try { return Buffer.from(token, 'base64').toString('utf8').split(':')[0] === slug } catch { return false }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  if (!isAuthorized(request, slug)) return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 401 })

  const tenant = await getTenant(slug)
  if (!tenant) return NextResponse.json({ error: 'Restaurant nicht gefunden.' }, { status: 404 })

  const supabase = createServerClient()
  const [{ count, error: countError }, { data, error }] = await Promise.all([
    supabase.from('qr_scans').select('*', { count: 'exact', head: true }).eq('restaurant_id', tenant.id),
    supabase.from('qr_scans')
      .select('id, source_type, source_label, table_number, scanned_at')
      .eq('restaurant_id', tenant.id)
      .order('scanned_at', { ascending: false })
      .limit(10),
  ])

  if (countError || error) {
    const message = countError?.message ?? error?.message ?? 'Serverfehler.'
    return NextResponse.json({ error: message }, { status: 500 })
  }

  const sourceCounts = (data ?? []).reduce<Record<string, number>>((acc, row) => {
    acc[row.source_type] = (acc[row.source_type] ?? 0) + 1
    return acc
  }, {})

  return NextResponse.json({ total: count ?? 0, sourceCounts, scans: data ?? [] })
}
