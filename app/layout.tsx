import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gastro System",
  description: "Das smarte Bestellsystem für die Gastronomie",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className="h-full" data-scroll-behavior="smooth">
      <body className="min-h-full flex flex-col bg-gray-50 antialiased">
        {children}
      </body>
    </html>
  );
}
