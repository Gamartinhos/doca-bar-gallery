import type { Metadata, Viewport } from "next";
import { Archivo, Inter, JetBrains_Mono } from "next/font/google";

import { PepperFooter } from "@/components/pepper/pepper-footer";
import { PepperHeader } from "@/components/pepper/pepper-header";

import "./pepper.css";

/**
 * Casca da Pepper.
 *
 * Marca própria dentro do mesmo app do Doca: outro logotipo, outra paleta,
 * outra tipografia — e nenhuma linha de CSS que escape daqui, porque tudo
 * em `pepper.css` está atrás de `.pepper-root`.
 *
 * As fontes são carregadas neste layout (e não no root) de propósito: quem
 * abre só o Doca não baixa Archivo/Inter/JetBrains, e quem abre só a Pepper
 * não baixa Anton/Barlow/Chakra.
 */

const display = Archivo({
  variable: "--font-pp-display",
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
  display: "swap",
});

const body = Inter({
  variable: "--font-pp-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-pp-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "PEPPER — Influence in Motion",
    template: "%s · PEPPER",
  },
  description:
    "Agência de influenciadores da noite. Casting de creators de trap, dancehall, moda e rua — orçamento fechado na hora.",
  keywords: [
    "agência de influenciadores",
    "creators",
    "ugc",
    "tiktok",
    "reels",
    "presença vip",
    "marketing de influência",
  ],
  openGraph: {
    title: "PEPPER — Influence in Motion",
    description:
      "Casting de creators da noite. TikTok, Reels, presença VIP e cobertura de evento.",
    type: "website",
    locale: "pt_BR",
  },
};

export const viewport: Viewport = {
  themeColor: "#08070a",
  colorScheme: "dark",
};

export default function PepperLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`pepper-root ${display.variable} ${body.variable} ${mono.variable} flex min-h-full flex-1 flex-col`}
    >
      <PepperHeader />
      <main className="flex-1">{children}</main>
      <PepperFooter />
    </div>
  );
}
