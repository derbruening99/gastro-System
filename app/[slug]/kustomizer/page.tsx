import { notFound } from 'next/navigation'
import { getTenant } from '@/lib/tenant'
import KustomizerClient from './kustomizer-client'

export default async function KustomizerPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const tenant = await getTenant(slug)
  if (!tenant) notFound()

  return <KustomizerClient tenant={tenant} />
}
