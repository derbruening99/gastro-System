/**
 * DEPRECATED — diese Route ist veraltet.
 *
 * Alte URL: /order?r=slug
 * Neue URL: /[slug]/order
 *
 * Redirect auf neue Struktur für Abwärtskompatibilität.
 */
import { redirect } from 'next/navigation'

export default async function LegacyOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ r?: string; t?: string }>
}) {
  const { r: slug, t: table } = await searchParams

  if (slug) {
    const target = table ? `/${slug}/order?t=${table}` : `/${slug}/order`
    redirect(target)
  }

  redirect('/')
}
