import { redirect } from 'next/navigation'

/**
 * Root route → redirect to Odi's Bowl tenant.
 * Für Mehrstandort-Betrieb hier eine Tenant-Auswahl-Seite einfügen.
 */
export default function RootPage() {
  redirect('/odis-bowl')
}
