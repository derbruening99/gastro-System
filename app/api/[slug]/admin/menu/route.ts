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
  if (!tenant) return NextResponse.json({ error: 'Restaurant nicht gefunden.' }, { status: 404 })

  const supabase = createServerClient()

  const [{ data: categories }, { data: items }, { data: upsells }] = await Promise.all([
    supabase
      .from('menu_categories')
      .select('id, name, sort_order, is_active')
      .eq('restaurant_id', tenant.id)
      .order('sort_order', { ascending: true }),
    supabase
      .from('menu_items')
      .select('id, category_id, name, description, price, is_active, sort_order, image_url')
      .eq('restaurant_id', tenant.id)
      .order('sort_order', { ascending: true }),
    supabase
      .from('upsells')
      .select('id, label, price, is_active, sort_order, image_url')
      .eq('restaurant_id', tenant.id)
      .order('sort_order', { ascending: true }),
  ])

  return NextResponse.json({ categories: categories ?? [], items: items ?? [], upsells: upsells ?? [] })
}

// PATCH: Toggle item is_active
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  if (!isAuthorized(request, slug))
    return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 401 })

  const tenant = await getTenant(slug)
  if (!tenant) return NextResponse.json({ error: 'Restaurant nicht gefunden.' }, { status: 404 })

  const body = await request.json() as { id: string; is_active: boolean; type: 'item' | 'category' }
  const supabase = createServerClient()

  const table = body.type === 'category' ? 'menu_categories' : 'menu_items'
  const { error } = await supabase
    .from(table)
    .update({ is_active: body.is_active })
    .eq('id', body.id)
    .eq('restaurant_id', tenant.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// POST: Create new category, item, or upsell
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
    type: 'category' | 'item' | 'upsell'
    data: Record<string, unknown>
  }

  const supabase = createServerClient()

  try {
    if (body.type === 'category') {
      const { name, sort_order } = body.data as { name: string; sort_order?: number }

      if (!name) {
        return NextResponse.json({ error: 'Kategoriename erforderlich.' }, { status: 400 })
      }

      // Auto-calculate sort_order if not provided
      let finalSortOrder = sort_order
      if (finalSortOrder === undefined) {
        const { data: categories } = await supabase
          .from('menu_categories')
          .select('sort_order')
          .eq('restaurant_id', tenant.id)
          .order('sort_order', { ascending: false })
          .limit(1)

        finalSortOrder = (categories?.[0]?.sort_order ?? -1) + 1
      }

      const { data, error } = await supabase
        .from('menu_categories')
        .insert({
          restaurant_id: tenant.id,
          name,
          sort_order: finalSortOrder,
          is_active: true,
        })
        .select()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json(data?.[0], { status: 201 })
    }

    if (body.type === 'item') {
      const { category_id, name, description, price, sort_order, image_url } = body.data as {
        category_id: string
        name: string
        description?: string
        price: number
        sort_order?: number
        image_url?: string
      }

      if (!category_id || !name || price === undefined) {
        return NextResponse.json(
          { error: 'Kategorie-ID, Name und Preis erforderlich.' },
          { status: 400 },
        )
      }

      // Verify category belongs to this tenant
      const { data: categoryCheck } = await supabase
        .from('menu_categories')
        .select('id')
        .eq('id', category_id)
        .eq('restaurant_id', tenant.id)

      if (!categoryCheck || categoryCheck.length === 0) {
        return NextResponse.json({ error: 'Kategorie nicht gefunden.' }, { status: 404 })
      }

      // Auto-calculate sort_order if not provided
      let finalSortOrder = sort_order
      if (finalSortOrder === undefined) {
        const { data: items } = await supabase
          .from('menu_items')
          .select('sort_order')
          .eq('restaurant_id', tenant.id)
          .order('sort_order', { ascending: false })
          .limit(1)

        finalSortOrder = (items?.[0]?.sort_order ?? -1) + 1
      }

      const { data, error } = await supabase
        .from('menu_items')
        .insert({
          restaurant_id: tenant.id,
          category_id,
          name,
          description: description ?? null,
          price,
          sort_order: finalSortOrder,
          image_url: image_url ?? null,
          is_active: true,
        })
        .select()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json(data?.[0], { status: 201 })
    }

    if (body.type === 'upsell') {
      const { label, price, sort_order, image_url } = body.data as {
        label: string
        price: number
        sort_order?: number
        image_url?: string
      }

      if (!label || price === undefined) {
        return NextResponse.json({ error: 'Label und Preis erforderlich.' }, { status: 400 })
      }

      // Auto-calculate sort_order if not provided
      let finalSortOrder = sort_order
      if (finalSortOrder === undefined) {
        const { data: upsells } = await supabase
          .from('upsells')
          .select('sort_order')
          .eq('restaurant_id', tenant.id)
          .order('sort_order', { ascending: false })
          .limit(1)

        finalSortOrder = (upsells?.[0]?.sort_order ?? -1) + 1
      }

      const { data, error } = await supabase
        .from('upsells')
        .insert({
          restaurant_id: tenant.id,
          label,
          price,
          sort_order: finalSortOrder,
          image_url: image_url ?? null,
          is_active: true,
        })
        .select()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json(data?.[0], { status: 201 })
    }

    return NextResponse.json({ error: 'Ungültiger Typ.' }, { status: 400 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unbekannter Fehler'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// PUT: Update existing category, item, or upsell
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
    type: 'category' | 'item' | 'upsell'
    id: string
    data: Record<string, unknown>
  }

  if (!body.id) {
    return NextResponse.json({ error: 'ID erforderlich.' }, { status: 400 })
  }

  const supabase = createServerClient()

  try {
    if (body.type === 'category') {
      const { name, sort_order, is_active } = body.data as {
        name?: string
        sort_order?: number
        is_active?: boolean
      }

      const updateData: Record<string, unknown> = {}
      if (name !== undefined) updateData.name = name
      if (sort_order !== undefined) updateData.sort_order = sort_order
      if (is_active !== undefined) updateData.is_active = is_active

      if (Object.keys(updateData).length === 0) {
        return NextResponse.json({ error: 'Keine Felder zum Aktualisieren.' }, { status: 400 })
      }

      const { data, error } = await supabase
        .from('menu_categories')
        .update(updateData)
        .eq('id', body.id)
        .eq('restaurant_id', tenant.id)
        .select()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      if (!data || data.length === 0) {
        return NextResponse.json({ error: 'Kategorie nicht gefunden.' }, { status: 404 })
      }
      return NextResponse.json(data[0])
    }

    if (body.type === 'item') {
      const { name, description, price, category_id, sort_order, is_active, image_url } =
        body.data as {
          name?: string
          description?: string
          price?: number
          category_id?: string
          sort_order?: number
          is_active?: boolean
          image_url?: string
        }

      const updateData: Record<string, unknown> = {}
      if (name !== undefined) updateData.name = name
      if (description !== undefined) updateData.description = description
      if (price !== undefined) updateData.price = price
      if (category_id !== undefined) updateData.category_id = category_id
      if (sort_order !== undefined) updateData.sort_order = sort_order
      if (is_active !== undefined) updateData.is_active = is_active
      if (image_url !== undefined) updateData.image_url = image_url

      if (Object.keys(updateData).length === 0) {
        return NextResponse.json({ error: 'Keine Felder zum Aktualisieren.' }, { status: 400 })
      }

      // If changing category, verify it belongs to this tenant
      if (category_id !== undefined) {
        const { data: categoryCheck } = await supabase
          .from('menu_categories')
          .select('id')
          .eq('id', category_id)
          .eq('restaurant_id', tenant.id)

        if (!categoryCheck || categoryCheck.length === 0) {
          return NextResponse.json({ error: 'Kategorie nicht gefunden.' }, { status: 404 })
        }
      }

      const { data, error } = await supabase
        .from('menu_items')
        .update(updateData)
        .eq('id', body.id)
        .eq('restaurant_id', tenant.id)
        .select()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      if (!data || data.length === 0) {
        return NextResponse.json({ error: 'Menüelement nicht gefunden.' }, { status: 404 })
      }
      return NextResponse.json(data[0])
    }

    if (body.type === 'upsell') {
      const { label, price, sort_order, is_active, image_url } = body.data as {
        label?: string
        price?: number
        sort_order?: number
        is_active?: boolean
        image_url?: string
      }

      const updateData: Record<string, unknown> = {}
      if (label !== undefined) updateData.label = label
      if (price !== undefined) updateData.price = price
      if (sort_order !== undefined) updateData.sort_order = sort_order
      if (is_active !== undefined) updateData.is_active = is_active
      if (image_url !== undefined) updateData.image_url = image_url

      if (Object.keys(updateData).length === 0) {
        return NextResponse.json({ error: 'Keine Felder zum Aktualisieren.' }, { status: 400 })
      }

      const { data, error } = await supabase
        .from('upsells')
        .update(updateData)
        .eq('id', body.id)
        .eq('restaurant_id', tenant.id)
        .select()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      if (!data || data.length === 0) {
        return NextResponse.json({ error: 'Zusatzoption nicht gefunden.' }, { status: 404 })
      }
      return NextResponse.json(data[0])
    }

    return NextResponse.json({ error: 'Ungültiger Typ.' }, { status: 400 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unbekannter Fehler'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// DELETE: Delete category, item, or upsell
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  if (!isAuthorized(request, slug))
    return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 401 })

  const tenant = await getTenant(slug)
  if (!tenant) return NextResponse.json({ error: 'Restaurant nicht gefunden.' }, { status: 404 })

  const body = await request.json() as {
    type: 'category' | 'item' | 'upsell'
    id: string
  }

  if (!body.id) {
    return NextResponse.json({ error: 'ID erforderlich.' }, { status: 400 })
  }

  const supabase = createServerClient()

  try {
    if (body.type === 'category') {
      // Check if category has items
      const { data: items } = await supabase
        .from('menu_items')
        .select('id')
        .eq('category_id', body.id)
        .eq('restaurant_id', tenant.id)

      if (items && items.length > 0) {
        return NextResponse.json(
          { error: 'Kategorie kann nicht gelöscht werden, da sie noch Menüelemente enthält.' },
          { status: 400 },
        )
      }

      const { error } = await supabase
        .from('menu_categories')
        .delete()
        .eq('id', body.id)
        .eq('restaurant_id', tenant.id)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }

    if (body.type === 'item') {
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', body.id)
        .eq('restaurant_id', tenant.id)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }

    if (body.type === 'upsell') {
      const { error } = await supabase
        .from('upsells')
        .delete()
        .eq('id', body.id)
        .eq('restaurant_id', tenant.id)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Ungültiger Typ.' }, { status: 400 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unbekannter Fehler'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
