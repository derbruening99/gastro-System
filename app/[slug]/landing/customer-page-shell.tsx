'use server'

import { getSession } from '@/lib/auth'
import { SiteNav } from './site-nav'
import type { ReactNode } from 'react'

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
  const userInitial = user?.email?.charAt(0).toUpperCase()

  return (
    <div className="odis-customer-site">
      <SiteNav
        slug={slug}
        restaurantName={restaurantName}
        isLoggedIn={!!user}
        userInitial={userInitial}
      />
      {children}
    </div>
  )
}
