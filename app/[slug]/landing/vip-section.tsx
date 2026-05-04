import Link from 'next/link'
import { getSession, getCustomerProfile } from '@/lib/auth'

const STAMPS_FOR_REWARD = 8

// ─── Vorteile der VIP-Mitgliedschaft (sichtbar in beiden Zuständen) ────────────
type Perk = {
  key: string
  title: string
  sub: string
  icon: 'reorder' | 'truck' | 'history' | 'sparkle'
}

const VIP_PERKS: Perk[] = [
  { key: 'reorder',   title: 'Lieblings-Essen',     sub: 'Speichern & 1-Click neu bestellen', icon: 'reorder' },
  { key: 'tracking',  title: 'Live-Lieferansicht',  sub: 'Status in Echtzeit',                icon: 'truck' },
  { key: 'history',   title: 'Bestellverlauf',      sub: 'Alles auf einen Blick',             icon: 'history' },
  { key: 'tipps',     title: 'Persönliche Tipps',   sub: 'Empfehlungen, die zu dir passen',   icon: 'sparkle' },
]

function PerkIcon({ name }: { name: Perk['icon'] }) {
  switch (name) {
    case 'reorder':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12a9 9 0 1 1-3.5-7.1" />
          <polyline points="21 4 21 10 15 10" />
        </svg>
      )
    case 'truck':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="6" width="12" height="10" rx="1.5" />
          <path d="M14 9h4l3 3v4h-7" />
          <circle cx="7"  cy="18" r="2" />
          <circle cx="17" cy="18" r="2" />
        </svg>
      )
    case 'history':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12a9 9 0 1 0 3-6.7" />
          <polyline points="3 4 3 10 9 10" />
          <polyline points="12 7 12 12 15 14" />
        </svg>
      )
    case 'sparkle':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
          <path d="M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" />
        </svg>
      )
  }
}

function CheckIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function VipPerks() {
  return (
    <ul className="vip-perks" aria-label="Deine VIP-Vorteile">
      {VIP_PERKS.map((perk) => (
        <li key={perk.key} className="vip-perk">
          <span className="vip-perk-icon" aria-hidden>
            <PerkIcon name={perk.icon} />
          </span>
          <span className="vip-perk-copy">
            <strong>{perk.title}</strong>
            <em>{perk.sub}</em>
          </span>
        </li>
      ))}
    </ul>
  )
}

type Props = {
  slug: string
  restaurantId: string
}

