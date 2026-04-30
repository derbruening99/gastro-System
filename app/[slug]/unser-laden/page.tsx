import { notFound } from 'next/navigation'
import { getTenant } from '@/lib/tenant'

export default async function UnserLadenPage({ params }: { params: { slug: string } }) {
  const tenant = await getTenant(params.slug)
  if (!tenant) notFound()

  const phoneHref = tenant.phone ? `tel:${tenant.phone.replace(/\D/g, '')}` : undefined
  const mapsHref = tenant.address
    ? `https://www.google.com/maps/search/${encodeURIComponent(tenant.address)}`
    : undefined

  return (
    <div className="site-page">
      <div className="site-page-inner">
        <p className="site-lead">Unser Laden in deiner Nähe</p>
        <h1>Besuche {tenant.name}</h1>
        <p>{tenant.address ?? 'Adresse nicht verfügbar'}</p>
        {phoneHref ? (
          <p>
            Telefon: <a href={phoneHref}>{tenant.phone}</a>
          </p>
        ) : null}
        {mapsHref ? (
          <p>
            <a href={mapsHref} target="_blank" rel="noreferrer noopener">
              Route planen</a>
          </p>
        ) : null}
        <h2>So findest du uns</h2>
        <p>
          Wir freuen uns auf deinen Besuch. Bestellungen kannst du direkt hier auf der
          Website oder per WhatsApp abgeben.
        </p>
      </div>
    </div>
  )
}
