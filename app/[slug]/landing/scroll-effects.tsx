'use client'

import { useEffect } from 'react'

export function ScrollEffects() {
  useEffect(() => {
    const root = document.querySelector('.odis-landing')
    if (!root) return

    // Reveal-Animationen
    const reveals = root.querySelectorAll('.reveal')
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in')
            obs.unobserve(e.target)
          }
        })
      },
      { threshold: 0.07 },
    )
    reveals.forEach((el) => obs.observe(el))

    // FAB Sichtbarkeit
    const fabWrap = root.querySelector('#fabWrap')
    const hero = root.querySelector('.hero')
    const fabHideSections = root.querySelectorAll(
      '.menu-showcase, .order-section, .site-footer',
    )

    const heroObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!fabWrap) return
          if (!e.isIntersecting) fabWrap.classList.add('visible')
          else fabWrap.classList.remove('visible')
        })
      },
      { threshold: 0.3 },
    )
    if (hero) heroObs.observe(hero)

    let hideObs: IntersectionObserver | null = null
    const hiddenSections = new Set<Element>()
    if (fabHideSections.length > 0 && fabWrap) {
      hideObs = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (!fabWrap) return
            if (e.isIntersecting) hiddenSections.add(e.target)
            else hiddenSections.delete(e.target)

            if (hiddenSections.size > 0) {
              fabWrap.classList.add('fab-dim')
            } else if (fabWrap.classList.contains('visible')) {
              fabWrap.classList.remove('fab-dim')
            }
          })
        },
        { threshold: 0.12 },
      )
      fabHideSections.forEach((section) => hideObs?.observe(section))
    }

    // FAB Emoji-Rotation beim Scrollen
    const fabEmoji = root.querySelector('#fabEmoji')
    let scrollTicking = false
    const onScrollFab = () => {
      if (!fabEmoji || scrollTicking) return
      scrollTicking = true
      requestAnimationFrame(() => {
        ;(fabEmoji as HTMLElement).style.transform = `rotate(${window.scrollY * 0.1}deg)`
        scrollTicking = false
      })
    }
    if (fabEmoji) window.addEventListener('scroll', onScrollFab, { passive: true })

    const onFabClick = () => {
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(12)
    }
    fabWrap?.addEventListener('click', onFabClick)

    return () => {
      obs.disconnect()
      heroObs.disconnect()
      hideObs?.disconnect()
      window.removeEventListener('scroll', onScrollFab)
      fabWrap?.removeEventListener('click', onFabClick)
    }
  }, [])

  return null
}
