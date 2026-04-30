import { NextRequest, NextResponse } from 'next/server'
import { getTenant } from '@/lib/tenant'
import { createServerClient } from '@/lib/supabase'

const STAFF_COOKIE = '__gastro_staff'
function isAuthorized(request: NextRequest, slug: string): boolean {
  const token = request.cookies.get(STAFF_COOKIE)?.value
  if (!token) return false
  try { return Buffer.from(token, 'base64').toString('utf8').split(':')[0] === slug } catch { return false }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  if (!isAuthorized(request, slug)) return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 401 })
  const tenant = await getTenant(slug)
  if (!tenant) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('meso_shift_handovers')
    .select('id, created_by, shift_type, summary, open_tasks, incidents, inventory_notes, cash_register_amount, customer_feedback, status, created_at')
    .eq('restaurant_id', tenant.id)
    .order('created_at', { ascending: false })
    .limit(5)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ handovers: data ?? [] })
}
