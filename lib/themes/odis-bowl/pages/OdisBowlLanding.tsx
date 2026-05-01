import Link from "next/link";
import { LandingHeroBackdrop } from "../components/LandingHeroBackdrop";
import { LandingHeroLogo } from "../components/LandingHeroLogo";
import { LandingScrollEffects } from "../components/LandingScrollEffects";
import type { MenuCategory } from "@/lib/types";

const LANDING_HOW_STEPS = [
  { emoji: "🥣", label: "Bowl wählen", sub: "Menü oder Konfigurator" },
  { emoji: "💬", label: "Bestellung absenden", sub: "WhatsApp vorausgefüllt" },
  { emoji: "⏱", label: "Abholzeit erhalten", sub: "Wir bestätigen direkt" },
  { emoji: "🎉", label: "Abholen & genießen", sub: "Borneplatz 2, Rheine" },
] as const;

export type OdisBowlLandingProps = {
  /** Slug-Prefix für interne Links, z.B. "/odis-bowl". */
  basePath?: string;
  /** WhatsApp-Telefonnummer (international, ohne +). Default: 4959718041555 */
  whatsappPhone?: string;
  /** WhatsApp-Standard-Text */
  whatsappGreeting?: string;
  /** Adresse / Standort */
  location?: string;
  /** Öffnungszeiten als String */
  openingHours?: string;
  /** Anzeigetext im Footer für Marken-Name */
  brandFooter?: string;
  /** Externe Footer-Links */
  externalLinks?: {
    impressum?: string;
    datenschutz?: string;
    instagram?: string;
  };
  /** Menüdaten für Landing-Vorschau */
  menu?: MenuCategory[];
};

const DEFAULTS: Required<Omit<OdisBowlLandingProps, "basePath">> = {
  whatsappPhone: "4959718041555",
  whatsappGreeting: "Hallo Odi's Bowl, ich möchte bestellen:\n\n",
  location: "Borneplatz 2 · 48431 Rheine",
  openingHours: "Mo–Fr 11–21 Uhr · Sa 12–21 Uhr · So 14–21 Uhr",
  brandFooter: "Odi's Bowl Rheine",
  externalLinks: {
    impressum: "https://odis-bowl.de/impressum",
    datenschutz: "https://odis-bowl.de/datenschutz",
    instagram: "https://www.instagram.com/odis.bowl/",
  },
};

/**
 * Vollständig portierte Odi's-Bowl Landing Page.
 *
 * 1:1 visuell aus der neuen Codebase übernommen — generalisiert für
 * Multi-Tenant-Routing via `basePath`-Prop.
 */
