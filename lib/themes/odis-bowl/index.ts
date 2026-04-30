/**
 * Odi's Bowl Theme — Public API.
 *
 * Übernommen aus der neuen Single-Tenant Odi's-Bowl-Codebase und für
 * Multi-Tenant-Verwendung im gastro-system aufbereitet.
 *
 * Verwendung in einer Tenant-Page:
 *
 * ```tsx
 * import { OdisBowlLandingPage } from "@/lib/themes/odis-bowl";
 *
 * export default async function Page({ params }) {
 *   const { slug } = await params;
 *   if (slug === "odis-bowl") {
 *     return <OdisBowlLandingPage basePath={`/${slug}`} />;
 *   }
 *   // ...andere Tenants
 * }
 * ```
 */

export { OdisBowlLanding } from "./pages/OdisBowlLanding";
export type { OdisBowlLandingProps } from "./pages/OdisBowlLanding";
export { OdisBowlLandingPage } from "./pages/OdisBowlLandingPage";

export { LandingHeroBackdrop } from "./components/LandingHeroBackdrop";
export { LandingHeroLogo } from "./components/LandingHeroLogo";
export { LandingScrollEffects } from "./components/LandingScrollEffects";
export { CustomerSiteNav } from "./components/CustomerSiteNav";
