import { notFound } from 'next/navigation'
import { getTenant } from '@/lib/tenant'
import { AdminClient } from './admin-client'

export default async function AdminPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const tenant = await getTenant(slug)
  if (!tenant) notFound()

  return <AdminClient slug={slug} tenantName={tenant.name} />
}
