'use server'

import type { ReactNode } from 'react'
import { getSession } from '@/lib/auth'
import { SiteNav } from './site-nav'

type Props = {
  slug: string
  restaurantName: string
  children: ReactNode
}

export default async function CustomerPageShell({
  slug,
  restaurantName,
  children,
}: Props) {
  const user = await getSession()

  return (
    <div className="odis-customer-site odis-landing has-glass-nav">
      <SiteNav
        slug={slug}
        restaurantName={restaurantName}
        isLoggedIn={!!user}
        userInitial={user?.email?.charAt(0).toUpperCase()}
      />
      {children}
    </div>
  )
}
