import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * POST /api/[slug]/auth
 * Server-seitige Registrierung:
 * 1. Supabase-Auth-User anlegen (sofort bestätigt, kein Mail-Versand)
 * 2. gastro_customers + gastro_stamp_cards anlegen
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const { phone, password, name } = await req.json()

    if (!phone || !password) {
      return NextResponse.json({ error: 'Telefonnummer und Passwort erforderlich.' }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Passwort muss mindestens 6 Zeichen haben.' }, { status: 400 })
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) {
      return NextResponse.json({ error: 'Serverkonfiguration fehlt.' }, { status: 500 })
    }

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Telefonnummer normalisieren → E.164
    const normalized = (() => {
      let p = phone.replace(/\s+/g, '').replace(/-/g, '')
      if (p.startsWith('0')) p = '+49' + p.slice(1)
      if (!p.startsWith('+')) p = '+49' + p
      return p
    })()

    // Fake-Email für Supabase Auth (intern, nie sichtbar)
    const email = normalized.replace('+', '') + '@gastro-app.com'

    // ── 1. Auth-User anlegen ────────────────────────────────────────────────
    const { data: authData, error: authErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // sofort bestätigt — kein E-Mail-Versand
      user_metadata: { name: name?.trim() || null, phone: normalized },
    })

    if (authErr) {
      // Nutzer existiert bereits → ignorieren, Login wird klappen
      if (
        authErr.message.toLowerCase().includes('already') ||
        authErr.message.toLowerCase().includes('exists') ||
        authErr.message.toLowerCase().includes('duplicate')
      ) {
        return NextResponse.json({ exists: true }, { status: 200 })
      }
      return NextResponse.json({ error: authErr.message }, { status: 400 })
    }

    const userId = authData.user.id

    // ── 2. Restaurant-ID anhand Slug ermitteln ──────────────────────────────
    const { data: restaurant } = await admin
      .from('restaurants')
      .select('id')
      .eq('slug', slug)
      .single()

    if (restaurant?.id) {
      const restaurantId = restaurant.id

      // ── 3. gastro_customers anlegen oder mit neuem user_id verknüpfen ────
      // Upsert auf phone-Constraint: wenn Nummer schon existiert → user_id updaten
      const { data: customer } = await admin
        .from('gastro_customers')
        .upsert(
          {
            restaurant_id: restaurantId,
            user_id: userId,
            name: name?.trim() || null,
            phone: normalized,
          },
          { onConflict: 'restaurant_id,phone', ignoreDuplicates: false }
        )
        .select('id')
        .single()

      // ── 4. Stempelkarte anlegen (falls noch nicht vorhanden) ─────────────
      if (customer?.id) {
        await admin
          .from('gastro_stamp_cards')
          .upsert(
            {
              restaurant_id: restaurantId,
              customer_id: customer.id,
              current_stamps: 0,
              total_stamps: 0,
              redeemed_rewards: 0,
              stamps_for_reward: 8,
            },
            { onConflict: 'restaurant_id,customer_id', ignoreDuplicates: true }
          )
      }
    }

    return NextResponse.json({ id: userId }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Serverfehler.' }, { status: 500 })
  }
}
