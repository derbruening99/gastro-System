import { notFound } from 'next/navigation'
import { getTenant } from '@/lib/tenant'

export default async function UberUnsPage({ params }: { params: { slug: string } }) {
  const tenant = await getTenant(params.slug)
  if (!tenant) notFound()

  return (
    <div className="site-page">
      <div className="site-page-inner">
        <p className="site-lead">Über {tenant.name}</p>
        <h1>Unsere Philosophie</h1>
        <p>
          Bei {tenant.name} dreht sich alles um schnelle, frische und leckere Bowls.
          Wir nutzen hochwertige Zutaten und machen jede Bestellung persönlich für dich.
        </p>
        <h2>Warum wir?</h2>
        <ul>
          <li>Frische Zutaten aus der Region</li>
          <li>Individuelle Bowls nach deinem Geschmack</li>
          <li>Schnelle Bestellung ohne Umwege</li>
          <li>Direkter Kontakt per WhatsApp</li>
        </ul>
        <h2>Unser Team</h2>
        <p>
          Unser Team steht für ehrliche Gastfreundschaft. Wir freuen uns darüber, dich im
          Restaurant begrüßen zu dürfen und deine Bestellung perfekt zuzubereiten.
        </p>
      </div>
    </div>
  )
}
