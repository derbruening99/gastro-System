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

// GET: Alle Zutaten des Restaurants + Zuordnungen zu Items
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

  const [{ data: ingredients }, { data: itemIngredients }] = await Promise.all([
    supabase
      .from('menu_ingredients')
      .select('id, name, allergen_group, is_active, created_at')
      .eq('restaurant_id', tenant.id)
      .order('name', { ascending: true }),
    supabase
      .from('item_ingredients')
      .select('id, item_id, ingredient_id')
      .in(
        'ingredient_id',
        // Subquery-Workaround: erst alle ingredient-IDs des Tenants holen
        (await supabase
          .from('menu_ingredients')
          .select('id')
          .eq('restaurant_id', tenant.id)).data?.map(r => r.id) ?? [],
      ),
  ])

  return NextResponse.json({ ingredients: ingredients ?? [], itemIngredients: itemIngredients ?? [] })
}

// POST: Neue Zutat erstellen  ODER  Zutat einem Item zuweisen
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
    action: 'create' | 'assign' | 'unassign'
    name?: string
    allergen_group?: string
    ingredient_id?: string
    item_id?: string
  }

  const supabase = createServerClient()

  if (body.action === 'create') {
    if (!body.name?.trim())
      return NextResponse.json({ error: 'Name erforderlich.' }, { status: 400 })

    const { data, error } = await supabase
      .from('menu_ingredients')
      .insert({
        restaurant_id: tenant.id,
        name: body.name.trim(),
        allergen_group: body.allergen_group?.trim() || null,
        is_active: true,
      })
      .select()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data?.[0], { status: 201 })
  }

  if (body.action === 'assign') {
    if (!body.ingredient_id || !body.item_id)
      return NextResponse.json({ error: 'ingredient_id und item_id erforderlich.' }, { status: 400 })

    // Verify ingredient belongs to this tenant
    const { data: check } = await supabase
      .from('menu_ingredients')
      .select('id')
      .eq('id', body.ingredient_id)
      .eq('restaurant_id', tenant.id)
    if (!check?.length)
      return NextResponse.json({ error: 'Zutat nicht gefunden.' }, { status: 404 })

    const { data, error } = await supabase
      .from('item_ingredients')
      .insert({ item_id: body.item_id, ingredient_id: body.ingredient_id })
      .select()

    if (error) {
      if (error.code === '23505') return NextResponse.json({ ok: true }) // already assigned
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(data?.[0], { status: 201 })
  }

  if (body.action === 'unassign') {
    if (!body.ingredient_id || !body.item_id)
      return NextResponse.json({ error: 'ingredient_id und item_id erforderlich.' }, { status: 400 })

    const { error } = await supabase
      .from('item_ingredients')
      .delete()
      .eq('item_id', body.item_id)
      .eq('ingredient_id', body.ingredient_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Ungültige Aktion.' }, { status: 400 })
}

// PUT: Zutat bearbeiten
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
    name?: string
    allergen_group?: string
    is_active?: boolean
  }

  if (!body.id) return NextResponse.json({ error: 'ID erforderlich.' }, { status: 400 })

  const supabase = createServerClient()
  const updateData: Record<string, unknown> = {}
  if (body.name !== undefined) updateData.name = body.name.trim()
  if (body.allergen_group !== undefined) updateData.allergen_group = body.allergen_group?.trim() || null
  if (body.is_active !== undefined) updateData.is_active = body.is_active

  const { data, error } = await supabase
    .from('menu_ingredients')
    .update(updateData)
    .eq('id', body.id)
    .eq('restaurant_id', tenant.id)
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data?.[0])
}

// DELETE: Zutat löschen
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  if (!isAuthorized(request, slug))
    return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 401 })

  const tenant = await getTenant(slug)
  if (!tenant) return NextResponse.json({ error: 'Restaurant nicht gefunden.' }, { status: 404 })

  const body = await request.json() as { id: string }
  if (!body.id) return NextResponse.json({ error: 'ID erforderlich.' }, { status: 400 })

  const supabase = createServerClient()

  // item_ingredients werden via ON DELETE CASCADE entfernt
  const { error } = await supabase
    .from('menu_ingredients')
    .delete()
    .eq('id', body.id)
    .eq('restaurant_id', tenant.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
