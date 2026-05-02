import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { getTenant } from '@/lib/tenant'
import { getMenuByRestaurant } from '@/lib/menu'
import CustomerPageShell from '../landing/customer-page-shell'

export const dynamic = 'force-dynamic'

// Produktfotos rotieren über alle Items
const BOWL_PHOTOS = [
  '/products/IMG_4096.JPG',
  '/products/IMG_4099.JPG',
  '/products/IMG_4089.JPG',
  '/products/IMG_4100.JPG',
  '/products/IMG_4092.JPG',
  '/products/IMG_4094.JPG',
  '/products/IMG_4095.JPG',
  '/products/IMG_4097.JPG',
  '/products/IMG_4101.JPG',
  '/products/IMG_4088.JPG',
]

function formatPrice(n: number) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n)
}

export default async function SpeisekartePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const tenant = await getTenant(slug)
  if (!tenant) notFound()

  const categories = await getMenuByRestaurant(tenant.id)
  const orderHref = `/${slug}/order`
  const kustomizerHref = `/${slug}/kustomizer`

  // Globaler Foto-Index — ein Foto pro Item, übergreifend
  let photoIndex = 0

  return (
    <CustomerPageShell slug={slug} restaurantName={tenant.name}>
      <main className="speise-page">
        {/* Header */}
        <section className="speise-header">
          <p className="speise-eyebrow">Direkt bestellen · Keine Gebühren</p>
          <h1 className="speise-title">Unsere Speisekarte</h1>
          <p className="speise-sub">
            Frisch zubereitet — täglich für dich. Direkt bei {tenant.name} bestellen, keine Drittgebühren.
          </p>
          <Link href={kustomizerHref} className="speise-btn-cta">
            🥣 Eigene Bowl konfigurieren
          </Link>
        </section>

        {/* Kategorien */}
        {categories.length === 0 ? (
          <section className="speise-section speise-fallback">
            <p className="speise-fallback-icon">🥣</p>
            <h2>Menü wird geladen…</h2>
            <p>Schau später nochmal vorbei oder bestelle direkt im Konfigurator.</p>
            <Link href={kustomizerHref} className="speise-btn-cta">
              Jetzt konfigurieren
            </Link>
          </section>
        ) : (
          categories.map((category) => (
            <section key={category.id} className="speise-section" aria-labelledby={`cat-${category.id}`}>
              <h2 id={`cat-${category.id}`} className="speise-section-title">{category.name}</h2>
              <div className="speise-grid">
                {category.items.map((item) => {
                  const photo = BOWL_PHOTOS[photoIndex % BOWL_PHOTOS.length]
                  photoIndex += 1
                  return (
                    <Link
                      key={item.id}
                      href={`${orderHref}?item=${encodeURIComponent(item.id)}`}
                      className="speise-card"
                    >
                      <div className="speise-card-img-wrap">
                        <Image
                          src={photo}
                          alt={item.name}
                          fill
                          sizes="(max-width: 640px) 100vw, 380px"
                          style={{ objectFit: 'cover', objectPosition: 'center' }}
                          className="speise-card-img"
                        />
                        <div className="speise-card-scrim" />
                        <span className="speise-card-badge">Bowl</span>
                      </div>
                      <div className="speise-card-body">
                        <div className="speise-card-name">{item.name}</div>
                        {item.description && <p className="speise-card-desc">{item.description}</p>}
                        <div className="speise-card-footer">
                          <span className="speise-card-price">{formatPrice(Number(item.price))}</span>
                          <span className="speise-card-btn">Bestellen →</span>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </section>
          ))
        )}

        {/* Trust Bar */}
        <section className="speise-trust">
          <div className="speise-trust-item"><span aria-hidden>✅</span> Keine Drittgebühren</div>
          <div className="speise-trust-item"><span aria-hidden>⚡</span> Fertig in ~15 Min</div>
          <div className="speise-trust-item"><span aria-hidden>🌱</span> Täglich frisch</div>
          {tenant.address && (
            <div className="speise-trust-item"><span aria-hidden>📍</span> {tenant.address}</div>
          )}
        </section>

        <style>{`
          .speise-page {
            min-height: 100vh;
            background: var(--bg, #f4faf5);
            color: var(--text, #1a2e1c);
            font-family: var(--font-landing-inter, 'Inter', system-ui, sans-serif);
            padding-bottom: 64px;
          }
          .speise-header {
            text-align: center;
            padding: 52px 24px 36px;
            max-width: 640px;
            margin: 0 auto;
          }
          .speise-eyebrow {
            font-size: 11px; font-weight: 700; letter-spacing: 1.4px;
            text-transform: uppercase; color: #16a34a; margin-bottom: 10px;
          }
          .speise-title {
            font-family: var(--font-landing-jakarta, 'Plus Jakarta Sans', sans-serif);
            font-size: clamp(28px, 7vw, 44px); font-weight: 900;
            color: var(--dark, #0a1f0d); line-height: 1.05; margin-bottom: 12px;
          }
          .speise-sub {
            font-size: 15px; color: var(--text-2, #4b6b50); margin-bottom: 24px; line-height: 1.6;
          }
          .speise-btn-cta {
            display: inline-flex; align-items: center; gap: 8px;
            background: linear-gradient(135deg, var(--g-cta, #22c55e), var(--g-cta-deep, #16a34a));
            color: #fff; text-decoration: none;
            padding: 13px 26px; border-radius: 999px;
            font-size: 15px; font-weight: 700;
            box-shadow: 0 6px 24px rgba(34,197,94,0.38);
            transition: transform 0.18s, box-shadow 0.18s;
          }
          .speise-btn-cta:hover { transform: translateY(-2px); box-shadow: 0 10px 32px rgba(34,197,94,0.48); }
          .speise-section { max-width: 1100px; margin: 0 auto; padding: 0 20px 40px; }
          .speise-section-title {
            font-family: var(--font-landing-jakarta, 'Plus Jakarta Sans', sans-serif);
            font-size: 24px; font-weight: 800; color: var(--dark, #0a1f0d); margin-bottom: 16px;
          }
          .speise-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
            gap: 16px;
          }
          .speise-card {
            background: var(--surface, #fff);
            border-radius: 18px; overflow: hidden;
            border: 1.5px solid var(--border-soft, #e8f5ea);
            box-shadow: 0 2px 14px rgba(0,0,0,0.06);
            display: flex; flex-direction: column;
            text-decoration: none; color: inherit;
            transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s;
          }
          .speise-card:hover { transform: translateY(-4px); box-shadow: 0 10px 32px rgba(0,0,0,0.10); }
          .speise-card-img-wrap { position: relative; aspect-ratio: 4/3; overflow: hidden; }
          .speise-card-img { transition: transform 0.45s cubic-bezier(0.22,1,0.36,1); }
          .speise-card:hover .speise-card-img { transform: scale(1.06); }
          .speise-card-scrim {
            position: absolute; inset: 0;
            background: linear-gradient(180deg, transparent 55%, rgba(0,0,0,0.25) 100%);
          }
          .speise-card-badge {
            position: absolute; top: 10px; left: 10px;
            background: #22c55e; color: #fff;
            font-size: 10px; font-weight: 800; letter-spacing: 0.6px; text-transform: uppercase;
            padding: 3px 10px; border-radius: 999px;
          }
          .speise-card-body { padding: 14px 16px 16px; flex: 1; display: flex; flex-direction: column; }
          .speise-card-name {
            font-family: var(--font-landing-jakarta, 'Plus Jakarta Sans', sans-serif);
            font-size: 16px; font-weight: 800; color: var(--dark, #0a1f0d); margin-bottom: 6px;
          }
          .speise-card-desc { font-size: 12.5px; color: var(--text-3, #6b7e6f); margin-bottom: 6px; line-height: 1.45; }
          .speise-card-footer {
            display: flex; align-items: center; justify-content: space-between;
            margin-top: auto; padding-top: 10px;
          }
          .speise-card-price { font-size: 18px; font-weight: 900; color: var(--dark, #0a1f0d); }
          .speise-card-btn { font-size: 12px; font-weight: 700; color: #16a34a; }
          .speise-fallback { text-align: center; padding: 60px 20px; max-width: 640px; }
          .speise-fallback-icon { font-size: 48px; margin-bottom: 16px; }
          .speise-fallback h2 {
            font-family: var(--font-landing-jakarta, 'Plus Jakarta Sans', sans-serif);
            font-size: 22px; font-weight: 800; margin-bottom: 8px; color: var(--dark, #0a1f0d);
          }
          .speise-fallback p { color: var(--text-2, #4b6b50); margin-bottom: 24px; }
          .speise-trust {
            display: flex; flex-wrap: wrap; justify-content: center; gap: 16px 32px;
            padding: 24px 20px;
            border-top: 1px solid var(--border-soft, #e8f5ea);
            max-width: 1100px; margin: 24px auto 0;
            font-size: 13px; font-weight: 600; color: var(--text-2, #4b6b50);
          }
          .speise-trust-item { display: flex; align-items: center; gap: 6px; }
          @media (max-width: 480px) {
            .speise-grid { grid-template-columns: 1fr; }
          }
        `}</style>
      </main>
    </CustomerPageShell>
  )
}
