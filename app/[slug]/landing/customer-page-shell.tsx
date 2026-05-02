'use server'

import { CustomerSiteNav } from '@/lib/themes/odis-bowl'
import type { ReactNode } from 'react'

type Props = {
  slug: string
  restaurantName: string
  children: ReactNode
}

export default async function CustomerPageShell({
  slug,
  // restaurantName wird aktuell nicht im Shell gerendert — die Nav zeigt
  // bereits den Standort/Brand. Prop bleibt für API-Kompatibilität bestehen.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  restaurantName,
  children,
}: Props) {
  return (
    <div className="odis-customer-site odis-landing">
      <CustomerSiteNav basePath={`/${slug}`} />
      {children}
    </div>
  )
}