export function OdisBowlLanding({
  basePath = "",
  whatsappPhone = DEFAULTS.whatsappPhone,
  whatsappGreeting = DEFAULTS.whatsappGreeting,
  location = DEFAULTS.location,
  openingHours = DEFAULTS.openingHours,
  brandFooter = DEFAULTS.brandFooter,
  externalLinks = DEFAULTS.externalLinks,
}: OdisBowlLandingProps) {
  const orderHref = `${basePath}/order`;
  const accountHref = `${basePath}/konto`;
  const previewItems = (menu ?? []).flatMap((category) => category.items).slice(0, 6);
  const waUrl = `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(
    whatsappGreeting,
  )}`;

  return (
    <>
      <LandingScrollEffects />

      <section className="hero">
        <LandingHeroBackdrop />
        <div className="hero-inner">
          <LandingHeroLogo />
          <h1 className="hero-headline">
            <span className="word w1">Frisch.</span>
            <span className="word w2">
              <em>Lecker.</em>
            </span>
            <span className="word w3">Deine Bowl.</span>
          </h1>
          <p className="hero-sub">
            Selbst gemacht schmeckt besser. Konfiguriere deine Bowl in 60
            Sekunden.
          </p>
          <div className="hero-btns">
            <Link className="btn-cta" href={orderHref}>
              Jetzt bestellen
            </Link>
            <a
              className="btn-ghost"
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Per WhatsApp bestellen
            </a>
          </div>
          <p className="hero-note">Abholung · {location}</p>
        </div>
      </section>

      <section className="how-quick" aria-labelledby="how-quick-title">
        <div className="how-quick-glow g1" aria-hidden />
        <div className="how-quick-glow g2" aria-hidden />

        <div className="how-quick-inner">
          <div className="how-quick-intro">
            <p className="how-quick-eyebrow">In 4 Schritten</p>
            <h2 id="how-quick-title" className="how-quick-title">
              So bestellst du<br />
              <em className="how-quick-em">deine Bowl</em>
            </h2>
          </div>

          <ol className="how-quick-steps">
            {LANDING_HOW_STEPS.map(({ emoji, label, sub }, index) => (
              <li key={label} className="how-quick-card">
                <span className="how-quick-deco-num" aria-hidden>
                  {index + 1}
                </span>
                <span className="how-quick-emoji" aria-hidden>
                  {emoji}
                </span>
                <span className="how-quick-label">{label}</span>
                <span className="how-quick-sub">{sub}</span>
                {index < LANDING_HOW_STEPS.length - 1 && (
                  <span className="how-quick-arrow" aria-hidden>
                    ›
                  </span>
                )}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <div className="sec-head reveal">
        <div className="ey">Unser Menü</div>
        <h2>Wähle deine Bowl</h2>
        <p>Frisch zubereitet — jeden Tag in Rheine</p>
      </div>

      <div className="products" id="bestellen">
        <Link className="konfig-card reveal" href={orderHref}>
          <div className="konfig-icon" aria-hidden>
            ✨
          </div>
          <div className="konfig-text">
            <h4>Bowl individuell konfigurieren</h4>
            <p>Basis · Zutaten · Sauce · Crunch · Protein</p>
          </div>
          <div className="konfig-arrow" aria-hidden>
            ›
          </div>
        </Link>
        {previewItems.map((item, index) => {
          const variant = index % 3 === 0 ? "featured" : index % 3 === 1 ? "vegan" : "chicken";
          const emoji = index % 3 === 0 ? "🥣" : index % 3 === 1 ? "🥗" : "🍗";
          const badge = index === 0 ? "🔥 Hit" : index % 4 === 2 ? "Neu" : null;

          return (
            <Link key={item.id} className="product-card reveal" href={orderHref}>
              <div className={`prod-visual prod-visu-${variant}`}>
                <span className="prod-emoji" aria-hidden>
                  {emoji}
                </span>
                {badge && <span className="prod-badge badge-new">{badge}</span>}
              </div>
              <div className="prod-body">
                <h4 className="prod-name">{item.name}</h4>
                {item.description && <p className="prod-desc">{item.description}</p>}
                <div className="prod-footer">
                  <span className="prod-price">{`${Number(item.price).toFixed(2)} €`}</span>
                  <span className="prod-btn">Bestellen</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="loyalty-section">
        <div className="sec-head reveal" style={{ padding: "8px 4px 14px" }}>
          <div className="ey">Treuecard</div>
          <h2>
            Zeig uns die Treue.
            <br />
            {"Wir zeigen's dir zurück."}
          </h2>
        </div>
        <Link className="loyalty-card reveal" href={accountHref}>
          <div className="loyalty-top">
            <div className="loyalty-icon" aria-hidden>
              🎯
            </div>
            <div>
              <h3>Bowl-Treuecard</h3>
              <p>Ab Bestellung 1: Stempel sammeln</p>
            </div>
          </div>
          <div className="stamps-row">
            <div className="stamp filled" aria-hidden>
              🥣
            </div>
            <div className="stamp filled" aria-hidden>
              🥣
            </div>
            <div className="stamp filled" aria-hidden>
              🥣
            </div>
            <div className="stamp" />
            <div className="stamp" />
            <div className="stamp" />
            <div className="stamp" />
            <div className="stamp" />
            <div className="stamp reward" aria-hidden>
              🎁
            </div>
          </div>
          <p className="loyalty-note">
            Bei jeder Direktbestellung: <strong>+1 Stempel.</strong>
            <br />
            Ab Bestellung 9 — deine Bowl geht auf uns. Nur über den direkten
            Kanal.
          </p>
          <div className="loyalty-cta">
            <span>Meine Stempel ansehen →</span>
            <span className="arr" aria-hidden>
              ›
            </span>
          </div>
        </Link>
      </div>

      <div className="info-section">
        <div className="info-card reveal">
          <div className="info-row">
            <div className="info-ico" aria-hidden>
              📍
            </div>
            <div>
              <h4>Standort</h4>
              <p>{location}</p>
            </div>
          </div>
          <div className="info-row">
            <div className="info-ico" aria-hidden>
              🕐
            </div>
            <div>
              <h4>Öffnungszeiten</h4>
              <p>{openingHours}</p>
            </div>
          </div>
          <div className="info-row">
            <div className="info-ico" aria-hidden>
              💬
            </div>
            <div>
              <h4>WhatsApp &amp; Bestellungen</h4>
              <p>+{whatsappPhone.replace(/(\d{2})(\d{4})(\d+)/, "$1 $2 $3")}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="order-section reveal">
        <Link className="btn-cta-lg" href={orderHref}>
          <span aria-hidden>🥣</span>
          <span>
            Deine Bowl konfigurieren
            <small>Basis · Zutaten · Sauce · Crunch</small>
          </span>
        </Link>
        <div className="order-divider">
          <span>oder direkt bestellen</span>
        </div>
        <Link className="btn-direct" href={orderHref}>
          <span aria-hidden>📲</span>
          <span>
            Ohne WhatsApp bestellen
            <small>Registrierung · Treuecard · Direktbestellung</small>
          </span>
        </Link>
        <div className="order-divider">
          <span>auch möglich</span>
        </div>
        <a
          className="btn-wa"
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          💬 Direkt via WhatsApp bestellen
        </a>
      </div>

      <footer>
        <strong>{brandFooter}</strong>
        <br />
        {location}
        <br />
        <div className="footer-links">
          {externalLinks?.impressum && (
            <a href={externalLinks.impressum}>Impressum</a>
          )}
          {externalLinks?.datenschutz && (
            <a href={externalLinks.datenschutz}>Datenschutz</a>
          )}
          {externalLinks?.instagram && (
            <a
              href={externalLinks.instagram}
              target="_blank"
              rel="noopener noreferrer"
            >
              Instagram
            </a>
          )}
        </div>
      </footer>

      <div className="fab-wrap" id="fabWrap">
        <div className="fab-label">
          <span className="fab-label-wrap-emoji" aria-hidden>
            🌯
          </span>
          <div>
            <span className="fab-label-text">Jetzt bestellen</span>
            <span className="fab-label-sub">Bowl konfigurieren →</span>
          </div>
        </div>
        <Link
          className="fab-btn"
          href={orderHref}
          aria-label="Bowl jetzt bestellen"
        >
          <span className="fab-emoji" id="fabEmoji">
            🥣
          </span>
        </Link>
      </div>
    </>
  );
}
