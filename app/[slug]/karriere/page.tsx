import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTenant } from '@/lib/tenant'
import CustomerPageShell from '../landing/customer-page-shell'

export default async function KarrierePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const tenant = await getTenant(slug)
  if (!tenant) notFound()

  const phoneDigits = tenant.phone?.replace(/\D/g, '')
  const waHref = phoneDigits ? `https://wa.me/${phoneDigits}` : undefined

  return (
    <CustomerPageShell slug={slug} restaurantName={tenant.name}>
      <div className="site-page">
        <div className="site-page-inner">
          <p className="site-lead">Karriere bei {tenant.name}</p>
          <h1>Werde Teil unseres Teams</h1>
          <p>
            Du suchst einen Job mit gutem Team, flexiblen Zeiten und echter Verantwortung?
            Dann bist du bei uns genau richtig.
          </p>

          <div className="site-dual-grid">
            <div className="site-box">
              <h2>Offene Stellen</h2>
              <p>
                Service &amp; Kasse · Küchenhilfe / Produktion · Schichtleitung
              </p>
            </div>
            <div className="site-box">
              <h2>So bewirbst du dich</h2>
              <p>
                Schick uns einfach eine Nachricht — wir melden uns schnell bei dir zurück.
              </p>
              {waHref ? (
                <p className="site-actions">
                  <a href={waHref} target="_blank" rel="noreferrer noopener">
                    Per WhatsApp bewerben →
                  </a>
                </p>
              ) : null}
            </div>
          </div>

          <div className="order-section reveal" style={{ marginTop: 36 }}>
            <Link className="btn-cta-lg" href={`/${slug}/order`}>
              <span aria-hidden>🥣</span>
              <span>
                Jetzt bestellen
                <small>Lerne unser Essen kennen — frisch &amp; direkt</small>
              </span>
            </Link>
          </div>
        </div>
      </div>
    </CustomerPageShell>
  )
}
