'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'

const HERO_IMAGES = [
  '/Titelbild01.JPG',
  '/Titelbild02.JPG',
  '/Titelbild03.JPG',
] as const

const ROTATION_MS = 12000

export function HeroBackdrop() {
  const [active, setActive] = useState(0)

  useEffect(() => {
    const id = window.setInterval(
      () => setActive((n) => (n + 1) % HERO_IMAGES.length),
      ROTATION_MS,
    )
    return () => window.clearInterval(id)
  }, [])

  return (
    <div className="hero-backdrop" aria-hidden>
      {HERO_IMAGES.map((src, index) => (
        <div
          key={src}
          className={index === active ? 'hero-backdrop-slide is-active' : 'hero-backdrop-slide'}
        >
          <div className="hero-backdrop-zoom">
            <Image
              src={src}
              alt=""
              fill
              sizes="100vw"
              priority={index === 0}
              quality={88}
              className="hero-backdrop-img"
            />
          </div>
        </div>
      ))}
      <div className="hero-backdrop-scrim" />
    </div>
  )
}
