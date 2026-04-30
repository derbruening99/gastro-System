import { getTenant } from '@/lib/tenant'
import { notFound } from 'next/navigation'
import { MesoClient } from './meso-client'

export default async function MesoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const tenant = await getTenant(slug)
  if (!tenant) notFound()
  return <MesoClient slug={slug} tenantName={tenant.name} />
}
