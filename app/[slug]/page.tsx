import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import { getTenant } from '@/lib/tenant'
import { getMenuByRestaurant } from '@/lib/menu'
import { getSession } from '@/lib/auth'
import { HeroBackdrop } from './landing/hero-backdrop'
import { HeroLogo } from './landing/hero-logo'
import { HeroTransition } from './landing/hero-transition'
import { MenuSection } from './landing/menu-section'
import { ScrollEffects } from './landing/scroll-effects'
import { SiteNav } from './landing/site-nav'
import { VipSection } from './landing/vip-section'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const tenant = await getTenant(slug)
  if (!tenant) return { title: 'Nicht gefunden' }
  return {
    title: `${tenant.name} — Jetzt bestellen`,
    description: `Direkt bei ${tenant.name} bestellen — frisch, schnell, ohne Umwege.`,
  }
}

const HOW_STEPS = [
  { mark: 'CITY', label: 'Standort wählen', sub: 'Du startest im Menü deines Standorts und bestellst direkt dorthin.' },
  { mark: 'BOWL', label: 'Bowl bauen', sub: 'Basis, Protein, Toppings und Sauce sauber kombinieren.' },
  { mark: 'SEND', label: 'Bestellung senden', sub: 'Deine Auswahl geht ohne Umweg an das Odi’s-Team.' },
  { mark: 'PICK', label: 'Frisch abholen', sub: 'Vorbereitet für deine Stadt, sobald die Bestellung eingeht.' },
] as const

// SVGs für Footer-Sociallinks
const InstagramIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
)

const WhatsAppIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zm-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884zm8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
  </svg>
)

