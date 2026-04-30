import { NextRequest, NextResponse } from 'next/server'
import { getTenant } from '@/lib/tenant'
import { createServerClient } from '@/lib/supabase'

const SESSION_COOKIE = '__gastro_admin'
const BUCKET = 'menu-images'

function isAuthorized(request: NextRequest, slug: string): boolean {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  if (!token) return false
  try {
    return Buffer.from(token, 'base64').toString('utf8').split(':')[0] === slug
  } catch { return false }
}

// POST: Upload Bild → gibt public URL zurück
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  if (!isAuthorized(request, slug))
    return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 401 })

  const tenant = await getTenant(slug)
  if (!tenant) return NextResponse.json({ error: 'Restaurant nicht gefunden.' }, { status: 404 })

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) return NextResponse.json({ error: 'Keine Datei.' }, { status: 400 })

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type))
      return NextResponse.json({ error: 'Nur JPEG, PNG oder WebP erlaubt.' }, { status: 400 })

    if (file.size > 5 * 1024 * 1024)
      return NextResponse.json({ error: 'Datei zu groß (max 5 MB).' }, { status: 400 })

    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const path = `${tenant.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const supabase = createServerClient()
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError)
      return NextResponse.json({ error: uploadError.message }, { status: 500 })

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)

    return NextResponse.json({ url: urlData.publicUrl }, { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload-Fehler'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// DELETE: Bild aus Storage löschen
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  if (!isAuthorized(request, slug))
    return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 401 })

  const tenant = await getTenant(slug)
  if (!tenant) return NextResponse.json({ error: 'Restaurant nicht gefunden.' }, { status: 404 })

  try {
    const body = await request.json() as { url: string }
    if (!body.url) return NextResponse.json({ error: 'URL fehlt.' }, { status: 400 })

    // Pfad aus URL extrahieren (nach /menu-images/)
    const marker = `/menu-images/`
    const idx = body.url.indexOf(marker)
    if (idx === -1) return NextResponse.json({ error: 'Ungültige URL.' }, { status: 400 })
    const path = body.url.slice(idx + marker.length)

    // Sicherheitscheck: Pfad muss mit tenant.id beginnen
    if (!path.startsWith(tenant.id))
      return NextResponse.json({ error: 'Zugriff verweigert.' }, { status: 403 })

    const supabase = createServerClient()
    const { error } = await supabase.storage.from(BUCKET).remove([path])
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Fehler'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
