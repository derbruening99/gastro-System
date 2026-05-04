import { notFound } from 'next/navigation'
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

function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function fallbackPhotoFor(id: string) {
  return BOWL_PHOTOS[hashString(id) % BOWL_PHOTOS.length]
}

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
  const displayAddress = slug === 'odis-bowl'
    ? 'Borneplatz 2, 48431 Rheine'
    : tenant.address

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
            Eigene Bowl konfigurieren
          </Link>
        </section>

        {/* Kategorien */}
        {categories.length === 0 ? (
          <section className="speise-section speise-fallback">
            <p className="speise-fallback-icon">BOWL</p>
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
                  const photo = item.image_url?.trim() || fallbackPhotoFor(item.id)
                  return (
                    <Link
                      key={item.id}
                      href={`${orderHref}?item=${encodeURIComponent(item.id)}`}
                      className="speise-card"
                    >
                      <div className="speise-card-img-wrap">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photo}
                          alt={item.name}
                          loading="lazy"
                          decoding="async"
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
                          <span className="speise-card-btn">Direkt bestellen</span>
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
          <div className="speise-trust-item"><span aria-hidden>✓</span> Keine Drittgebühren</div>
          <div className="speise-trust-item"><span aria-hidden>15</span> Fertig in ~15 Min</div>
          <div className="speise-trust-item"><span aria-hidden>+</span> Täglich frisch</div>
          {displayAddress && (
            <div className="speise-trust-item"><span aria-hidden>⌖</span> {displayAddress}</div>
          )}
        </section>

        <style>{`
          /* ── Dark Premium — kohärent zur Landing ───────────────── */
          .speise-page {
            min-height: 100vh;
            background:
              radial-gradient(58% 72% at 78% 8%, rgba(255, 167, 38, 0.10), transparent 68%),
              radial-gradient(48% 64% at 8% 88%, rgba(76, 175, 80, 0.09), transparent 70%),
              linear-gradient(180deg, #0a0d0a 0%, #0e1410 48%, #0a0d0a 100%);
            color: #fff;
            font-family: var(--font-landing-inter, 'Inter', system-ui, sans-serif);
            padding-bottom: 72px;
          }
          .speise-header {
            text-align: center;
            padding: 64px 24px 40px;
            max-width: 720px;
            margin: 0 auto;
          }
          .speise-eyebrow {
            font-size: 11px; font-weight: 700; letter-spacing: 1.4px;
            text-transform: uppercase; color: rgba(255, 167, 38, 0.95);
            margin-bottom: 12px;
          }
          .speise-title {
            font-family: var(--font-landing-jakarta, 'Plus Jakarta Sans', sans-serif);
            font-size: clamp(30px, 7vw, 48px); font-weight: 900;
            color: #fff; line-height: 1.05; margin-bottom: 14px;
            letter-spacing: -0.02em;
          }
          .speise-sub {
            font-size: 15px; color: rgba(255,255,255,0.62);
            margin-bottom: 28px; line-height: 1.6;
          }
          .speise-btn-cta {
            display: inline-flex; align-items: center; gap: 8px;
            background: linear-gradient(135deg, var(--g-cta, #22c55e), var(--g-cta-deep, #16a34a));
            color: #fff; text-decoration: none;
            padding: 13px 28px; border-radius: 999px;
            font-size: 15px; font-weight: 700;
            box-shadow: 0 8px 28px rgba(34,197,94,0.42);
            transition: transform 0.18s, box-shadow 0.18s;
          }
          .speise-btn-cta:hover { transform: translateY(-2px); box-shadow: 0 12px 36px rgba(34,197,94,0.55); }
          .speise-section { max-width: 1100px; margin: 0 auto; padding: 0 20px 44px; }
          .speise-section-title {
            font-family: var(--font-landing-jakarta, 'Plus Jakarta Sans', sans-serif);
            font-size: 24px; font-weight: 800; color: #fff; margin-bottom: 18px;
            letter-spacing: -0.01em;
          }
          .speise-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
            gap: 16px;
          }
          /* Glas-Karten — dieselbe Sprache wie Landing-Cards */
          .speise-card {
            background: linear-gradient(180deg, rgba(255,255,255,0.065), rgba(255,255,255,0.03));
            border-radius: 20px; overflow: hidden;
            border: 1px solid rgba(255,255,255,0.09);
            box-shadow:
              inset 0 1px 0 rgba(255,255,255,0.06),
              0 12px 34px rgba(0,0,0,0.30);
            backdrop-filter: blur(14px) saturate(1.25);
            -webkit-backdrop-filter: blur(14px) saturate(1.25);
            display: flex; flex-direction: column;
            text-decoration: none; color: inherit;
            transition: transform 0.25s cubic-bezier(0.22,1,0.36,1), border-color 0.25s, box-shadow 0.25s;
          }
          .speise-card:hover {
            transform: translateY(-4px);
            border-color: rgba(255,255,255,0.16);
            box-shadow:
              inset 0 1px 0 rgba(255,255,255,0.08),
              0 18px 44px rgba(0,0,0,0.40);
          }
          .speise-card-img-wrap { position: relative; aspect-ratio: 4/3; overflow: hidden; }
          .speise-card-img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            object-position: center;
            display: block;
            transition: transform 0.45s cubic-bezier(0.22,1,0.36,1);
          }
          .speise-card:hover .speise-card-img { transform: scale(1.06); }
          .speise-card-scrim {
            position: absolute; inset: 0;
            background: linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.55) 100%);
          }
          .speise-card-badge {
            position: absolute; top: 10px; left: 10px;
            background: rgba(255, 167, 38, 0.95); color: #1a0d00;
            font-size: 10px; font-weight: 800; letter-spacing: 0.6px; text-transform: uppercase;
            padding: 4px 10px; border-radius: 999px;
            box-shadow: 0 4px 14px rgba(255, 167, 38, 0.35);
          }
          .speise-card-body { padding: 14px 16px 16px; flex: 1; display: flex; flex-direction: column; }
          .speise-card-name {
            font-family: var(--font-landing-jakarta, 'Plus Jakarta Sans', sans-serif);
            font-size: 16px; font-weight: 800; color: #fff; margin-bottom: 6px;
            letter-spacing: -0.01em;
          }
          .speise-card-desc {
            font-size: 12.5px; color: rgba(255,255,255,0.62);
            margin-bottom: 6px; line-height: 1.45;
          }
          .speise-card-footer {
            display: flex; align-items: center; justify-content: space-between;
            margin-top: auto; padding-top: 10px;
          }
          .speise-card-price { font-size: 18px; font-weight: 900; color: #fff; }
          .speise-card-btn {
            font-size: 12px; font-weight: 700; color: rgba(255, 167, 38, 0.95);
          }
          .speise-fallback {
            text-align: center; padding: 60px 20px; max-width: 640px;
            background: linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.02));
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 22px;
          }
          .speise-fallback-icon { font-size: 48px; margin-bottom: 16px; }
          .speise-fallback h2 {
            font-family: var(--font-landing-jakarta, 'Plus Jakarta Sans', sans-serif);
            font-size: 22px; font-weight: 800; margin-bottom: 10px; color: #fff;
          }
          .speise-fallback p { color: rgba(255,255,255,0.62); margin-bottom: 24px; }
          .speise-trust {
            display: flex; flex-wrap: wrap; justify-content: center; gap: 16px 32px;
            padding: 28px 20px;
            border-top: 1px solid rgba(255,255,255,0.08);
            max-width: 1100px; margin: 28px auto 0;
            font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.62);
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
