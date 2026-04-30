"use client";

import { useCallback, useState } from "react";

type Props = {
  /** Optional: Logo-Pfad. Defaults zu /themes/odis-bowl/logo.png */
  src?: string;
  alt?: string;
  /** Tagline, die im Fallback angezeigt wird, falls Logo fehlt */
  fallbackTag?: string;
};

/** Hero-Markenlogo. Bei Lade-Fehler Tag + Bowl-Emoji als Fallback. */
export function LandingHeroLogo({
  src = "/themes/odis-bowl/logo.png",
  alt = "Odi's Bowl — Frisch, gesund, lecker",
  fallbackTag = "Rheine's freshest Bowl — direkt bei uns",
}: Props) {
  const [useFallback, setUseFallback] = useState(false);

  const onError = useCallback(() => {
    setUseFallback(true);
  }, []);

  if (useFallback) {
    return (
      <div className="hero-fallback-brand">
        <div className="hero-tag">{fallbackTag}</div>
        <span className="hero-bowl" aria-hidden>
          🥣
        </span>
      </div>
    );
  }

  return (
    /* eslint-disable-next-line @next/next/no-img-element -- optionales Logo, onError → Fallback */
    <img
      src={src}
      alt={alt}
      className="hero-logo"
      width={620}
      height={234}
      onError={onError}
    />
  );
}
