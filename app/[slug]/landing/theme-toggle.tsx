'use client'

import { useEffect, useState } from 'react'

type Theme = 'dark' | 'light'

const STORAGE_KEY = 'odis-theme'

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('dark')

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    const nextTheme: Theme = stored === 'light' ? 'light' : 'dark'
    setTheme(nextTheme)
    document.documentElement.dataset.odisTheme = nextTheme
  }, [])

  function toggleTheme() {
    const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark'
    setTheme(nextTheme)
    document.documentElement.dataset.odisTheme = nextTheme
    window.localStorage.setItem(STORAGE_KEY, nextTheme)
  }

  return (
    <button
      type="button"
      className="nav-icon-btn nav-icon-btn--theme"
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Light Mode aktivieren' : 'Dark Mode aktivieren'}
      title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
    >
      {theme === 'dark' ? (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.35" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="m4.93 4.93 1.41 1.41" />
          <path d="m17.66 17.66 1.41 1.41" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="m6.34 17.66-1.41 1.41" />
          <path d="m19.07 4.93-1.41 1.41" />
        </svg>
      ) : (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.35" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 3a6.8 6.8 0 0 0 8.4 8.4A8 8 0 1 1 12 3Z" />
        </svg>
      )}
    </button>
  )
}
