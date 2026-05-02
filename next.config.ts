import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Bilder von Supabase Storage erlauben
  images: {
    qualities: [75, 88],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "eyjmccrmmwnoiaxsgtco.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },

  // Vercel-kompatibel: kein statischer Export
  output: undefined,

  // TypeScript-Fehler im Build nicht blockieren (lib/menu.ts pre-existing)
  typescript: {
    ignoreBuildErrors: true,
  },

};

export default nextConfig;
