'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ThemeToggle } from './theme-toggle'

type Props = {
  slug: string
  restaurantName: string
  isLoggedIn: boolean
  userInitial?: string
}

export function SiteNav({ slug, isLoggedIn, userInitial }: Props) {
  const pathname = usePathname() ?? ''
  const basePath = `/${slug}`
  const isHome = pathname === basePath || pathname === `${basePath}/`
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`)

  return (
    <nav className="site-top-nav site-top-nav--hero site-top-nav--global" aria-label="Hauptnavigation">
      <div className="site-top-nav-start" aria-hidden />

      {/* Mitte — Glas-Navigationsleiste */}
      <div className="site-nav-glass">
        <div className="site-nav-links">
          <div className="site-nav-link-wrap">
            <Link
              href={basePath}
              className={`site-nav-link site-nav-link--home${isHome ? ' is-active' : ''}`}
              aria-label="Startseite"
              aria-current={isHome ? 'page' : undefined}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </Link>
          </div>
          <div className="site-nav-link-wrap">
            <Link
              href={`${basePath}/speisekarte`}
              className={`site-nav-link${isActive(`${basePath}/speisekarte`) ? ' is-active' : ''}`}
              aria-current={isActive(`${basePath}/speisekarte`) ? 'page' : undefined}
            >
              Speisekarte
            </Link>
          </div>
          <div className="site-nav-link-wrap">
            <Link
              href={`${basePath}/unser-laden`}
              className={`site-nav-link${isActive(`${basePath}/unser-laden`) ? ' is-active' : ''}`}
              aria-current={isActive(`${basePath}/unser-laden`) ? 'page' : undefined}
            >
              Unser Laden
            </Link>
          </div>
          <div className="site-nav-link-wrap">
            <Link
              href={`${basePath}/karriere`}
              className={`site-nav-link${isActive(`${basePath}/karriere`) ? ' is-active' : ''}`}
              aria-current={isActive(`${basePath}/karriere`) ? 'page' : undefined}
            >
              Karriere
            </Link>
          </div>
          <div className="site-nav-link-wrap">
            <Link
              href={`${basePath}/order`}
              className={`site-nav-link site-nav-link--primary${isActive(`${basePath}/order`) ? ' is-active' : ''}`}
              aria-current={isActive(`${basePath}/order`) ? 'page' : undefined}
            >
              Bestellen
            </Link>
          </div>
        </div>
      </div>

      {/* Rechte Seite — Mein Bereich / Login */}
      <div className="site-top-nav-actions">
        <div className="nav-quick-actions">
          <ThemeToggle />

          <Link href={`/${slug}/order`} className="nav-icon-btn nav-icon-btn--cart" aria-label="Warenkorb öffnen">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="8" cy="21" r="1" />
              <circle cx="19" cy="21" r="1" />
              <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h8.72a2 2 0 0 0 1.95-1.57l1.2-5.43H5.12" />
            </svg>
          </Link>

          {isLoggedIn ? (
            <Link href={`/${slug}/konto`} className="nav-icon-btn nav-icon-btn--account" aria-label="Mein Bereich öffnen">
              <span className="nav-user-initial" aria-hidden>
                {userInitial ?? '•'}
              </span>
            </Link>
          ) : (
            <Link href={`/${slug}/auth`} className="nav-icon-btn nav-icon-btn--account" aria-label="Mein Bereich öffnen">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
