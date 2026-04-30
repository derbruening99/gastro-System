import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getSession, getCustomerProfile, getCustomerOrders, getLastOrder } from '@/lib/auth'
import { getTenant } from '@/lib/tenant'
import { createServerClient } from '@/lib/supabase'
import { KontoClient } from './konto-client'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const tenant = await getTenant(slug)
  return { title: `Mein Bereich — ${tenant?.name ?? slug}` }
}

export default async function KontoPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  // ── Auth-Check ────────────────────────────────────────────────────────────
  const user = await getSession()
  if (!user) redirect(`/${slug}/auth`)

  const tenant = await getTenant(slug)
  if (!tenant) redirect(`/${slug}`)

  let profile = await getCustomerProfile(tenant.id, user.id)

  // Kein Profil → on-the-fly anlegen
  if (!profile) {
    const db = createServerClient()
    const phone = user.email.includes('@gastro-app.com')
      ? '+' + user.email.replace('@gastro-app.com', '')
      : null

    const { data: newCustomer } = await db
      .from('gastro_customers')
      .upsert(
        { restaurant_id: tenant.id, user_id: user.id, phone },
        { onConflict: 'restaurant_id,user_id', ignoreDuplicates: false }
      )
      .select('id')
      .single()

    if (newCustomer?.id) {
      await db.from('gastro_stamp_cards').upsert(
        { restaurant_id: tenant.id, customer_id: newCustomer.id, current_stamps: 0, total_stamps: 0, redeemed_rewards: 0, stamps_for_reward: 8 },
        { onConflict: 'restaurant_id,customer_id', ignoreDuplicates: true }
      )
    }

    profile = await getCustomerProfile(tenant.id, user.id)
    if (!profile) redirect(`/${slug}/auth`)
  }

  const [orders, lastOrder] = await Promise.all([
    getCustomerOrders(tenant.id, profile!.customer.id, 10),
    getLastOrder(tenant.id, profile!.customer.id),
  ])

  const stamps = profile!.stampCard?.current_stamps ?? 0
  const totalStamps = profile!.stampCard?.total_stamps ?? 0
  const rewards = profile!.stampCard?.redeemed_rewards ?? 0
  const displayName = profile!.customer.name ?? profile!.customer.phone ?? 'Gast'

  return (
    <KontoClient
      slug={slug}
      tenantName={tenant.name}
      tenantPhone={tenant.phone ?? null}
      displayName={displayName}
      stamps={stamps}
      totalStamps={totalStamps}
      rewards={rewards}
      orders={orders}
      lastOrder={lastOrder}
    />
  )
}
