'use client'

type Props = { restaurantName: string; logoUrl?: string }

/**
 * HeroLogo — Pure Text-Brand
 *
 * Bewusst KEIN Logo-Bild mehr. Hintergrund: Logos die einen Slogan-Text als
 * Teil der Grafik enthalten verursachen Slogan-Doppelung mit der h1-Headline.
 * Wir zeigen den Restaurantnamen typografisch als reine Wortmarke. Wenn ein
 * dediziertes slogan-freies Logo-Bild gewünscht ist, kann hier ein <img>
 * ergänzt werden — aktuell ist die Text-Marke der saubere Default.
 */
export function HeroLogo({ restaurantName }: Props) {
  return (
    <div className="hero-textmark" aria-label={restaurantName}>
      {restaurantName}
    </div>
  )
}
