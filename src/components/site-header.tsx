import Image from "next/image";
import Link from "next/link";

import { LogoutButton } from "@/components/logout-button";
import { getCurrentUser, userHasPermission } from "@/lib/auth";

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-50 border-b border-concrete bg-void/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2.5 sm:px-6 lg:flex-nowrap lg:py-3">
        <Link href="/" className="group flex shrink-0 items-center gap-2.5">
          <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-sm border border-neon-gold/45 bg-ink shadow-[0_0_14px_rgba(212,175,55,0.25)] transition-all duration-200 group-hover:scale-105 group-hover:border-gold-bright">
            <Image
              src="/id-visual/d-gold.jfif"
              alt="Emblema DOCA BAR"
              fill
              unoptimized
              sizes="36px"
              className="object-cover"
            />
          </span>
          <span className="flex items-baseline gap-1.5">
            <span className="font-display text-3xl leading-none tracking-tight text-bone transition-colors group-hover:text-gold-bright sm:text-4xl">
              DOCA
            </span>
            <span className="neon neon-orange font-tag text-lg leading-none sm:text-xl">
              bar
            </span>
            <span className="hidden font-tech text-[0.58rem] uppercase tracking-[0.22em] text-neon-gold/80 xl:inline">
              lapa
            </span>
          </span>
        </Link>

        {/* Área de autenticação */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2 lg:order-3">
          {user ? (
            <>
              <Link
                href="/dashboard"
                className="btn-gold !px-3 !py-1.5 !text-xs !shadow-[3px_3px_0_0_#ff4d00] sm:!px-3.5"
              >
                QG da Casa
              </Link>
              {user.role === "admin" && user.is_approved && (
                <Link
                  href="/dashboard/admin"
                  className="stamp px-2 py-1.5 transition-colors hover:text-neon-orange"
                >
                  Admin
                </Link>
              )}
              {userHasPermission(user, "upload") && (
                <Link
                  href="/dashboard/upload"
                  className="stamp px-2 py-1.5 transition-colors hover:text-gold-bright"
                >
                  Upload
                </Link>
              )}
              <LogoutButton />
            </>
          ) : (
            <Link
              href="/login"
              className="btn-street neon-orange !px-3.5 !py-1.5 !text-xs sm:!px-4 sm:!py-2 sm:!text-sm"
            >
              Login
            </Link>
          )}
        </div>

        {/* Navegação principal: scroll horizontal limpo no mobile, inline no desktop */}
        <nav
          aria-label="Navegação principal"
          className="order-3 flex w-full items-center gap-1.5 overflow-x-auto border-t border-concrete/70 pt-2 pb-1 whitespace-nowrap lg:order-2 lg:w-auto lg:justify-center lg:gap-1.5 lg:overflow-visible lg:border-t-0 lg:py-0 xl:gap-2.5"
        >
          <Link
            href="/#agenda"
            className="stamp shrink-0 px-2 py-1.5 text-bone/85 transition-colors hover:text-neon-orange"
          >
            Agenda
          </Link>

          <Link
            href="/camarotes"
            className="stamp inline-flex shrink-0 items-center gap-1.5 rounded-sm border border-neon-gold/45 bg-neon-gold/10 px-2.5 py-1 text-gold-bright transition-colors hover:border-gold-bright hover:bg-neon-gold/20"
          >
            <span>Camarotes</span>
            <span className="bg-neon-gold px-1 py-0.5 font-tech text-[0.55rem] font-bold leading-none tracking-wider text-void">
              VIP
            </span>
          </Link>

          <Link
            href="/aniversario"
            className="stamp shrink-0 px-2 py-1.5 font-bold text-neon-orange transition-colors hover:text-gold-bright"
          >
            Aniversário VIP
          </Link>

          <Link
            href="/cardapio"
            className="stamp shrink-0 px-2 py-1.5 text-bone/85 transition-colors hover:text-gold-bright"
          >
            Cardápio
          </Link>

          <a
            href="https://doca-tour-3d.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="stamp inline-flex shrink-0 items-center gap-1.5 px-2 py-1.5 text-bone/90 transition-colors hover:text-gold-bright"
          >
            <span>Tour 3D ↗</span>
            <span className="border border-neon-gold/60 px-1 py-0.5 font-tech text-[0.55rem] font-bold leading-none tracking-wider text-neon-gold">
              3D
            </span>
          </a>

          <Link
            href="/#galeria"
            className="stamp shrink-0 px-2 py-1.5 text-bone/85 transition-colors hover:text-neon-orange"
          >
            Galeria
          </Link>

          <Link
            href="/#info"
            className="stamp shrink-0 px-2 py-1.5 text-bone/85 transition-colors hover:text-gold-bright"
          >
            Como Chegar
          </Link>
        </nav>
      </div>

      {/* fita de obra sob o cabeçalho */}
      <div className="hazard h-1 opacity-75" aria-hidden="true" />
    </header>
  );
}
