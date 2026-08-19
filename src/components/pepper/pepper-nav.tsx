"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { ScrollProgress } from "./reveal";

export type NavLink = { href: string; label: string };

const LINKS: NavLink[] = [
  { href: "/pepper/creators", label: "Casting" },
  { href: "/pepper/orcamento", label: "Orçamento" },
  { href: "/pepper#servicos", label: "Serviços" },
  { href: "/pepper#como-funciona", label: "Como funciona" },
];

/**
 * Barra da Pepper: vidro que só ganha peso depois que a página sai do topo
 * — no hero ela fica transparente pra headline respirar.
 */
export function PepperNav({ studioHref }: { studioHref: string }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <ScrollProgress />

      <header
        className={`sticky top-0 z-[65] transition-[background-color,border-color,backdrop-filter] duration-300 ${
          scrolled
            ? "border-b border-[var(--pp-glass-brd)] bg-[color-mix(in_oklab,var(--pp-ink)_78%,transparent)] backdrop-blur-xl"
            : "border-b border-transparent"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link
            href="/pepper"
            className="group flex items-center gap-2.5"
            aria-label="Pepper — início"
          >
            <img 
              src="/logo-pepper.png" 
              alt="Pepper" 
              className="h-10 w-auto object-contain transition-transform duration-200 group-hover:scale-105" 
            />
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {LINKS.map((link) => {
              const active =
                link.href.startsWith("/pepper/") &&
                pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`pp-label rounded-full px-3.5 py-2 transition-colors duration-150 hover:text-[var(--pp-chalk)] ${
                    active ? "text-[var(--pp-pepper-soft)]" : ""
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href={studioHref}
              className="pp-btn-ghost hidden !px-4 !py-2 !text-[0.72rem] sm:inline-flex"
            >
              Sou creator
            </Link>
            <Link
              href="/pepper/orcamento"
              className="pp-btn !px-4 !py-2 !text-[0.72rem] sm:!px-5"
            >
              Fazer orçamento
            </Link>

            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="pepper-menu-mobile"
              aria-label={open ? "Fechar menu" : "Abrir menu"}
              className="pp-glass grid h-10 w-10 place-items-center rounded-xl transition-colors duration-150 hover:border-[var(--pp-pepper)] md:hidden"
            >
              <span className="relative block h-3 w-4">
                <span
                  className={`absolute inset-x-0 top-0 h-[2px] bg-current transition-transform duration-200 ${
                    open ? "translate-y-[5px] rotate-45" : ""
                  }`}
                />
                <span
                  className={`absolute inset-x-0 bottom-0 h-[2px] bg-current transition-transform duration-200 ${
                    open ? "-translate-y-[5px] -rotate-45" : ""
                  }`}
                />
              </span>
            </button>
          </div>
        </div>

        {/* Menu mobile: grid-rows de 0fr→1fr anima altura sem medir nada. */}
        <div
          id="pepper-menu-mobile"
          className={`grid overflow-hidden transition-[grid-template-rows] duration-300 md:hidden ${
            open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
        >
          <div className="min-h-0">
            <nav className="flex flex-col gap-1 border-t border-[var(--pp-glass-brd)] bg-[color-mix(in_oklab,var(--pp-ink)_88%,transparent)] px-4 py-4 backdrop-blur-xl sm:px-6">
              {/* Fechar no clique, e não num efeito de rota: o menu mobile
                  não pode ficar aberto por cima da página nova. */}
              {LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="pp-label py-2.5 transition-colors duration-150 hover:text-[var(--pp-pepper-soft)]"
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href={studioHref}
                onClick={() => setOpen(false)}
                className="pp-label py-2.5 text-[var(--pp-ember)] transition-colors duration-150 hover:text-[var(--pp-pepper-soft)]"
              >
                Sou creator
              </Link>
            </nav>
          </div>
        </div>
      </header>
    </>
  );
}
