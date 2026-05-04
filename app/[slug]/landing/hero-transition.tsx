'use client'

import { useEffect, useRef } from 'react'

type Props = {
  logoUrl: string
  restaurantName: string
  address?: string | null
  phone?: string | null
  phoneHref?: string | null
}

export function HeroTransition({ logoUrl, restaurantName, address, phone, phoneHref }: Props) {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    let frame = 0
    const update = () => {
      frame = 0
      const rect = element.getBoundingClientRect()
      const viewport = window.innerHeight || 1
      const progress = Math.min(1, Math.max(0, (viewport - rect.top) / (viewport + rect.height)))
      element.style.setProperty('--scroll-progress', progress.toFixed(3))
      element.style.setProperty('--stamp-lift', `${((0.5 - progress) * 16).toFixed(2)}px`)
      element.style.setProperty('--stamp-scale', `${(0.94 + progress * 0.08).toFixed(3)}`)
      element.style.setProperty('--stamp-shadow-opacity', `${(0.18 + progress * 0.24).toFixed(3)}`)
      element.style.setProperty('--stamp-shadow-y', `${(18 - progress * 10).toFixed(2)}px`)
      element.style.setProperty('--stamp-shadow-blur', `${(18 - progress * 6).toFixed(2)}px`)
      element.style.setProperty('--stamp-shadow-scale', `${(0.88 + progress * 0.12).toFixed(3)}`)
    }

    const requestUpdate = () => {
      if (frame) return
      frame = window.requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', requestUpdate, { passive: true })
    window.addEventListener('resize', requestUpdate)

    return () => {
      if (frame) window.cancelAnimationFrame(frame)
      window.removeEventListener('scroll', requestUpdate)
      window.removeEventListener('resize', requestUpdate)
    }
  }, [])

  return (
    <section ref={ref} className="hero-luxe-bridge" aria-label={`${restaurantName} Logo-Siegel`}>
      {address && (
        <span className="luxe-bridge-meta luxe-bridge-meta--left">
          <span className="luxe-bridge-meta-icon" aria-hidden>⌖</span>
          <span>
            <em>Standort</em>
            <strong>{address}</strong>
          </span>
        </span>
      )}
      <div className="luxe-orb" aria-hidden>
        <span className="luxe-orb-ring luxe-orb-ring--outer" />
        <span className="luxe-orb-ring luxe-orb-ring--inner" />
        <span className="luxe-orb-core">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoUrl} alt="" />
        </span>
      </div>
      {/* Goldener Faden: Stempel → VIP-Card (Bindeglied) */}
      <span className="luxe-tether" aria-hidden>
        <span className="luxe-tether-dot" />
      </span>
      {phone && phoneHref && (
        <a className="luxe-bridge-meta luxe-bridge-meta--right" href={phoneHref}>
          <span className="luxe-bridge-meta-icon" aria-hidden>☎</span>
          <span>
            <em>Telefon</em>
            <strong>{phone}</strong>
          </span>
        </a>
      )}
    </section>
  )
}
