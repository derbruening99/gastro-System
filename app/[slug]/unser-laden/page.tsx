import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { getTenant } from '@/lib/tenant'
import { createServerClient } from '@/lib/supabase'
import CustomerPageShell from '../landing/customer-page-shell'

export const dynamic = 'force-dynamic'

const STORE_PHOTOS = [
  '/products/IMG_4089.JPG',
  '/products/IMG_4100.JPG',
  '/products/IMG_4092.JPG',
  '/products/IMG_4094.JPG',
]

type RestaurantNews = {
  id: string
  title: string
  body: string | null
  published_at: string | null
  created_at: string
}

async function getPublishedNews(restaurantId: string): Promise<RestaurantNews[]> {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('restaurant_news')
    .select('id, title, body, published_at, created_at')
    .eq('restaurant_id', restaurantId)
    .eq('is_published', true)
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(6)

  if (error) {
    console.error('[unser-laden] news load failed', error.message)
    return []
  }

  return data ?? []
}

function formatNewsDate(value: string | null, fallback: string) {
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: 'short',
  }).format(new Date(value ?? fallback))
}

export default async function UnserLadenPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const tenant = await getTenant(slug)
  if (!tenant) notFound()
  const news = await getPublishedNews(tenant.id)
  const [featuredNews, ...moreNews] = news
  const displayAddress = slug === 'odis-bowl'
    ? 'Borneplatz 2, 48431 Rheine'
    : tenant.address

  const phoneDigits = tenant.phone?.replace(/\D/g, '')
  const phoneHref = phoneDigits ? `tel:${phoneDigits}` : undefined
  const waHref = phoneDigits ? `https://wa.me/${phoneDigits}` : undefined
  const mapsHref = displayAddress
    ? `https://www.google.com/maps/search/${encodeURIComponent(displayAddress)}`
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
                Direkt bestellen
              </Link>
              {mapsHref && (
                <a href={mapsHref} target="_blank" rel="noopener noreferrer" className="laden-btn-ghost">
                  Route planen
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

        {/* Aktuelle News */}
        <section className="laden-news-section" aria-labelledby="laden-news-title">
          <div className="laden-news-head">
            <p className="laden-eyebrow">Aktuell</p>
            <h2 id="laden-news-title">News aus dem Laden</h2>
            <p>
              Tagesinfos, Specials und kleine Updates — direkt aus dem Admin gepflegt.
            </p>
          </div>

          {featuredNews ? (
            <div className="laden-news-grid">
              <article className="laden-news-card laden-news-card-featured">
                <div className="laden-news-meta">
                  <span>Live</span>
                  <time dateTime={featuredNews.published_at ?? featuredNews.created_at}>
                    {formatNewsDate(featuredNews.published_at, featuredNews.created_at)}
                  </time>
                </div>
                <h3>{featuredNews.title}</h3>
                {featuredNews.body && <p>{featuredNews.body}</p>}
              </article>

              <div className="laden-news-list">
                {moreNews.length > 0 ? moreNews.slice(0, 4).map((item) => (
                  <article key={item.id} className="laden-news-card laden-news-card-small">
                    <time dateTime={item.published_at ?? item.created_at}>
                      {formatNewsDate(item.published_at, item.created_at)}
                    </time>
                    <h3>{item.title}</h3>
                    {item.body && <p>{item.body}</p>}
                  </article>
                )) : (
                  <div className="laden-news-empty">
                    <span>+</span>
                    <p>Neue Meldungen erscheinen hier automatisch, sobald sie im Admin veröffentlicht werden.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="laden-news-empty laden-news-empty-wide">
              <span>+</span>
              <div>
                <h3>Noch keine aktuellen Meldungen</h3>
                <p>Wenn im Admin eine News veröffentlicht wird, erscheint sie hier sofort im Premium-Newsfeed.</p>
              </div>
            </div>
          )}
        </section>

        {/* Info Cards */}
        <section className="laden-info-grid">
          <div className="laden-info-card">
            <div className="laden-info-icon">⌖</div>
            <h3>Adresse</h3>
            <p>{displayAddress ?? 'Adresse nicht verfügbar'}</p>
            {mapsHref && (
              <a href={mapsHref} target="_blank" rel="noopener noreferrer" className="laden-info-link">
                Route planen
              </a>
            )}
          </div>

          <div className="laden-info-card">
            <div className="laden-info-icon">☎</div>
            <h3>Kontakt</h3>
            {phoneHref ? (
              <p><a href={phoneHref} className="laden-info-tel">{tenant.phone}</a></p>
            ) : (
              <p>Während der Öffnungszeiten erreichbar.</p>
            )}
            {waHref && (
              <a href={waHref} target="_blank" rel="noopener noreferrer" className="laden-info-link">
                WhatsApp öffnen
              </a>
            )}
          </div>

          <div className="laden-info-card">
            <div className="laden-info-icon">ZEIT</div>
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
            Direkt bestellen
          </Link>
        </section>

        <style>{`
          /* ── Dark Premium — kohärent zur Landing ───────────────── */
          .laden-page {
            min-height: 100vh;
            background:
              radial-gradient(58% 72% at 78% 8%, rgba(255, 167, 38, 0.10), transparent 68%),
              radial-gradient(48% 64% at 8% 88%, rgba(76, 175, 80, 0.09), transparent 70%),
              linear-gradient(180deg, #0a0d0a 0%, #0e1410 48%, #0a0d0a 100%);
            color: #fff;
            font-family: var(--font-landing-inter, 'Inter', system-ui, sans-serif);
            padding-bottom: 72px;
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
            text-transform: uppercase; color: rgba(255, 167, 38, 0.95);
            margin-bottom: 10px;
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
            color: #fff;
            line-height: 1.05;
            letter-spacing: -0.02em;
          }
          .laden-about-section p {
            font-size: 16px;
            line-height: 1.75;
            color: rgba(255,255,255,0.72);
            margin-bottom: 24px;
          }
          .laden-page .site-box {
            background: linear-gradient(180deg, rgba(255,255,255,0.065), rgba(255,255,255,0.03));
            border-color: rgba(255,255,255,0.09);
            box-shadow:
              inset 0 1px 0 rgba(255,255,255,0.06),
              0 12px 34px rgba(0,0,0,0.30);
          }
          .laden-page .site-box h2 {
            color: #fff;
          }
          .laden-page .site-box p {
            color: rgba(255,255,255,0.66);
            margin-bottom: 0;
          }

          .laden-info-grid {
            display: grid; gap: 16px;
            grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
            max-width: 1100px; margin: 0 auto 40px; padding: 0 20px;
          }
          /* Glas-Karten — gleiche Sprache wie Landing */
          .laden-info-card {
            background: linear-gradient(180deg, rgba(255,255,255,0.065), rgba(255,255,255,0.03));
            border: 1px solid rgba(255,255,255,0.09);
            border-radius: 22px;
            padding: 24px 22px;
            box-shadow:
              inset 0 1px 0 rgba(255,255,255,0.06),
              0 12px 34px rgba(0,0,0,0.30);
            backdrop-filter: blur(14px) saturate(1.25);
            -webkit-backdrop-filter: blur(14px) saturate(1.25);
            transition: transform 0.25s cubic-bezier(0.22,1,0.36,1), border-color 0.25s;
          }
          .laden-info-card:hover {
            transform: translateY(-3px);
            border-color: rgba(255,255,255,0.16);
          }
          .laden-info-icon {
            font-size: 26px; margin-bottom: 10px;
            filter: drop-shadow(0 4px 14px rgba(255, 167, 38, 0.3));
          }
          .laden-info-card h3 {
            font-family: var(--font-landing-jakarta, 'Plus Jakarta Sans', sans-serif);
            font-size: 17px; font-weight: 800; margin-bottom: 8px;
            color: #fff;
          }
          .laden-info-card p {
            font-size: 14px; color: rgba(255,255,255,0.72);
            margin-bottom: 4px; line-height: 1.5;
          }
          .laden-info-tel {
            color: #fff; font-weight: 700; text-decoration: none;
          }
          .laden-info-tel:hover { color: rgba(255, 167, 38, 0.95); }
          .laden-info-link {
            display: inline-block; margin-top: 8px;
            color: rgba(255, 167, 38, 0.95);
            font-size: 13px; font-weight: 700; text-decoration: none;
          }
          .laden-info-link:hover { text-decoration: underline; }

          .laden-news-section {
            max-width: 1100px;
            margin: 0 auto 44px;
            padding: 0 20px;
          }
          .laden-news-head {
            max-width: 720px;
            margin: 0 auto 22px;
            text-align: center;
          }
          .laden-news-head h2 {
            font-family: var(--font-landing-jakarta, 'Plus Jakarta Sans', sans-serif);
            font-size: clamp(28px, 6vw, 42px);
            font-weight: 900;
            color: #fff;
            line-height: 1.05;
            letter-spacing: -0.02em;
            margin-bottom: 10px;
          }
          .laden-news-head p {
            color: rgba(255,255,255,0.64);
            font-size: 15px;
            line-height: 1.6;
          }
          .laden-news-grid {
            display: grid;
            grid-template-columns: minmax(0, 1.15fr) minmax(300px, 0.85fr);
            gap: 16px;
          }
          .laden-news-card,
          .laden-news-empty {
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
          .laden-news-card::before {
            content: "";
            position: absolute;
            top: -2px;
            left: 24px;
            right: 24px;
            height: 2px;
            background: linear-gradient(90deg, transparent, rgba(255,167,38,0.82), transparent);
            opacity: 0.72;
          }
          .laden-news-card-featured {
            min-height: 280px;
            border-radius: 26px;
            padding: clamp(24px, 4vw, 34px);
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
            background:
              radial-gradient(70% 84% at 84% 0%, rgba(255,167,38,0.14), transparent 68%),
              linear-gradient(180deg, rgba(255,255,255,0.082), rgba(255,255,255,0.032));
          }
          .laden-news-meta {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 16px;
          }
          .laden-news-meta span,
          .laden-news-card-small time {
            display: inline-flex;
            width: fit-content;
            color: rgba(255,167,38,0.95);
            background: rgba(255,167,38,0.12);
            border: 1px solid rgba(255,167,38,0.22);
            border-radius: 999px;
            padding: 4px 10px;
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 0.08em;
            text-transform: uppercase;
          }
          .laden-news-meta time {
            color: rgba(255,255,255,0.58);
            font-size: 12px;
            font-weight: 700;
          }
          .laden-news-card h3 {
            font-family: var(--font-landing-jakarta, 'Plus Jakarta Sans', sans-serif);
            color: #fff;
            font-weight: 900;
            letter-spacing: -0.02em;
            margin: 0;
          }
          .laden-news-card-featured h3 {
            font-size: clamp(26px, 5vw, 42px);
            line-height: 1.05;
            margin-bottom: 12px;
          }
          .laden-news-card p,
          .laden-news-empty p {
            color: rgba(255,255,255,0.68);
            font-size: 14px;
            line-height: 1.6;
            margin: 0;
          }
          .laden-news-list {
            display: grid;
            gap: 12px;
          }
          .laden-news-card-small {
            border-radius: 18px;
            padding: 18px;
          }
          .laden-news-card-small h3 {
            font-size: 17px;
            line-height: 1.2;
            margin: 12px 0 7px;
          }
          .laden-news-empty {
            border-radius: 18px;
            padding: 22px;
            display: flex;
            align-items: center;
            gap: 14px;
          }
          .laden-news-empty-wide {
            max-width: 720px;
            margin: 0 auto;
          }
          .laden-news-empty span {
            width: 42px;
            height: 42px;
            border-radius: 14px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            flex: 0 0 auto;
            color: rgba(255,255,255,0.86);
            background: rgba(255,255,255,0.06);
            border: 1px solid rgba(255,255,255,0.08);
            font-size: 24px;
          }
          .laden-news-empty h3 {
            color: #fff;
            font-family: var(--font-landing-jakarta, 'Plus Jakarta Sans', sans-serif);
            font-size: 18px;
            font-weight: 900;
            margin: 0 0 5px;
          }

          .laden-gallery-section { max-width: 1100px; margin: 0 auto 40px; padding: 0 20px; }
          .laden-section-title {
            font-family: var(--font-landing-jakarta, 'Plus Jakarta Sans', sans-serif);
            font-size: 24px; font-weight: 800; color: #fff; margin-bottom: 18px;
            text-align: center;
            letter-spacing: -0.01em;
          }
          .laden-gallery {
            display: grid; gap: 12px;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          }
          .laden-gallery-item {
            position: relative; aspect-ratio: 4/3;
            border-radius: 16px; overflow: hidden;
            border: 1px solid rgba(255,255,255,0.09);
            box-shadow:
              inset 0 1px 0 rgba(255,255,255,0.05),
              0 12px 28px rgba(0,0,0,0.35);
          }

          .laden-bottom-cta {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            background: linear-gradient(180deg, rgba(255,255,255,0.075), rgba(255,255,255,0.032));
            border: 1px solid rgba(255,255,255,0.10);
            border-radius: 28px;
            padding: 40px 28px;
            max-width: 700px; margin: 0 auto;
            box-shadow:
              inset 0 1px 0 rgba(255,255,255,0.08),
              0 20px 56px rgba(0,0,0,0.38);
            backdrop-filter: blur(16px) saturate(1.25);
            -webkit-backdrop-filter: blur(16px) saturate(1.25);
            position: relative;
            overflow: hidden;
          }
          .laden-bottom-cta::before {
            content: "";
            position: absolute;
            top: -2px; left: 28px; right: 28px;
            height: 2px;
            background: linear-gradient(90deg, transparent, rgba(255, 167, 38, 0.95), transparent);
            opacity: 0.85;
          }
          .laden-bottom-cta h2 {
            font-family: var(--font-landing-jakarta, 'Plus Jakarta Sans', sans-serif);
            font-size: 26px; font-weight: 900; color: #fff;
            margin-bottom: 10px;
            letter-spacing: -0.02em;
          }
          .laden-bottom-cta p {
            font-size: 15px; color: rgba(255,255,255,0.72); margin-bottom: 22px;
            max-width: 520px;
          }
          .laden-bottom-cta .laden-btn-primary {
            justify-content: center;
            align-self: center;
          }

          @media (max-width: 480px) {
            .laden-hero { min-height: 420px; }
            .laden-hero-content { padding: 48px 20px 36px; }
            .laden-bottom-cta {
              margin-inline: 20px;
              padding: 34px 22px;
            }
            .laden-bottom-cta .laden-btn-primary {
              width: 100%;
              max-width: 280px;
            }
          }
          @media (max-width: 760px) {
            .laden-news-grid {
              grid-template-columns: 1fr;
            }
            .laden-news-card-featured {
              min-height: 230px;
            }
          }
        `}</style>
      </main>
    </CustomerPageShell>
  )
}
