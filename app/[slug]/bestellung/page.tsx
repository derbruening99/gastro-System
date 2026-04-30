import { notFound } from 'next/navigation'
import { getTenant } from '@/lib/tenant'
import { BestellungClient } from './bestellung-client'

type OrderType = 'pickup' | 'dine-in' | 'delivery'

function parseMode(raw: string | undefined): OrderType | null {
  if (raw === 'pickup' || raw === 'dine-in' || raw === 'delivery') return raw
  return null
}

export default async function BestellungPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ mode?: string; table?: string }>
}) {
  const { slug } = await params
  const { mode, table } = await searchParams

  const tenant = await getTenant(slug)
  if (!tenant) notFound()

  return (
    <BestellungClient
      slug={slug}
      tenantName={tenant.name}
      tenantPhone={tenant.phone ?? null}
      tenantAddress={tenant.address ?? null}
      defaultOrderType={parseMode(mode)}
      defaultTable={table ?? null}
    />
  )
}
