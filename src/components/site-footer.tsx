import Image from "next/image";
import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="concrete relative mt-24 border-t border-concrete">
      <div className="hazard h-1 opacity-70" aria-hidden="true" />

      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.1fr_1.1fr_1fr]">
        <div>
          <div className="flex items-center gap-3">
            <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-sm border border-neon-gold/45 bg-ink">
              <Image
                src="/id-visual/d-gold.jfif"
                alt="Emblema DOCA BAR"
                fill
                unoptimized
                sizes="48px"
                className="object-cover"
              />
            </span>
            <div>
              <p className="font-display text-5xl leading-none text-bone">
                DOCA
              </p>
              <p className="neon neon-orange mt-0.5 font-tag text-xl leading-none">
                lapa
              </p>
            </div>
          </div>

          <p className="mt-5 max-w-xs text-sm leading-relaxed text-ash">
            Concreto, neon quente e grave pesado na Lapa. Contracultura de pista
            com camarotes VIP pra fechar a noite no topo.
          </p>

          <div className="mt-5 border-l-2 border-neon-gold/70 pl-3">
            <p className="stamp text-[0.65rem] text-neon-gold">
              Endereço Oficial
            </p>
            <p className="mt-1 text-sm font-medium text-bone">
              Viela Ema Ângelo Murari, 8 — Lapa, São Paulo - SP
            </p>
          </div>
        </div>

        <div>
          <h3 className="stamp mb-4 text-bone">Navegação</h3>
          <ul className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-sm text-bone/80">
            <li>
              <Link
                href="/#agenda"
                className="transition-colors hover:text-neon-orange"
              >
                Agenda
              </Link>
            </li>
            <li>
              <Link
                href="/camarotes"
                className="font-medium text-gold-bright transition-colors hover:text-neon-orange"
              >
                Camarotes VIP
              </Link>
            </li>
            <li>
              <Link
                href="/aniversario"
                className="font-medium text-neon-orange transition-colors hover:text-gold-bright"
              >
                Aniversário VIP
              </Link>
            </li>
            <li>
              <Link
                href="/cardapio"
                className="transition-colors hover:text-gold-bright"
              >
                Cardápio
              </Link>
            </li>
            <li>
              <a
                href="https://doca-tour-3d.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-gold-bright"
              >
                Tour 3D ↗
              </a>
            </li>
            <li>
              <Link
                href="/#galeria"
                className="transition-colors hover:text-neon-orange"
              >
                Galeria
              </Link>
            </li>
            <li>
              <Link
                href="/#info"
                className="transition-colors hover:text-gold-bright"
              >
                Como Chegar
              </Link>
            </li>
            <li>
              <Link
                href="/login"
                className="transition-colors hover:text-neon-orange"
              >
                Área do fotógrafo
              </Link>
            </li>
            <li>
              <Link
                href="/dashboard/upload"
                className="transition-colors hover:text-gold-bright"
              >
                Enviar mídia
              </Link>
            </li>
            <li>
              <Link
                href="/pepper"
                className="transition-colors hover:text-neon-red"
              >
                Pepper · creators
              </Link>
            </li>
          </ul>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="stamp mb-2 text-gold-bright">Reservas & VIP</h3>
            <p className="text-sm leading-relaxed text-ash">
              Camarotes C1–C6, bistrôs ou lista de aniversário VIP direto pelo
              WhatsApp oficial da casa.
            </p>
            <a
              href="https://wa.me/5511972723334"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-gold mt-3 !px-4 !py-2 !text-sm"
            >
              WhatsApp Reservas ↗
            </a>
          </div>

          <div className="border-t border-concrete pt-5">
            <h3 className="stamp mb-2 text-bone">Fotógrafos</h3>
            <p className="text-sm leading-relaxed text-ash">
              Fotografou uma noite na Doca? Peça sua credencial para subir o
              material direto na galeria.
            </p>
            <Link
              href="/login?modo=cadastro"
              className="btn-ghost neon-orange mt-3 !px-4 !py-2 !text-sm"
            >
              Quero credencial
            </Link>
          </div>
        </div>
      </div>

      <div className="border-t border-concrete px-4 py-5 sm:px-6">
        <p className="stamp mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 text-[0.65rem]">
          <span>
            © {new Date().getFullYear()} Doca Bar · Viela Ema Ângelo Murari, 8 —
            Lapa, São Paulo - SP
          </span>
          <span className="text-ash">
            Todas as fotos pertencem a quem apertou o botão
          </span>
        </p>
      </div>
    </footer>
  );
}
