// ─── Core Domain Types ────────────────────────────────────────────────────────
// Single source of truth für alle Types im System.
// Importiere immer von hier — nie aus einzelnen Lib-Dateien.

export type Restaurant = {
  id: string
  name: string
  slug: string
  primary_color: string
  logo_url: string | null
  address: string | null
  phone: string | null
  default_lang: 'de' | 'en' | 'tr'
  is_demo: boolean
  is_active: boolean
}

export type MenuCategory = {
  id: string
  name: string
  name_en: string | null
  name_tr: string | null
  sort_order: number
  items: MenuItem[]
}

export type ItemAllergen = {
  name: string
  allergen_group: string
}

export type MenuItem = {
  id: string
  name: string
  name_en: string | null
  name_tr: string | null
  description: string | null
  description_en: string | null
  description_tr: string | null
  price: number
  image_url: string | null
  sort_order: number
  allergens: ItemAllergen[]   // aus item_ingredients + menu_ingredients befüllt
}

export type Upsell = {
  id: string
  label: string
  label_en: string | null
  label_tr: string | null
  price: number
  image_url: string | null
}

// ─── Cart Types ───────────────────────────────────────────────────────────────

export type CartUpsell = {
  id: string
  label: string
  price: number
}

export type CartItem = {
  cartKey: string        // unique key per cart entry (item_id + timestamp)
  item_id: string
  name: string
  price: number
  quantity: number
  upsells: CartUpsell[]
}

// ─── Order API Types ──────────────────────────────────────────────────────────

export type OrderPayload = {
  items: OrderItemPayload[]
  table_number: string | null
  lang: 'de' | 'en' | 'tr'
  notes?: string
  scan_id?: string   // QR-Scan-ID für Conversion-Tracking
}

export type OrderItemPayload = {
  item_id: string
  quantity: number
  upsell_ids: string[]
  notes?: string
}

export type OrderResponse =
  | { success: true; order_id: string; total: number; demo: boolean }
  | { success: false; error: string }

// ─── Language ─────────────────────────────────────────────────────────────────

export type Lang = 'de' | 'en' | 'tr'
