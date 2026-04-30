'use client'

/**
 * TenantContext — macht den Tenant-Datensatz für alle Client Components verfügbar.
 *
 * Flow:
 * 1. app/[slug]/layout.tsx (Server) lädt Tenant aus DB
 * 2. TenantProvider wrапpt den Tree
 * 3. Jede Client Component nutzt useTenant() — kein weiteres DB-Fetching
 */

import { createContext, useContext } from 'react'
import type { Restaurant } from '@/lib/types'

const TenantContext = createContext<Restaurant | null>(null)

export function useTenant(): Restaurant {
  const ctx = useContext(TenantContext)
  if (!ctx) {
    throw new Error('useTenant() muss innerhalb eines <TenantProvider> verwendet werden.')
  }
  return ctx
}

export default function TenantProvider({
  tenant,
  children,
}: {
  tenant: Restaurant
  children: React.ReactNode
}) {
  return (
    <TenantContext.Provider value={tenant}>
      {children}
    </TenantContext.Provider>
  )
}
