import { NextRequest, NextResponse } from 'next/server'
import { getTenant } from '@/lib/tenant'
import { createServerClient } from '@/lib/supabase'

const SESSION_COOKIE = '__gastro_admin'

function isAuthorized(request: NextRequest, slug: string): boolean {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  if (!token) return false
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8')
    const [tokenSlug] = decoded.split(':')
    return tokenSlug === slug
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
  if (!tenant) return NextResponse.json({ error: 'Nicht gefunden.' }, { status: 404 })

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('restaurant_news')
    .select('id, title, body, is_published, published_at, created_at')
    .eq('restaurant_id', tenant.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ news: data ?? [] })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  if (!isAuthorized(request, slug))
    return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 401 })

  const tenant = await getTenant(slug)
  if (!tenant) return NextResponse.json({ error: 'Nicht gefunden.' }, { status: 404 })

  const body = await request.json() as { title: string; body?: string; is_published?: boolean }
  if (!body.title?.trim()) return NextResponse.json({ error: 'Titel fehlt.' }, { status: 400 })

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('restaurant_news')
    .insert({
      restaurant_id: tenant.id,
      title: body.title.trim(),
      body: body.body ?? null,
      is_published: body.is_published ?? false,
      published_at: body.is_published ? new Date().toISOString() : null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ news: data }, { status: 201 })
}
