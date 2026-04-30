// Types kommen aus dem zentralen Types-Modul
import { createServerClient } from '@/lib/supabase'
import type { MenuCategory, MenuItem, Upsell, ItemAllergen } from '@/lib/types'

/**
 * Lädt das vollständige Menü — serverseitig via Service Client.
 * Kein Leak von Credentials in den Browser.
 * Enthält Allergene pro Item aus item_ingredients + menu_ingredients.
 */
export async function getMenuByRestaurant(restaurantId: string): Promise<MenuCategory[]> {
  const supabase = createServerClient()

  const [{ data: categories }, { data: items }, { data: ingredients }] = await Promise.all([
    supabase
      .from('menu_categories')
      .select('id, name, name_en, name_tr, sort_order')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .order('sort_order'),

    supabase
      .from('menu_items')
      .select('id, category_id, name, name_en, name_tr, description, price, image_url, sort_order')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .order('sort_order'),

    // Zutaten mit Allergeninfo via Join
    supabase
      .from('item_ingredients')
      .select('item_id, menu_ingredients(name, allergen_group)')
      .not('menu_ingredients', 'is', null),
  ])

  if (!categories) return []

  // Allergene pro item_id gruppieren
  type IngRow = { item_id: string; menu_ingredients: { name: string; allergen_group: string | null } | null }
  const allergenMap = new Map<string, ItemAllergen[]>()
  for (const row of (ingredients ?? []) as IngRow[]) {
    if (!row.menu_ingredients?.allergen_group) continue
    const list = allergenMap.get(row.item_id) ?? []
    list.push({ name: row.menu_ingredients.name, allergen_group: row.menu_ingredients.allergen_group })
    allergenMap.set(row.item_id, list)
  }

  return categories.map((cat) => ({
    ...cat,
    items: (items ?? [])
      .filter((item) => item.category_id === cat.id)
      .map(({ category_id: _cat, ...item }) => ({
        ...item,
        allergens: allergenMap.get(item.id) ?? [],
      } as MenuItem)),
  }))
}

/**
 * Lädt Upsells — serverseitig.
 */
export async function getUpsells(restaurantId: string): Promise<Upsell[]> {
  const supabase = createServerClient()

  const { data } = await supabase
    .from('upsells')
    .select('id, label, label_en, label_tr, price, image_url')
    .eq('restaurant_id', restaurantId)
    .eq('is_active', true)
    .order('sort_order')

  return (data ?? []) as Upsell[]
}

/**
 * Validiert Item- und Upsell-Preise für den Checkout — IMMER serverseitig.
 * Gibt Map<id → validierter Preis> zurück.
 * Nur Items/Upsells die wirklich zu diesem Restaurant gehören werden akzeptiert.
 */
export async function getValidatedPrices(
  restaurantId: string,
  itemIds: string[],
  upsellIds: string[],
): Promise<{ items: Map<string, number>; itemNames: Map<string, string>; upsells: Map<string, number> }> {
  const supabase = createServerClient()
  const EMPTY = ['__none__'] // verhindert leere IN-Clause

  const [{ data: items }, { data: upsells }] = await Promise.all([
    supabase
      .from('menu_items')
      .select('id, name, price')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .in('id', itemIds.length > 0 ? itemIds : EMPTY),

    supabase
      .from('upsells')
      .select('id, price')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .in('id', upsellIds.length > 0 ? upsellIds : EMPTY),
  ])

  return {
    items: new Map((items ?? []).map((i) => [i.id, Number(i.price)])),
    itemNames: new Map((items ?? []).map((i) => [i.id, i.name as string])),
    upsells: new Map((upsells ?? []).map((u) => [u.id, Number(u.price)])),
  }
}
