import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTenant } from '@/lib/tenant'
import CustomerPageShell from '../landing/customer-page-shell'

export default async function KarrierePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const tenant = await getTenant(slug)
  if (!tenant) notFound()

  const phoneDigits = tenant.phone?.replace(/\D/g, '')
  const waText = encodeURIComponent(`Hallo ${tenant.name}, ich interessiere mich für einen Job bei euch.`)
  const waHref = phoneDigits ? `https://wa.me/${phoneDigits}?text=${waText}` : undefined

  return (
    <CustomerPageShell slug={slug} restaurantName={tenant.name}>
      <main className="career-page">
        <section className="career-hero">
          <div className="career-hero-inner">
            <p className="career-eyebrow">Karriere bei {tenant.name}</p>
            <h1>Arbeite da, wo Frische Tempo hat.</h1>
            <p>
              Service, Küche, Kasse oder Schichtleitung: Wir suchen Menschen, die zuverlässig sind,
              gern mit Gästen umgehen und Lust auf ein sauberes Teamgefühl haben.
            </p>
            <div className="career-actions">
              {waHref ? (
                <a href={waHref} target="_blank" rel="noreferrer noopener" className="career-btn-primary">
                  Per WhatsApp bewerben
                </a>
              ) : null}
              <Link href={`/${slug}/unser-laden`} className="career-btn-ghost">
                Laden ansehen
              </Link>
            </div>
          </div>
        </section>

        <section className="career-roles" aria-labelledby="career-roles-title">
          <div className="career-section-head">
            <p className="career-eyebrow">Offene Bereiche</p>
            <h2 id="career-roles-title">Such dir deinen Platz</h2>
          </div>
          <div className="career-role-grid">
            {[
              ['Service & Kasse', 'Gäste empfangen, Bestellungen aufnehmen, Abholung sauber koordinieren.'],
              ['Küche & Produktion', 'Bowls vorbereiten, Zutaten auffüllen, Qualität und Tempo zusammenbringen.'],
              ['Schichtleitung', 'Abläufe steuern, Team unterstützen und den Laden ruhig durch den Tag führen.'],
            ].map(([title, text]) => (
              <article key={title} className="career-card">
                <span className="career-card-mark">+</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="career-process">
          <div className="career-process-card">
            <p className="career-eyebrow">So läuft's</p>
            <h2>Kurze Bewerbung. Schnelles Gespräch.</h2>
            <div className="career-process-list">
              <div><span>01</span><p>Schick uns eine kurze Nachricht mit Name, Alter, Erfahrung und Wunschbereich.</p></div>
              <div><span>02</span><p>Wir melden uns zurück und klären Zeiten, Aufgaben und Erwartungen.</p></div>
              <div><span>03</span><p>Wenn es passt, startest du mit einer einfachen Einarbeitung im Laden.</p></div>
            </div>
          </div>
        </section>

        <section className="career-bottom-cta">
          <h2>Erst probieren, dann bewerben?</h2>
          <p>Lerne unser Essen und den Laden kennen. Danach weißt du schnell, ob die Energie passt.</p>
          <Link className="career-btn-primary" href={`/${slug}/order`}>
            Jetzt bestellen
          </Link>
        </section>

        <style>{`
          .career-page {
            min-height: 100vh;
            color: #fff;
            background:
              radial-gradient(50% 62% at 78% 8%, rgba(255,167,38,0.07), transparent 70%),
              radial-gradient(42% 58% at 8% 88%, rgba(76,175,80,0.07), transparent 72%),
              linear-gradient(180deg, #0a0d0a 0%, #0e1410 48%, #0a0d0a 100%);
            padding: 142px 20px 72px;
            font-family: var(--font-landing-inter, 'Inter', system-ui, sans-serif);
          }
          .career-hero,
          .career-roles,
          .career-process,
          .career-bottom-cta {
            max-width: 1060px;
            margin: 0 auto;
          }
          .career-hero {
            min-height: 360px;
            display: grid;
            align-items: center;
            text-align: center;
            margin-bottom: 40px;
          }
          .career-hero-inner {
            max-width: 780px;
            margin: 0 auto;
          }
          .career-eyebrow {
            display: inline-flex;
            width: fit-content;
            color: rgba(255,167,38,0.95);
            background: rgba(255,167,38,0.12);
            border: 1px solid rgba(255,167,38,0.22);
            border-radius: 999px;
            padding: 5px 12px;
            font-size: 11px;
            font-weight: 900;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            margin: 0 auto 16px;
          }
          .career-hero h1,
          .career-section-head h2,
          .career-process-card h2,
          .career-bottom-cta h2 {
            font-family: var(--font-landing-jakarta, 'Plus Jakarta Sans', sans-serif);
            font-weight: 900;
            letter-spacing: -0.03em;
            color: #fff;
            margin: 0;
          }
          .career-hero h1 {
            font-size: clamp(40px, 8vw, 76px);
            line-height: 0.98;
            margin-bottom: 18px;
          }
          .career-hero p,
          .career-bottom-cta p {
            max-width: 650px;
            margin: 0 auto;
            color: rgba(255,255,255,0.68);
            font-size: 16px;
            line-height: 1.7;
          }
          .career-actions {
            display: flex;
            justify-content: center;
            flex-wrap: wrap;
            gap: 12px;
            margin-top: 26px;
          }
          .career-btn-primary,
          .career-btn-ghost {
            min-height: 48px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 999px;
            padding: 0 26px;
            color: #fff;
            text-decoration: none;
            font-size: 15px;
            font-weight: 800;
          }
          .career-btn-primary {
            background: linear-gradient(135deg, var(--landing-cta, #e84e19), var(--landing-cta-deep, #b33b16));
            box-shadow: 0 10px 26px rgba(232,78,25,0.30);
          }
          .career-btn-ghost {
            background: rgba(255,255,255,0.06);
            border: 1px solid rgba(255,255,255,0.10);
          }
          .career-section-head {
            text-align: center;
            margin-bottom: 20px;
          }
          .career-section-head h2 {
            font-size: clamp(28px, 5vw, 44px);
          }
          .career-role-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 14px;
            margin-bottom: 40px;
          }
          .career-card,
          .career-process-card,
          .career-bottom-cta {
            position: relative;
            overflow: hidden;
            background: linear-gradient(180deg, rgba(255,255,255,0.075), rgba(255,255,255,0.032));
            border: 1px solid rgba(255,255,255,0.10);
            box-shadow:
              inset 0 1px 0 rgba(255,255,255,0.08),
              0 14px 34px rgba(0,0,0,0.30);
            backdrop-filter: blur(12px) saturate(1.12);
            -webkit-backdrop-filter: blur(12px) saturate(1.12);
          }
          .career-card {
            border-radius: 22px;
            padding: 22px;
          }
          .career-card-mark {
            width: 42px;
            height: 42px;
            border-radius: 14px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 18px;
            color: rgba(255,255,255,0.86);
            background: rgba(255,255,255,0.06);
            border: 1px solid rgba(255,255,255,0.08);
            font-size: 24px;
          }
          .career-card h3 {
            font-family: var(--font-landing-jakarta, 'Plus Jakarta Sans', sans-serif);
            font-size: 20px;
            font-weight: 900;
            color: #fff;
            margin: 0 0 9px;
          }
          .career-card p,
          .career-process-list p {
            color: rgba(255,255,255,0.66);
            font-size: 14px;
            line-height: 1.6;
            margin: 0;
          }
          .career-process-card,
          .career-bottom-cta {
            border-radius: 28px;
            padding: clamp(24px, 5vw, 40px);
            margin-bottom: 40px;
          }
          .career-process-card::before,
          .career-bottom-cta::before {
            content: "";
            position: absolute;
            top: -2px;
            left: 28px;
            right: 28px;
            height: 2px;
            background: linear-gradient(90deg, transparent, rgba(255,167,38,0.82), transparent);
            opacity: 0.72;
          }
          .career-process-card h2 {
            font-size: clamp(28px, 5vw, 44px);
            margin-bottom: 22px;
          }
          .career-process-list {
            display: grid;
            gap: 12px;
          }
          .career-process-list div {
            display: grid;
            grid-template-columns: 54px 1fr;
            align-items: center;
            gap: 14px;
            padding: 15px;
            border-radius: 16px;
            background: rgba(255,255,255,0.045);
            border: 1px solid rgba(255,255,255,0.08);
          }
          .career-process-list span {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            height: 34px;
            border-radius: 999px;
            color: rgba(255,167,38,0.95);
            background: rgba(255,167,38,0.12);
            border: 1px solid rgba(255,167,38,0.22);
            font-size: 12px;
            font-weight: 900;
            letter-spacing: 0.08em;
          }
          .career-bottom-cta {
            max-width: 720px;
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .career-bottom-cta h2 {
            font-size: clamp(26px, 5vw, 40px);
            margin-bottom: 10px;
          }
          .career-bottom-cta .career-btn-primary {
            margin-top: 22px;
          }
          @media (max-width: 760px) {
            .career-page {
              padding-top: 126px;
            }
            .career-role-grid {
              grid-template-columns: 1fr;
            }
            .career-process-list div {
              grid-template-columns: 1fr;
              gap: 9px;
            }
            .career-actions {
              max-width: 430px;
              margin-left: auto;
              margin-right: auto;
            }
            .career-btn-primary,
            .career-btn-ghost {
              width: 100%;
            }
          }
        `}</style>
      </main>
    </CustomerPageShell>
  )
}