export async function VipSection({ slug, restaurantId }: Props) {
  const user = await getSession()

  // ── Nicht eingeloggt: CTA-Karte mit Stempel-Loyalty + Vorteils-Grid ─────────
  if (!user) {
    return (
      <div className="vip-section">
        <div className="vip-bridge-tab" aria-hidden>
          <span className="vip-bridge-tab-dot" />
          <span className="vip-bridge-tab-label">VIP</span>
        </div>

        <div className="vip-cta-card reveal">
          <div className="vip-cta-layout">
            <div className="vip-cta-copy">
              <div className="vip-cta-top">
                <span className="vip-cta-badge">VIP · Treue lohnt sich</span>
                <h2 className="vip-cta-title">
                  Sammle Stempel.<br />
                  <span className="vip-cta-em">1 Essen aufs Haus.</span>
                </h2>
                <p className="vip-cta-sub">
                  Registriere dich kostenlos und sammle bei jeder Bestellung automatisch
                  einen Stempel. Nach {STAMPS_FOR_REWARD} Stempeln gibt es ein gratis Essen.
                </p>
              </div>

              <VipPerks />

              <ul className="vip-benefits vip-benefits--inline">
                <li className="vip-benefit-item">
                  <span className="vip-benefit-check"><CheckIcon /></span>
                  Ein Stempel pro Bestellung
                </li>
                <li className="vip-benefit-item">
                  <span className="vip-benefit-check"><CheckIcon /></span>
                  {STAMPS_FOR_REWARD} Stempel = 1 Essen aufs Haus
                </li>
                <li className="vip-benefit-item">
                  <span className="vip-benefit-check"><CheckIcon /></span>
                  Vorteile für echte Stammgäste
                </li>
              </ul>
            </div>

            <div className="vip-preview-card" aria-hidden>
              <div className="vip-preview-top">
                <span>VIP · Stempelkarte</span>
                <strong>5/{STAMPS_FOR_REWARD}</strong>
              </div>
              <div className="vip-preview-stamps">
                {Array.from({ length: STAMPS_FOR_REWARD }).map((_, index) => (
                  <span key={index} className={index < 5 ? 'is-filled' : ''}>
                    {index < 5 ? <CheckIcon /> : null}
                  </span>
                ))}
              </div>
              <p>Jeder Besuch bringt dich näher zum gratis Essen.</p>
            </div>
          </div>

          <div className="vip-cta-actions">
            <Link href={`/${slug}/auth`} className="vip-cta-btn">
              Kostenlos registrieren
            </Link>
            <p className="vip-cta-note">Nur Handynummer und Passwort · jederzeit wieder einloggen</p>
          </div>
        </div>
      </div>
    )
  }

  // ── Eingeloggt: Stempelkarten-Dashboard + sichtbare Vorteile ────────────────
  const profile = await getCustomerProfile(restaurantId, user.id)

  if (!profile) {
    // User eingeloggt, aber noch kein Customer-Eintrag für dieses Restaurant
    return (
      <div className="vip-section">
        <div className="vip-bridge-tab" aria-hidden>
          <span className="vip-bridge-tab-dot" />
          <span className="vip-bridge-tab-label">VIP</span>
        </div>
        <div className="vip-cta-card reveal">
          <div className="vip-cta-top">
            <span className="vip-cta-badge">Willkommen!</span>
            <h2 className="vip-cta-title">Stempelkarte aktivieren</h2>
            <p className="vip-cta-sub">Du bist eingeloggt — aktiviere deine Stempelkarte für dieses Restaurant.</p>
          </div>
          <VipPerks />
          <div className="vip-cta-actions">
            <Link href={`/${slug}/konto`} className="vip-cta-btn">
              Stempelkarte aktivieren
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const stamps = profile.stampCard?.current_stamps ?? 0
  const total = profile.stampCard?.total_stamps ?? 0
  const rewards = profile.stampCard?.redeemed_rewards ?? 0
  const displayName = profile.customer.name ?? user.email.split('@')[0]

  return (
    <div className="vip-section">
      <div className="vip-bridge-tab" aria-hidden>
        <span className="vip-bridge-tab-dot" />
        <span className="vip-bridge-tab-label">VIP</span>
      </div>

      <div className="vip-dash reveal">
        {/* Header */}
        <div className="vip-dash-header">
          <div className="vip-dash-greeting">
            <span className="vip-dash-wave">VIP</span>
            <div>
              <p className="vip-dash-hi">Hey, {displayName}!</p>
              <p className="vip-dash-sub">Deine Stempelkarte</p>
            </div>
          </div>
          <Link href={`/${slug}/konto`} className="vip-dash-open-btn">
            Mein Bereich
          </Link>
        </div>

        {/* Stats */}
        <div className="vip-dash-stats">
          <div className="vip-dash-stat accent">
            <span className="vip-stat-val">{stamps}</span>
            <span className="vip-stat-label">Stempel</span>
          </div>
          <div className="vip-dash-stat-sep" />
          <div className="vip-dash-stat">
            <span className="vip-stat-val">{total}</span>
            <span className="vip-stat-label">Gesamt</span>
          </div>
          <div className="vip-dash-stat-sep" />
          <div className="vip-dash-stat">
            <span className="vip-stat-val">{rewards}</span>
            <span className="vip-stat-label">Belohnungen</span>
          </div>
        </div>

        {/* Stempel-Grid */}
        <div className="vip-dash-stamps">
          <p className="vip-dash-stamps-label">
            {stamps < STAMPS_FOR_REWARD
              ? `Noch ${STAMPS_FOR_REWARD - stamps} bis zum nächsten gratis Essen`
              : 'Belohnung bereit — frag beim Abholen!'}
          </p>
          <div className="vip-stamp-grid">
            {Array.from({ length: STAMPS_FOR_REWARD }).map((_, i) => (
              <div key={i} className={`vip-stamp-slot${i < stamps ? ' filled' : ''}`}>
                {i < stamps && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
            ))}
            <div className="vip-stamp-reward">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
          </div>
        </div>

        {/* Vorteile auch in der Dashboard-Ansicht spiegeln */}
        <VipPerks />

        {/* CTA */}
        <Link href={`/${slug}/order`} className="vip-dash-cta">
          Jetzt bestellen & Stempel sammeln
        </Link>
      </div>
    </div>
  )
}
