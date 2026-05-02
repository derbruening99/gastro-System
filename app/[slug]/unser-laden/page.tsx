import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { getTenant } from '@/lib/tenant'
import CustomerPageShell from '../landing/customer-page-shell'

export const dynamic = 'force-dynamic'

const STORE_PHOTOS = [
  '/products/IMG_4089.JPG',
  '/products/IMG_4100.JPG',
  '/products/IMG_4092.JPG',
  '/products/IMG_4094.JPG',
]

export default async function UnserLadenPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const tenant = await getTenant(slug)
  if (!tenant) notFound()

  const phoneDigits = tenant.phone?.replace(/\D/g, '')
  const phoneHref = phoneDigits ? `tel:${phoneDigits}` : undefined
  const waHref = phoneDigits ? `https://wa.me/${phoneDigits}` : undefined
  const mapsHref = tenant.address
    ? `https://www.google.com/maps/search/${encodeURIComponent(tenant.address)}`
    : undefined
  const orderHref = `/${slug}/order`

  return (
    <CustomerPageShell slug={slug} restaurantName={tenant.name}>
      <main className="laden-page">
        {/* Hero */}
        <section className="laden-hero">
          <div className="laden-hero-img-wrap">
            <Image
              src={STORE_PHOTOS[0]}
              alt={tenant.name}
              fill
              priority
              sizes="100vw"
              style={{ objectFit: 'cover', objectPosition: 'center' }}
              className="laden-hero-img"
            />
            <div className="laden-hero-scrim" />
          </div>
          <div className="laden-hero-content">
            <p className="laden-eyebrow">Komm vorbei</p>
            <h1 className="laden-title">Unser Laden</h1>
            <p className="laden-sub">
              Frisch zubereitet — direkt vor Ort. Oder bequem online bestellen und abholen.
            </p>
            <div className="laden-hero-cta">
              <Link href={orderHref} className="laden-btn-primary">
                🥣 Jetzt bestellen
              </Link>
              {mapsHref && (
                <a href={mapsHref} target="_blank" rel="noopener noreferrer" className="laden-btn-ghost">
                  📍 Route planen
                </a>
              )}
            </div>
          </div>
        </section>

        {/* Über uns + Store */}
        <section className="laden-about-section">
          <div className="laden-about-inner">
            <p className="laden-eyebrow">Über uns</p>
            <h2>Frische Bowls aus Leidenschaft</h2>
            <p>
              Bei {tenant.name} verbinden wir hochwertige Zutaten, schnelle Zubereitung und persönlichen Service.
              Ob vor Ort oder zum Mitnehmen – wir lieben das, was wir tun.
            </p>

            <div className="site-dual-grid">
              <div className="site-box">
                <h2>Warum wir?</h2>
                <p>
                  Frische Zutaten aus der Region, individuelle Bowls nach deinem Geschmack und eine Bestellung
                  in unter einer Minute.
                </p>
              </div>
              <div className="site-box">
                <h2>Unser Team</h2>
                <p>
                  Ehrliche Gastfreundschaft. Wir freuen uns, dich zu begrüßen und dein Essen perfekt zuzubereiten.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Info Cards */}
        <section className="laden-info-grid">
          <div className="laden-info-card">
            <div className="laden-info-icon">📍</div>
            <h3>Adresse</h3>
            <p>{tenant.address ?? 'Adresse nicht verfügbar'}</p>
            {mapsHref && (
              <a href={mapsHref} target="_blank" rel="noopener noreferrer" className="laden-info-link">
                Route planen →
              </a>
            )}
          </div>

          <div className="laden-info-card">
            <div className="laden-info-icon">📞</div>
            <h3>Kontakt</h3>
            {phoneHref ? (
              <p><a href={phoneHref} className="laden-info-tel">{tenant.phone}</a></p>
            ) : (
              <p>Während der Öffnungszeiten erreichbar.</p>
            )}
            {waHref && (
              <a href={waHref} target="_blank" rel="noopener noreferrer" className="laden-info-link">
                WhatsApp öffnen →
              </a>
            )}
          </div>

          <div className="laden-info-card">
            <div className="laden-info-icon">🕐</div>
            <h3>Öffnungszeiten</h3>
            <p>Mo–Fr 11–21 Uhr</p>
            <p>Sa 12–21 Uhr</p>
            <p>So 14–21 Uhr</p>
          </div>
        </section>

        {/* Foto-Galerie */}
        <section className="laden-gallery-section">
          <h2 className="laden-section-title">Eindrücke</h2>
          <div className="laden-gallery">
            {STORE_PHOTOS.map((photo, idx) => (
              <div key={idx} className="laden-gallery-item">
                <Image
                  src={photo}
                  alt={`${tenant.name} – Eindruck ${idx + 1}`}
                  fill
                  sizes="(max-width: 640px) 100vw, 50vw"
                  style={{ objectFit: 'cover', objectPosition: 'center' }}
                />
              </div>
            ))}
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="laden-bottom-cta">
          <h2>Lust auf eine Bowl?</h2>
          <p>Bestelle direkt — keine Drittgebühren, frisch zubereitet, in ~15 Min abholbereit.</p>
          <Link href={orderHref} className="laden-btn-primary laden-btn-primary-lg">
            🥣 Jetzt bestellen
          </Link>
        </section>

        <style>{`
          .laden-page {
            min-height: 100vh;
            background: var(--bg, #f4faf5);
            color: var(--text, #1a2e1c);
            font-family: var(--font-landing-inter, 'Inter', system-ui, sans-serif);
            padding-bottom: 64px;
          }
          .laden-hero {
            position: relative; min-height: 460px;
            display: flex; align-items: flex-end;
            margin-bottom: 32px;
            overflow: hidden;
          }
          .laden-hero-img-wrap { position: absolute; inset: 0; z-index: 0; }
          .laden-hero-img {}
          .laden-hero-scrim {
            position: absolute; inset: 0;
            background: linear-gradient(180deg, rgba(10,31,13,0.18) 0%, rgba(10,31,13,0.78) 100%);
          }
          .laden-hero-content {
            position: relative; z-index: 1;
            padding: 60px 24px 48px; max-width: 720px; margin: 0 auto;
            color: #fff; text-align: center;
          }
          .laden-eyebrow {
            font-size: 11px; font-weight: 700; letter-spacing: 1.4px;
            text-transform: uppercase; color: #86efac; margin-bottom: 10px;
          }
          .laden-title {
            font-family: var(--font-landing-jakarta, 'Plus Jakarta Sans', sans-serif);
            font-size: clamp(34px, 8vw, 56px); font-weight: 900;
            line-height: 1.05; margin-bottom: 14px;
            text-shadow: 0 2px 18px rgba(0,0,0,0.35);
          }
          .laden-sub {
            font-size: 16px; line-height: 1.55; margin-bottom: 22px;
            opacity: 0.95;
          }
          .laden-hero-cta {
            display: flex; flex-wrap: wrap; gap: 12px; justify-content: center;
          }
          .laden-btn-primary {
            display: inline-flex; align-items: center; gap: 8px;
            background: linear-gradient(135deg, var(--g-cta, #22c55e), var(--g-cta-deep, #16a34a));
            color: #fff; text-decoration: none;
            padding: 13px 26px; border-radius: 999px;
            font-size: 15px; font-weight: 700;
            box-shadow: 0 6px 24px rgba(34,197,94,0.45);
            transition: transform 0.18s, box-shadow 0.18s;
          }
          .laden-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 10px 32px rgba(34,197,94,0.55); }
          .laden-btn-primary-lg { padding: 16px 32px; font-size: 16px; }
          .laden-btn-ghost {
            display: inline-flex; align-items: center; gap: 8px;
            background: rgba(255,255,255,0.18);
            backdrop-filter: blur(8px);
            color: #fff; text-decoration: none;
            padding: 13px 22px; border-radius: 999px;
            font-size: 14px; font-weight: 700;
            border: 1.5px solid rgba(255,255,255,0.4);
            transition: background 0.18s;
          }
          .laden-btn-ghost:hover { background: rgba(255,255,255,0.28); }

          .laden-about-section {
            max-width: 1100px;
            margin: 0 auto 40px;
            padding: 0 20px;
          }
          .laden-about-inner {
            max-width: 900px;
            margin: 0 auto;
          }
          .laden-about-section h2 {
            font-family: var(--font-landing-jakarta, 'Plus Jakarta Sans', sans-serif);
            font-size: clamp(28px, 6vw, 40px);
            font-weight: 900;
            margin: 0 0 16px;
            color: var(--dark, #0a1f0d);
            line-height: 1.05;
          }
          .laden-about-section p {
            font-size: 16px;
            line-height: 1.75;
            color: var(--text-2, #4b6b50);
            margin-bottom: 24px;
          }

          .laden-info-grid {
            display: grid; gap: 16px;
            grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
            max-width: 1100px; margin: 0 auto 40px; padding: 0 20px;
          }
          .laden-info-card {
            background: var(--surface, #fff);
            border: 1.5px solid var(--border-soft, #e8f5ea);
            border-radius: 18px;
            padding: 22px 20px;
            box-shadow: 0 2px 14px rgba(0,0,0,0.05);
          }
          .laden-info-icon { font-size: 26px; margin-bottom: 8px; }
          .laden-info-card h3 {
            font-family: var(--font-landing-jakarta, 'Plus Jakarta Sans', sans-serif);
            font-size: 17px; font-weight: 800; margin-bottom: 8px;
            color: var(--dark, #0a1f0d);
          }
          .laden-info-card p { font-size: 14px; color: var(--text-2, #4b6b50); margin-bottom: 4px; line-height: 1.5; }
          .laden-info-tel {
            color: var(--dark, #0a1f0d); font-weight: 700; text-decoration: none;
          }
          .laden-info-tel:hover { text-decoration: underline; }
          .laden-info-link {
            display: inline-block; margin-top: 8px;
            color: #16a34a; font-size: 13px; font-weight: 700; text-decoration: none;
          }
          .laden-info-link:hover { text-decoration: underline; }

          .laden-gallery-section { max-width: 1100px; margin: 0 auto 40px; padding: 0 20px; }
          .laden-section-title {
            font-family: var(--font-landing-jakarta, 'Plus Jakarta Sans', sans-serif);
            font-size: 24px; font-weight: 800; color: var(--dark, #0a1f0d); margin-bottom: 16px;
            text-align: center;
          }
          .laden-gallery {
            display: grid; gap: 12px;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          }
          .laden-gallery-item {
            position: relative; aspect-ratio: 4/3;
            border-radius: 16px; overflow: hidden;
            border: 1.5px solid var(--border-soft, #e8f5ea);
            box-shadow: 0 2px 14px rgba(0,0,0,0.06);
          }

          .laden-bottom-cta {
            text-align: center;
            background: var(--surface, #fff);
            border: 1.5px solid var(--border-soft, #e8f5ea);
            border-radius: 22px;
            padding: 36px 24px;
            max-width: 700px; margin: 0 auto;
            box-shadow: 0 4px 20px rgba(0,0,0,0.06);
          }
          .laden-bottom-cta h2 {
            font-family: var(--font-landing-jakarta, 'Plus Jakarta Sans', sans-serif);
            font-size: 26px; font-weight: 900; color: var(--dark, #0a1f0d);
            margin-bottom: 8px;
          }
          .laden-bottom-cta p {
            font-size: 15px; color: var(--text-2, #4b6b50); margin-bottom: 20px;
          }

          @media (max-width: 480px) {
            .laden-hero { min-height: 420px; }
            .laden-hero-content { padding: 48px 20px 36px; }
          }
        `}</style>
      </main>
    </CustomerPageShell>
  )
}
