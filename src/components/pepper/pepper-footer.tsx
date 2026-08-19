import Link from "next/link";

import { Ticker } from "./ticker";

const RODAPE = [
  "INFLUENCE IN MOTION",
  "CASTING DA NOITE",
  "TRAP · DANCEHALL · RUA",
  "PEPPER × DOCA",
];

export function PepperFooter() {
  return (
    <footer className="relative mt-28 overflow-hidden border-t border-[var(--pp-glass-brd)]">
      <Ticker items={RODAPE} className="border-y-0 py-5 opacity-60" reverse />

      <div className="pp-asphalt relative border-t border-[var(--pp-glass-brd)]">
        <span
          aria-hidden="true"
          className="pp-heat left-[-10%] top-[-30%] h-[380px] w-[380px] opacity-40"
        />

        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[var(--pp-flame)] to-[var(--pp-crimson)]">
                <span className="font-[family-name:var(--pp-font-display)] text-xl font-black leading-none text-white">
                  P
                </span>
              </span>
              <span className="font-[family-name:var(--pp-font-display)] text-3xl font-black uppercase leading-none tracking-[-0.04em]">
                Pepper
              </span>
            </div>

            <p className="mt-5 max-w-sm text-sm leading-relaxed text-[var(--pp-mute)]">
              Agência de influenciadores nascida dentro da noite. O mesmo
              ecossistema do Doca Bar: mesmo login, mesma galeria, mesma gente
              que vive a pista.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              <span className="pp-chip pp-chip-hot">
                <span className="pp-live-dot" /> casting aberto
              </span>
              <span className="pp-chip">são paulo · rio · bh</span>
            </div>
          </div>

          <div>
            <h3 className="pp-label mb-4 text-[var(--pp-chalk)]">Agência</h3>
            <ul className="space-y-2.5 text-sm text-[var(--pp-mute)]">
              <li>
                <Link
                  href="/pepper/creators"
                  className="transition-colors duration-150 hover:text-[var(--pp-pepper-soft)]"
                >
                  Casting completo
                </Link>
              </li>
              <li>
                <Link
                  href="/pepper/orcamento"
                  className="transition-colors duration-150 hover:text-[var(--pp-pepper-soft)]"
                >
                  Montar orçamento
                </Link>
              </li>
              <li>
                <Link
                  href="/pepper#servicos"
                  className="transition-colors duration-150 hover:text-[var(--pp-pepper-soft)]"
                >
                  Serviços e formatos
                </Link>
              </li>
              <li>
                <Link
                  href="/pepper/estudio"
                  className="transition-colors duration-150 hover:text-[var(--pp-pepper-soft)]"
                >
                  Estúdio do creator
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="pp-label mb-4 text-[var(--pp-chalk)]">Ecossistema</h3>
            <ul className="space-y-2.5 text-sm text-[var(--pp-mute)]">
              <li>
                <Link
                  href="/"
                  className="transition-colors duration-150 hover:text-[var(--pp-pepper-soft)]"
                >
                  Doca Bar · galeria
                </Link>
              </li>
              <li>
                <Link
                  href="/cardapio"
                  className="transition-colors duration-150 hover:text-[var(--pp-pepper-soft)]"
                >
                  Cardápio da casa
                </Link>
              </li>
              <li>
                <Link
                  href="/login"
                  className="transition-colors duration-150 hover:text-[var(--pp-pepper-soft)]"
                >
                  Entrar / criar conta
                </Link>
              </li>
            </ul>

            <Link href="/pepper/orcamento" className="pp-btn mt-7 !py-2.5">
              Quero um orçamento
            </Link>
          </div>
        </div>

        <div className="border-t border-[var(--pp-glass-brd)] px-4 py-5 sm:px-6">
          <p className="pp-label mx-auto max-w-7xl text-[0.62rem]">
            © {new Date().getFullYear()} Pepper · uma marca do ecossistema Doca
          </p>
        </div>
      </div>
    </footer>
  );
}
