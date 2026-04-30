import { createClient } from '@supabase/supabase-js'
import { createServerClient as createSSRClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// ── Browser-Client (public, anon) ────────────────────────────────────────────
// Nur in 'use client' Komponenten verwenden
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON)

// ── Server-Client mit Service Role ───────────────────────────────────────────
// Für API Routes / Server Actions — keine Auth-Session, kein Cookie-Handling
export function createServerClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY not set')
  return createClient(SUPABASE_URL, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// ── SSR-Client mit Cookie-Handling ────────────────────────────────────────────
// Für Server Components / Route Handlers die Auth-Session benötigen
// Liest + schreibt Supabase-Auth-Cookies transparent
export async function createSupabaseSessionClient() {
  const cookieStore = await cookies()

  return createSSRClient(SUPABASE_URL, SUPABASE_ANON, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // Server Components können keine Cookies setzen — wird im Middleware behandelt
        }
      },
    },
  })
}

// ── Typen ─────────────────────────────────────────────────────────────────────
export type SupabaseSession = {
  user: {
    id: string
    email?: string
  }
} | null
