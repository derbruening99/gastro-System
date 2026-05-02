'use client'

type Props = { restaurantName: string; logoUrl?: string }

export function HeroLogo({ restaurantName, logoUrl }: Props) {
  return (
    <div className="hero-brand" aria-label={restaurantName}>
      {logoUrl && (
        // Native img: Das Logo ist ein lokales, transparentes Brand-Asset ohne Slogan.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="" className="hero-brand-mark" />
      )}
      <span className="hero-textmark">{restaurantName}</span>
    </div>
  )
}
