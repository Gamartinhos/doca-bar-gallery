import type { Metadata, Viewport } from "next";
import {
  Anton,
  Barlow_Condensed,
  Chakra_Petch,
  Permanent_Marker,
} from "next/font/google";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

import "./globals.css";

const anton = Anton({
  variable: "--font-anton",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const marker = Permanent_Marker({
  variable: "--font-marker",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const condensed = Barlow_Condensed({
  variable: "--font-condensed",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const tech = Chakra_Petch({
  variable: "--font-tech",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://doca-bar-gallery.vercel.app"),
  title: {
    default: "DOCA BAR — Registro das noites",
    template: "%s · DOCA BAR",
  },
  description:
    "Galeria oficial do Doca Bar. Fotos e vídeos das noites, dos bailes e da rua. Grafite, neon e barulho.",
  keywords: [
    "doca bar",
    "doca lapa",
    "baile",
    "rave",
    "reggae",
    "fotografia de festa",
    "lapa",
  ],
  openGraph: {
    title: "DOCA BAR — Registro das noites",
    description:
      "Galeria oficial do Doca Bar. Fotos e vídeos das noites, dos bailes e da rua.",
    type: "website",
    locale: "pt_BR",
  },
};

export const viewport: Viewport = {
  themeColor: "#050309",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="pt-BR"
      className={`${anton.variable} ${marker.variable} ${condensed.variable} ${tech.variable} h-full antialiased`}
    >
      <body className="grain flex min-h-full flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
