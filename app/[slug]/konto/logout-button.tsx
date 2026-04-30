'use client'

import { createBrowserClient } from '@supabase/ssr'

export function LogoutButton({ slug }: { slug: string }) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = `/${slug}`
  }

  return (
    <button
      onClick={handleLogout}
      style={{
        background: 'rgba(255,255,255,0.12)',
        border: 'none',
        borderRadius: 50,
        padding: '7px 14px',
        fontSize: 13,
        color: 'rgba(255,255,255,0.8)',
        cursor: 'pointer',
        fontFamily: 'inherit',
        transition: 'background 0.2s',
      }}
    >
      Abmelden
    </button>
  )
}
