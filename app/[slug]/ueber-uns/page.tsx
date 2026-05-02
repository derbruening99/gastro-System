import { notFound, redirect } from 'next/navigation'
import { getTenant } from '@/lib/tenant'

export default async function UberUnsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const tenant = await getTenant(slug)
  if (!tenant) notFound()

  return redirect(`/${slug}/unser-laden`)
}
