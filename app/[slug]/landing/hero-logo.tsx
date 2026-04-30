'use client'

import { useCallback, useState } from 'react'

type Props = { restaurantName: string; logoUrl?: string }

export function HeroLogo({ restaurantName, logoUrl }: Props) {
  const [useFallback, setUseFallback] = useState(false)
  const onError = useCallback(() => setUseFallback(true), [])

  if (useFallback) {
    return (
      <div className="hero-fallback-brand">
        <div className="hero-tag">{restaurantName}</div>
        <span className="hero-bowl" aria-hidden>🥣</span>
      </div>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logoUrl ?? '/logo.png'}
      alt={restaurantName}
      className="hero-logo"
      width={620}
      height={234}
      onError={onError}
    />
  )
}
