import { notFound } from 'next/navigation'
import { getTenant } from '@/lib/tenant'

export default async function KarrierePage({ params }: { params: { slug: string } }) {
  const tenant = await getTenant(params.slug)
  if (!tenant) notFound()

  return (
    <div className="site-page">
      <div className="site-page-inner">
        <p className="site-lead">Karriere bei {tenant.name}</p>
        <h1>Werde Teil unseres Teams</h1>
        <p>
          Du suchst einen Job mit gutem Team, flexiblen Zeiten und echter Verantwortung?
          Dann bist du bei uns genau richtig.
        </p>
        <h2>Offene Stellen</h2>
        <ul>
          <li>Service & Kasse</li>
          <li>Küchenhilfe / Produktion</li>
          <li>Schichtleitung</li>
        </ul>
        <p>
          Schick uns einfach eine Nachricht über WhatsApp oder nutze den Kontakt in der
          Fußzeile. Wir melden uns schnell bei dir.
        </p>
      </div>
    </div>
  )
}
