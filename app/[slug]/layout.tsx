import { notFound } from 'next/navigation'
import { getTenant } from '@/lib/tenant'
import TenantProvider from '@/contexts/tenant-context'
import type { Metadata } from 'next'
import type { Viewport } from 'next'

// ─── Dynamische Metadata pro Tenant ───────────────────────────────────────────
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const tenant = await getTenant(slug)

  if (!tenant) return { title: 'Nicht gefunden' }

  return {
    title: tenant.name,
    description: `Bestell direkt bei ${tenant.name}`,
  }
}

export async function generateViewport({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Viewport> {
  const { slug } = await params
  const tenant = await getTenant(slug)

  return {
    themeColor: tenant?.primary_color ?? '#0f172a',
  }
}

// ─── Layout ───────────────────────────────────────────────────────────────────
export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  // Tenant laden — React cache() dedupliziert: DB wird nur einmal getroffen
  const tenant = await getTenant(slug)

  // Kein Tenant → 404 (next/navigation notFound wirft intern)
  if (!tenant) notFound()

  return (
    <TenantProvider tenant={tenant}>
      {children}
    </TenantProvider>
  )
}
