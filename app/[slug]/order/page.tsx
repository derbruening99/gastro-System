import { notFound } from 'next/navigation'
import { getTenant } from '@/lib/tenant'
import { getMenuByRestaurant, getUpsells } from '@/lib/menu'
import OrderClient from './order-client'

/**
 * Server Component — lädt alle Daten serverseitig, übergibt sie als Props.
 * Kein API-Call im Browser, kein Credentials-Leak, SSR-fähig.
 */
export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ t?: string; table?: string; scan_id?: string }>
}) {
  const { slug } = await params
  const { t, table: tableParam, scan_id } = await searchParams
  const table = t || tableParam

  // Tenant nochmal laden (via React cache → kein extra DB-Hit, layout hat gecacht)
  const tenant = await getTenant(slug)
  if (!tenant) notFound()

  // Menü + Upsells parallel laden
  const [menu, upsells] = await Promise.all([
    getMenuByRestaurant(tenant.id),
    getUpsells(tenant.id),
  ])

  return (
    <OrderClient
      tenant={tenant}
      menu={menu}
      upsells={upsells}
      table={table ?? null}
      scanId={scan_id ?? null}
    />
  )
}
