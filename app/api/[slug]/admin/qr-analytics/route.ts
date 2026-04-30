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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  if (!isAuthorized(request, slug))
    return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 401 })

  const tenant = await getTenant(slug)
  if (!tenant) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const period = request.nextUrl.searchParams.get('period') || 'week'

  let dateFilter: string
  const now = new Date()
  if (period === 'today') {
    dateFilter = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  } else if (period === 'week') {
    const d = new Date(now); d.setDate(d.getDate() - 7)
    dateFilter = d.toISOString()
  } else if (period === 'month') {
    const d = new Date(now); d.setMonth(d.getMonth() - 1)
    dateFilter = d.toISOString()
  } else {
    dateFilter = '2020-01-01T00:00:00Z'
  }

  const supabase = createServerClient()
  const rid = tenant.id

  // All scans in period
  const { data: scans } = await supabase
    .from('qr_scans')
    .select('id, source_type, source_label, table_number, scanned_at, converted, order_id')
    .eq('restaurant_id', rid)
    .gte('scanned_at', dateFilter)
    .order('scanned_at', { ascending: false })

  const all = scans || []
  const totalScans = all.length
  const conversions = all.filter(s => s.converted).length
  const conversionRate = totalScans > 0 ? Math.round((conversions / totalScans) * 100) / 100 : 0

  // Scans by source
  const sourceMap: Record<string, number> = {}
  for (const s of all) {
    sourceMap[s.source_type] = (sourceMap[s.source_type] || 0) + 1
  }
  const scansBySource = Object.entries(sourceMap).map(([source_type, count]) => ({ source_type, count }))

  // Scans by day
  const dayMap: Record<string, { count: number; conversions: number }> = {}
  for (const s of all) {
    const day = s.scanned_at.slice(0, 10)
    if (!dayMap[day]) dayMap[day] = { count: 0, conversions: 0 }
    dayMap[day].count++
    if (s.converted) dayMap[day].conversions++
  }
  const scansByDay = Object.entries(dayMap)
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // Top tables
  const tableMap: Record<number, number> = {}
  for (const s of all) {
    if (s.table_number) {
      tableMap[s.table_number] = (tableMap[s.table_number] || 0) + 1
    }
  }
  const topTables = Object.entries(tableMap)
    .map(([t, count]) => ({ table_number: Number(t), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // Recent scans (last 15)
  const recentScans = all.slice(0, 15).map(s => ({
    id: s.id,
    source_type: s.source_type,
    source_label: s.source_label,
    table_number: s.table_number,
    scanned_at: s.scanned_at,
    converted: s.converted,
  }))

  return NextResponse.json({
    totalScans,
    conversions,
    conversionRate,
    scansBySource,
    scansByDay,
    topTables,
    recentScans,
  })
}
