import Link from 'next/link'
import { getSession, getCustomerProfile } from '@/lib/auth'

const STAMPS_FOR_REWARD = 8

const BENEFITS = [
  'Für jede Bestellung einen Stempel',
  `Nach ${STAMPS_FOR_REWARD} Stempeln: 1 Gericht gratis`,
  'Exklusive Angebote für Stammkunden',
]

function CheckIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

type Props = {
  slug: string
  restaurantId: string
}

export async function VipSection({ slug, restaurantId }: Props) {
  const user = await getSession()

  // ── Nicht eingeloggt: CTA-Karte ─────────────────────────────────────────────
  if (!user) {
    return (
      <div className="vip-section">
        <div className="vip-cta-card reveal">
          <div className="vip-cta-layout">
            <div className="vip-cta-copy">
              <div className="vip-cta-top">
                <span className="vip-cta-badge">VIP Stempelkarte</span>
                <h2 className="vip-cta-title">
                  Sammle Stempel,<br />
                  <span className="vip-cta-em">kassiere Gratis-Essen</span>
                </h2>
                <p className="vip-cta-sub">
                  Registriere dich kostenlos und sammle bei jeder Bestellung einen Stempel.{' '}
                  {STAMPS_FOR_REWARD} Stempel = 1 Gericht umsonst.
                </p>
              </div>

              <ul className="vip-benefits">
                {BENEFITS.map((benefit) => (
                  <li key={benefit} className="vip-benefit-item">
                    <span className="vip-benefit-check">
                      <CheckIcon />
                    </span>
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>

            <div className="vip-preview-card" aria-hidden>
              <div className="vip-preview-top">
                <span>ODI'S VIP</span>
                <strong>{STAMPS_FOR_REWARD}/8</strong>
              </div>
              <div className="vip-preview-stamps">
                {Array.from({ length: STAMPS_FOR_REWARD }).map((_, index) => (
                  <span key={index} className={index < 5 ? 'is-filled' : ''}>
                    {index < 5 ? <CheckIcon /> : null}
                  </span>
                ))}
              </div>
              <p>Jeder Besuch bringt dich näher zur Gratis-Bowl.</p>
            </div>
          </div>

          <div className="vip-cta-actions">
            <Link href={`/${slug}/auth`} className="vip-cta-btn">
              Kostenlos registrieren
            </Link>
            <p className="vip-cta-note">Kein Passwort nötig · Magic Link per E-Mail</p>
          </div>
        </div>
      </div>
    )
  }

  // ── Eingeloggt: Stempelkarten-Dashboard ─────────────────────────────────────
  const profile = await getCustomerProfile(restaurantId, user.id)

  if (!profile) {
    // User eingeloggt, aber noch kein Customer-Eintrag für dieses Restaurant
    return (
      <div className="vip-section">
        <div className="vip-cta-card reveal">
          <div className="vip-cta-top">
            <span className="vip-cta-badge">Willkommen!</span>
            <h2 className="vip-cta-title">Stempelkarte aktivieren</h2>
            <p className="vip-cta-sub">Du bist eingeloggt — aktiviere deine Stempelkarte für dieses Restaurant.</p>
          </div>
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
      <div className="vip-dash reveal">
        {/* Header */}
        <div className="vip-dash-header">
          <div className="vip-dash-greeting">
            <span className="vip-dash-wave">👋</span>
            <div>
              <p className="vip-dash-hi">Hey, {displayName}!</p>
              <p className="vip-dash-sub">Deine Stempelkarte</p>
            </div>
          </div>
          <Link href={`/${slug}/konto`} className="vip-dash-open-btn">
            Mein Bereich →
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
              ? `Noch ${STAMPS_FOR_REWARD - stamps} bis zur nächsten Belohnung`
              : '🎉 Belohnung bereit — frag beim Abholen!'}
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

        {/* CTA */}
        <Link href={`/${slug}/order`} className="vip-dash-cta">
          🍽️ Jetzt bestellen & Stempel sammeln
        </Link>
      </div>
    </div>
  )
}
