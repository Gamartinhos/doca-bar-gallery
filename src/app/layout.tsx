import type { Metadata, Viewport } from "next";
import {
  Anton,
  Barlow_Condensed,
  Chakra_Petch,
  Permanent_Marker,
} from "next/font/google";

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
  // NÃO usar "--font-tech": esse é o nome do token do @theme em globals.css.
  // Se os dois tiverem o mesmo nome, o token vira var(--font-tech) apontando
  // pra si mesmo, a declaração é descartada e a fonte nunca aplica.
  variable: "--font-chakra",
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

/**
 * Root layout — só o casco: <html>, <body>, fontes e o CSS global.
 *
 * O cabeçalho e o rodapé do Doca vivem em `(doca)/layout.tsx`, não aqui.
 * Isso é o que permite `/pepper` ter uma casca completamente diferente
 * (outra marca, outra paleta, outra tipografia) sem hack de CSS e sem
 * duplicar <html>/<body>.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="pt-BR"
      // globals.css usa scroll-behavior: smooth. A partir do Next.js 16 o
      // framework só neutraliza isso na navegação se o atributo estiver aqui —
      // sem ele, trocar de página vira um scroll animado até o topo.
      data-scroll-behavior="smooth"
      className={`${anton.variable} ${marker.variable} ${condensed.variable} ${tech.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
