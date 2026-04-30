import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "../styles/landing.css";
import { CustomerSiteNav } from "../components/CustomerSiteNav";
import { OdisBowlLanding, type OdisBowlLandingProps } from "./OdisBowlLanding";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-landing-inter",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-landing-jakarta",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

type Props = OdisBowlLandingProps;

/**
 * Server-Component-Wrapper: lädt Theme-CSS + Fonts + Wrapper-Div + Top-Nav,
 * rendert dann die Landing-Page.
 *
 * Eine einzige Komponente zum Einbinden — ideal für Multi-Tenant-Shells, die
 * je nach Tenant ein anderes Theme rendern wollen.
 */
export function OdisBowlLandingPage(props: Props) {
  return (
    <div
      className={`odis-landing odis-customer-site ${inter.variable} ${jakarta.variable}`}
    >
      <CustomerSiteNav basePath={props.basePath ?? ""} />
      <OdisBowlLanding {...props} />
    </div>
  );
}
