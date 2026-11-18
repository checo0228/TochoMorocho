import type { Metadata, Viewport } from "next";
import { Anton, IBM_Plex_Mono, Onest } from "next/font/google";
import "./globals.css";

const anton = Anton({ weight: "400", subsets: ["latin"], variable: "--font-anton" });
const onest = Onest({ subsets: ["latin"], variable: "--font-onest" });
const plexMono = IBM_Plex_Mono({ weight: ["500", "600"], subsets: ["latin"], variable: "--font-plex-mono" });

export const metadata: Metadata = {
  title: "Etiquetas · De Tocho Morocho",
  description: "Etiquetas de precio con código de barras para la tienda.",
  icons: { icon: "/marca/panda.png" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#faf7f2" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-MX" className={`${anton.variable} ${onest.variable} ${plexMono.variable}`}>
      <body className="min-h-dvh font-sans antialiased">{children}</body>
    </html>
  );
}
