'use client'

import Link from 'next/link'

type Props = {
  slug: string
  restaurantName: string
  isLoggedIn: boolean
  userInitial?: string
}

export function SiteNav({ slug, restaurantName, isLoggedIn, userInitial }: Props) {
  return (
    <nav className="site-top-nav site-top-nav--hero" aria-label="Hauptnavigation">
      {/* Linke Seite — Restaurantname */}
      <div className="site-top-nav-start">
        <span className="nav-cta">{restaurantName}</span>
      </div>

      {/* Mitte — Glas-Navigationsleiste */}
      <div className="site-nav-glass">
        <div className="site-nav-links">
          <div className="site-nav-link-wrap">
            <Link
              href={`/${slug}`}
              className="site-nav-link site-nav-link--home is-active"
              aria-label="Startseite"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </Link>
          </div>
          <div className="site-nav-link-wrap">
            <Link href={`#bestellen`} className="site-nav-link">
              Menü
            </Link>
          </div>
          <div className="site-nav-link-wrap">
            <Link href={`/${slug}/order`} className="site-nav-link">
              Bestellen
            </Link>
          </div>
        </div>
      </div>

      {/* Rechte Seite — Mein Bereich / Login */}
      <div className="site-top-nav-actions">
        {isLoggedIn ? (
          <Link href={`/${slug}/konto`} className="nav-cta" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900 }}>
              {userInitial ?? '•'}
            </span>
            Mein Bereich
          </Link>
        ) : (
          <Link href={`/${slug}/auth`} className="nav-cta" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            Mein Bereich
          </Link>
        )}
      </div>
    </nav>
  )
}
