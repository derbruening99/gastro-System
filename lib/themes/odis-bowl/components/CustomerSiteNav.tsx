"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
  /** Slug-Prefix, z.B. "/odis-bowl". Wenn leer, läuft sie wie im Original Single-Tenant. */
  basePath?: string;
};

function HomeIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <path d="M9 22V12h6v10" />
    </svg>
  );
}

function MeinBereichIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="10" r="3" />
      <path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662" />
    </svg>
  );
}

function StandortIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
      aria-hidden
    >
      <path d="M12 21s7-5.27 7-11a7 7 0 1 0-14 0c0 5.73 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

/**
 * Customer-Top-Nav für Odi's-Bowl Theme.
 *
 * Mit `basePath` für Multi-Tenant-Routing — z.B. basePath="/odis-bowl" generiert
 * Links wie /odis-bowl/speisekarte. Sonst Single-Tenant-konform.
 */
export function CustomerSiteNav({ basePath = "" }: Props) {
  const pathname = usePathname() ?? "/";
  const home = basePath || "/";
  const items = [
    { href: `${basePath}/speisekarte`, label: "Menü" },
    { href: `${basePath}/ueber-uns`, label: "Über uns" },
    { href: `${basePath}/karriere`, label: "Karriere" },
    { href: `${basePath}/unser-laden`, label: "Unser Laden" },
  ];
  const isHome = pathname === home || pathname === `${basePath}` || pathname === `${basePath}/`;
  const standortHref = `${basePath}/unser-laden`;
  const isStandort =
    pathname === standortHref || pathname.startsWith(`${standortHref}/`);

  return (
    <nav
      className={`site-top-nav${isHome ? " site-top-nav--hero" : ""}`}
      aria-label="Hauptnavigation"
    >
      <div className="site-top-nav-start">
        <div className="nav-actions">
          <Link
            className="nav-cta"
            href={standortHref}
            aria-label="Standort Rheine — Unser Laden"
            {...(isStandort ? { "aria-current": "page" as const } : {})}
          >
            <StandortIcon />
            Rheine
          </Link>
        </div>
      </div>
      <div className="site-nav-glass">
        <div className="site-nav-links">
          <span className="site-nav-link-wrap">
            <Link
              href={home}
              className={`site-nav-link site-nav-link--home${isHome ? " is-active" : ""}`}
              aria-label="Startseite"
              {...(isHome ? { "aria-current": "page" as const } : {})}
            >
              <HomeIcon />
            </Link>
          </span>
          {items.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <span key={item.href} className="site-nav-link-wrap">
                <Link
                  href={item.href}
                  className={`site-nav-link${isActive ? " is-active" : ""}`}
                  {...(isActive ? { "aria-current": "page" as const } : {})}
                >
                  {item.label}
                </Link>
              </span>
            );
          })}
        </div>
      </div>
      <div className="site-top-nav-actions">
        <div className="nav-actions">
          <Link className="nav-cta" href={`${basePath}/mein-bereich`}>
            <MeinBereichIcon />
            Mein Bereich
          </Link>
        </div>
      </div>
    </nav>
  );
}
