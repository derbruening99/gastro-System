import { createServerClient } from '@/lib/supabase'
import type { Restaurant } from '@/lib/types'
import { cache } from 'react'

/**
 * Lädt einen Tenant anhand seines Slugs — serverseitig, gecached per Request.
 *
 * `cache()` von React dedupliziert identische Aufrufe innerhalb eines
 * Server-Render-Zyklus. D.h. layout.tsx und page.tsx können beide
 * getTenant() aufrufen — DB wird nur einmal getroffen.
 *
 * Gibt null zurück wenn:
 * - Slug nicht existiert
 * - Tenant is_active = false
 */
export const getTenant = cache(async (slug: string): Promise<Restaurant | null> => {
  // Slug sanitizen: nur alphanumerisch + Bindestriche erlaubt
  if (!/^[a-z0-9-]+$/.test(slug)) return null

  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('restaurants')
    .select('id, name, slug, primary_color, logo_url, address, phone, default_lang, is_demo, is_active')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (error || !data) return null

  return data as Restaurant
})