export default async function TenantLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  // Parallel laden — kein Waterfall
  const [tenant, user] = await Promise.all([
    getTenant(slug),
    getSession(),
  ])

  if (!tenant) notFound()

  const menu = await getMenuByRestaurant(tenant.id)

  const accent = tenant.primary_color
  const orderHref = `/${slug}/order`
  const kustomizerHref = `/${slug}/kustomizer`
  const logoUrl = tenant.logo_url ?? '/Bowl_Logo.png'
  const userInitial = user?.email?.charAt(0).toUpperCase()
  const displayAddress = slug === 'odis-bowl'
    ? 'Borneplatz 2, 48431 Rheine'
    : tenant.address

  const phoneHref = tenant.phone
    ? `tel:${tenant.phone.replace(/\D/g, '')}`
    : null
  const waHref = tenant.phone
    ? `https://wa.me/${tenant.phone.replace(/\D/g, '')}`
    : null
  const instagramHref = slug === 'odis-bowl'
    ? 'https://www.instagram.com/odis.bowl/'
    : null
  const legalLinks = slug === 'odis-bowl'
    ? {
        impressum: 'https://odis-bowl.de/impressum',
        datenschutz: 'https://odis-bowl.de/datenschutz',
      }
    : {
        impressum: null,
        datenschutz: null,
      }

  return (
    // odis-customer-site aktiviert die Glas-Nav CSS-Klassen
    <div className="odis-landing odis-customer-site">
      <ScrollEffects />

      {/* ── Navigation ─────────────────────────────────────────────── */}
      <SiteNav
        slug={slug}
        restaurantName={tenant.name}
        isLoggedIn={!!user}
        userInitial={userInitial}
      />

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <section className="hero">
        <HeroBackdrop />
        <div className="hero-inner">
          <HeroLogo restaurantName={tenant.name} logoUrl={logoUrl} />
          <h1 className="hero-headline">
            <span className="word w1">Frisch.</span>
            <span className="word w2"><em>Gesund.</em></span>
            <span className="word w3">Lecker.</span>
          </h1>
          <p className="hero-sub">
            Selbst gemacht schmeckt besser. Bestell dein Essen in 60 Sekunden.
          </p>
          <div className="hero-btns">
            <Link
              className="btn-cta"
              href={kustomizerHref}
              style={{ backgroundColor: accent, borderColor: accent }}
            >
              Bowl konfigurieren
            </Link>
            <Link
              className="btn-cta btn-cta-ghost"
              href={orderHref}
            >
              Direkt bestellen
            </Link>
          </div>
        </div>
      </section>

      <HeroTransition
        logoUrl={logoUrl}
        restaurantName={tenant.name}
        address={displayAddress}
        phone={tenant.phone}
        phoneHref={phoneHref}
      />

      {/* Demo Banner */}
      {tenant.is_demo && (
        <div style={{ background: '#f59e0b', color: '#fff', textAlign: 'center', padding: '10px', fontSize: '14px', fontWeight: 600 }}>
          🎯 Demo-Modus — Bestellungen werden nicht gespeichert
        </div>
      )}

      {/* ── 1. Treuecard / VIP — direkt nach Hero, falls eingeloggt ─ */}
      <VipSection slug={slug} restaurantId={tenant.id} />

      {/* ── 2. Menü — Hauptangebot ohne lange Vorrede ────────────── */}
      {menu.length > 0 && (
        <section className="menu-showcase">
          <div className="sec-head reveal">
            <div className="ey">Odi’s Menü</div>
            <h2>Signature Bowls. Direkt bestellbar.</h2>
            <p>Wähle eine fertige Bowl oder stelle dir deine Kombination frisch zusammen.</p>
          </div>

          <div className="products" id="bestellen">
            {/* Konfigurator-Karte — individuell zusammenstellen */}
            <Link
              className="konfig-card reveal"
              href={kustomizerHref}
              style={{ '--card-accent': accent } as React.CSSProperties}
            >
              <div className="konfig-icon" aria-hidden>Mix</div>
              <div className="konfig-text">
                <h4>Bowl nach deinem Geschmack</h4>
                <p>Basis · Protein · Toppings · Sauce · Extras</p>
              </div>
              <div className="konfig-arrow" aria-hidden>›</div>
            </Link>

            <MenuSection menu={menu} slug={slug} accentColor={accent} />
          </div>
        </section>
      )}

      {/* ── 3. Bestellflow — kompakte Glas-Steps mit Bowl-DNA ───── */}
      <section className="flow-steps" aria-labelledby="flow-title">
        <div className="flow-steps-bg" aria-hidden />
        <div className="flow-steps-inner">
          <div className="flow-layout">
            <div className="flow-story">
              <span className="flow-story-kicker">Abholung</span>
              <h2 id="flow-title">Erst Standort. Dann Bowl.</h2>
              <p>
                Odi’s bleibt schnell, weil die Bestellung dort ankommt, wo sie
                vorbereitet wird: am passenden Standort.
              </p>
              <div className="flow-story-meta">
                <span>Kein Umweg</span>
                <strong>Bestellen, abholen, weiter.</strong>
              </div>
            </div>

            <ol className="flow-steps-list">
              {HOW_STEPS.map(({ mark, label, sub }, index) => (
                <li key={label} className="flow-step" style={{ animationDelay: `${0.05 * index}s` }}>
                  <div className="flow-step-num" aria-hidden>0{index + 1}</div>
                  <div className="flow-step-body">
                    <h3 className="flow-step-label">{label}</h3>
                    <p className="flow-step-sub">{sub}</p>
                  </div>
                  <div className="flow-step-mark" aria-hidden>{mark}</div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ── Order CTA ─────────────────────────────────────────────── */}
      <div className="order-section">
        <div className="order-copy">
          <span>Bestellen</span>
          <h2>Deine Bowl wartet nicht lange.</h2>
          <p>Konfigurator öffnen, Speisekarte wählen oder direkt per WhatsApp schreiben.</p>
        </div>

        {/* Primär: Groß & prominent — direkt ins Menü */}
        <Link className="btn-cta-lg" href={kustomizerHref}>
          <span aria-hidden>→</span>
          <span>
            Konfigurator öffnen
            <small>Deine Bowl sauber zusammenstellen</small>
          </span>
        </Link>

        <div className="order-divider"><span>Direktauswahl</span></div>

        {/* Sekundär: Direkt aus der Speisekarte */}
        <Link className="btn-direct" href={orderHref}>
          <span aria-hidden>→</span>
          <span>
            Aus der Speisekarte
            <small>Fertige Bowl wählen und absenden</small>
          </span>
        </Link>

        {/* WhatsApp — nur wenn vorhanden */}
        {waHref && (
          <>
            <div className="order-divider"><span>WhatsApp</span></div>
            <Link className="btn-wa" href={waHref} target="_blank" rel="noopener noreferrer">
              <WhatsAppIcon />
              Direkt via WhatsApp bestellen
            </Link>
          </>
        )}
      </div>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-signature" aria-label={`${tenant.name} — Frisch. Gesund. Lecker.`}>
            <div className="footer-signature-head">
              <span className="footer-signature-mark">
                <Image
                  src={logoUrl}
                  alt=""
                  width={56}
                  height={56}
                  sizes="56px"
                />
              </span>
              <span className="footer-signature-copy">
                <strong>{tenant.name}</strong>
                <span>Frisch. Gesund. Lecker.</span>
              </span>
            </div>

            <div className="footer-social">
              {instagramHref && (
                <a
                  className="footer-social-link"
                  href={instagramHref}
                  aria-label="Instagram"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <InstagramIcon />
                </a>
              )}
              {waHref && (
                <a
                  className="footer-social-link"
                  href={waHref}
                  aria-label="WhatsApp"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <WhatsAppIcon />
                </a>
              )}
            </div>

            <div className="footer-links">
              {legalLinks.impressum && (
                <a href={legalLinks.impressum} target="_blank" rel="noopener noreferrer">
                  Impressum
                </a>
              )}
              {legalLinks.datenschutz && (
                <a href={legalLinks.datenschutz} target="_blank" rel="noopener noreferrer">
                  Datenschutz
                </a>
              )}
              <a href={`/${slug}/unser-laden`}>Standorte</a>
            </div>

            <p className="footer-copy">
              {waHref ? (
                <>
                  Bestellungen sind direkt über{' '}
                  <a
                    href={waHref}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    WhatsApp
                  </a>{' '}
                  möglich.
                </>
              ) : (
                'Bestellungen sind direkt über WhatsApp möglich.'
              )}
            </p>
          </div>
        </div>
      </footer>

      {/* ── FAB ───────────────────────────────────────────────────── */}
      <div className="fab-wrap" id="fabWrap">
        <div className="fab-label">
          <span className="fab-label-wrap-emoji" aria-hidden>→</span>
          <div>
            <span className="fab-label-text">Jetzt bestellen</span>
            <span className="fab-label-sub">Direkt zum Menü</span>
          </div>
        </div>
        <Link
          className="fab-btn"
          href={kustomizerHref}
          aria-label="Jetzt bestellen"
        >
          <span className="fab-emoji" id="fabEmoji">BOWL</span>
        </Link>
      </div>
    </div>
  )
}
