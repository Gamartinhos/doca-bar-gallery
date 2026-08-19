"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { PepperMedia } from "@/lib/pepper/types";

import { RevealGroup, RevealItem } from "./reveal";

/**
 * Mosaico + lightbox do portfólio do creator.
 *
 * Componente próprio da Pepper: o comportamento de teclado/foco segue o
 * mesmo contrato do visualizador do Doca, mas nenhuma classe é
 * compartilhada — as duas marcas convivem no mesmo app e não podem se
 * misturar no CSS.
 */

type Filtro = "tudo" | "portfolio" | "doca" | "video";

const FILTROS: { id: Filtro; label: string }[] = [
  { id: "tudo", label: "Tudo" },
  { id: "portfolio", label: "Portfólio" },
  { id: "doca", label: "Via Doca" },
  { id: "video", label: "Vídeos" },
];

/**
 * Alturas alternadas do mosaico. A linha base é curta de propósito (72px /
 * 92px): com span de 3 a 5 o ladrilho fica entre ~230px e ~500px, que é
 * proporção de foto de verdade. Linha base alta demais achata todo mundo na
 * mesma tarja e o mosaico vira grid comum.
 */
const SPANS = [
  "row-span-4",
  "row-span-5",
  "row-span-3",
  "row-span-4",
  "row-span-3",
  "row-span-5",
  "row-span-4",
  "row-span-3",
];

const EASE_OUT = "ease-[cubic-bezier(0.22,1,0.36,1)]";

function matchesFilter(item: PepperMedia, filtro: Filtro): boolean {
  if (filtro === "portfolio") return item.origin === "portfolio";
  if (filtro === "doca") return item.origin === "doca";
  if (filtro === "video") return item.type === "video";
  return true;
}

function captionOf(item: PepperMedia): string {
  if (item.caption) return item.caption;
  return item.origin === "doca"
    ? "Registro de uma noite no Doca Bar"
    : "Material de portfólio";
}

export function PortfolioGallery({
  items,
  creatorName,
}: {
  items: PepperMedia[];
  creatorName: string;
}) {
  const [filtro, setFiltro] = useState<Filtro>("tudo");
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  // Quem abriu o lightbox, pra devolver o foco no fechamento.
  const openerRef = useRef<HTMLElement | null>(null);

  const counts = useMemo(
    () => ({
      tudo: items.length,
      portfolio: items.filter((item) => item.origin === "portfolio").length,
      doca: items.filter((item) => item.origin === "doca").length,
      video: items.filter((item) => item.type === "video").length,
    }),
    [items],
  );

  const visible = useMemo(
    () => items.filter((item) => matchesFilter(item, filtro)),
    [items, filtro],
  );

  const close = useCallback(() => setOpenIndex(null), []);
  const go = useCallback(
    (delta: number) =>
      setOpenIndex((current) =>
        current === null
          ? null
          : (current + delta + visible.length) % visible.length,
      ),
    [visible.length],
  );

  const isOpen = openIndex !== null;

  // Abrir/fechar: trava o scroll da página, foca o diálogo e devolve o foco
  // ao ladrilho de origem. Depende só de `isOpen` pra não repetir isso a
  // cada troca de foto.
  useEffect(() => {
    if (!isOpen) return;

    const opener = openerRef.current;
    dialogRef.current?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
      opener?.focus();
    };
  }, [isOpen]);

  // Teclado: Esc fecha, setas navegam, Tab fica preso dentro do diálogo.
  useEffect(() => {
    if (!isOpen) return;

    const dialog = dialogRef.current;

    const focusable = () =>
      Array.from(
        dialog?.querySelectorAll<HTMLElement>(
          'button, [href], video[controls], [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((el) => !el.hasAttribute("disabled"));

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
        return;
      }
      if (event.key === "ArrowRight") {
        go(1);
        return;
      }
      if (event.key === "ArrowLeft") {
        go(-1);
        return;
      }
      if (event.key !== "Tab") return;

      const nodes = focusable();
      if (nodes.length === 0) {
        event.preventDefault();
        return;
      }

      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || active === dialog)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, close, go]);

  if (items.length === 0) {
    return (
      <div className="pp-glass-lit relative overflow-hidden rounded-2xl px-6 py-20 text-center">
        <span
          aria-hidden="true"
          className="pp-heat left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 opacity-40"
        />
        <p className="relative font-[family-name:var(--pp-font-display)] text-[clamp(2rem,6vw,3.25rem)] font-black uppercase leading-none tracking-[-0.04em] text-[var(--pp-chalk)]">
          Portfólio no forno
        </p>
        <p className="pp-label relative mt-4">
          {creatorName} ainda não subiu material aqui
        </p>
      </div>
    );
  }

  const active = openIndex === null ? null : (visible[openIndex] ?? null);
  const position = openIndex === null ? 0 : openIndex + 1;
  const filtrosVisiveis = FILTROS.filter(
    (opcao) => opcao.id === "tudo" || counts[opcao.id] > 0,
  );

  return (
    <>
      <div className="mb-8 flex flex-wrap items-center gap-2">
        {filtrosVisiveis.map((opcao) => (
          <button
            key={opcao.id}
            type="button"
            aria-pressed={filtro === opcao.id}
            onClick={() => {
              setOpenIndex(null);
              setFiltro(opcao.id);
            }}
            className="pp-chip pp-chip-btn"
          >
            {opcao.label}
            <span className="text-[var(--pp-faint)]">{counts[opcao.id]}</span>
          </button>
        ))}

        <p role="status" aria-live="polite" className="pp-label sm:ml-auto">
          {visible.length} {visible.length === 1 ? "peça" : "peças"}
        </p>
      </div>

      <RevealGroup
        stagger={0.05}
        className="grid auto-rows-[72px] grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:auto-rows-[92px] lg:grid-cols-4"
      >
        {visible.map((item, index) => (
          <RevealItem key={item.id} className={SPANS[index % SPANS.length]}>
            <button
              type="button"
              onClick={(event) => {
                openerRef.current = event.currentTarget;
                setOpenIndex(index);
              }}
              aria-label={`Abrir ${
                item.type === "video" ? "vídeo" : "foto"
              } de ${creatorName} em tela cheia: ${captionOf(item)}`}
              className={`group relative block h-full w-full overflow-hidden rounded-2xl border border-[var(--pp-steel)] bg-[var(--pp-graphite)] transition-[transform,border-color,box-shadow] duration-300 ${EASE_OUT} hover:z-[5] hover:-translate-y-1 hover:border-[var(--pp-pepper)] hover:shadow-[0_24px_58px_-28px_var(--pp-pepper)]`}
            >
              {item.type === "video" ? (
                <video
                  src={item.url}
                  poster={item.thumbnail_url ?? undefined}
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  className={`h-full w-full object-cover opacity-85 transition-[transform,opacity] duration-300 ${EASE_OUT} group-hover:scale-[1.06] group-hover:opacity-100`}
                  // play() rejeita se o ponteiro sair antes do vídeo
                  // começar; sem o catch vira DOMException no console.
                  onMouseEnter={(event) => {
                    void event.currentTarget.play().catch(() => {});
                  }}
                  onMouseLeave={(event) => event.currentTarget.pause()}
                />
              ) : (
                <Image
                  src={item.thumbnail_url || item.url}
                  alt={captionOf(item)}
                  fill
                  unoptimized={!(item.thumbnail_url || item.url).startsWith("/")}
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className={`object-cover opacity-85 grayscale-[45%] transition-[transform,opacity,filter] duration-300 ${EASE_OUT} group-hover:scale-[1.06] group-hover:opacity-100 group-hover:grayscale-0`}
                />
              )}

              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--pp-ink)]/70 via-transparent to-transparent opacity-90 transition-opacity duration-300 group-hover:opacity-60"
              />

              <span className="pointer-events-none absolute left-2 top-2 z-[3] flex flex-wrap gap-1.5">
                {item.type === "video" && (
                  <span className="pp-chip pp-chip-hot">vídeo</span>
                )}
                {/* A peça também vive na galeria oficial da casa. */}
                {item.origin === "doca" && (
                  <span className="pp-chip">via Doca</span>
                )}
              </span>

              <span
                className={`pointer-events-none absolute inset-x-0 bottom-0 z-[3] translate-y-full bg-gradient-to-t from-[var(--pp-ink)] via-[var(--pp-ink)]/85 to-transparent p-3 text-left transition-transform duration-300 ${EASE_OUT} group-hover:translate-y-0`}
              >
                <span className="line-clamp-3 block text-[0.82rem] leading-snug text-[var(--pp-chalk)]">
                  {captionOf(item)}
                </span>
              </span>
            </button>
          </RevealItem>
        ))}
      </RevealGroup>

      {/* ------------------------- Lightbox ------------------------- */}
      {active && (
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={`Portfólio de ${creatorName}`}
          tabIndex={-1}
          onClick={close}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-[color-mix(in_oklab,var(--pp-ink)_94%,transparent)] p-4 backdrop-blur-2xl focus:outline-none"
        >
          <button
            type="button"
            onClick={close}
            aria-label="Fechar visualizador"
            className="pp-glass absolute right-4 top-4 z-10 grid h-11 w-11 place-items-center rounded-full text-2xl leading-none text-[var(--pp-chalk)] transition-colors duration-150 hover:border-[var(--pp-pepper)] hover:text-[var(--pp-pepper-soft)]"
          >
            ×
          </button>

          {visible.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Peça anterior"
                onClick={(event) => {
                  event.stopPropagation();
                  go(-1);
                }}
                className="pp-glass absolute left-3 z-10 grid h-11 w-11 place-items-center rounded-full text-2xl leading-none text-[var(--pp-chalk)] transition-colors duration-150 hover:border-[var(--pp-pepper)] hover:text-[var(--pp-pepper-soft)] sm:left-6"
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="Próxima peça"
                onClick={(event) => {
                  event.stopPropagation();
                  go(1);
                }}
                className="pp-glass absolute right-3 z-10 grid h-11 w-11 place-items-center rounded-full text-2xl leading-none text-[var(--pp-chalk)] transition-colors duration-150 hover:border-[var(--pp-pepper)] hover:text-[var(--pp-pepper-soft)] sm:right-6"
              >
                ›
              </button>
            </>
          )}

          <figure
            className="relative w-full max-w-5xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="relative mx-auto h-[64vh] w-full overflow-hidden rounded-2xl border border-[var(--pp-glass-brd)] bg-[var(--pp-asphalt)] sm:h-[68vh]">
              {active.type === "video" ? (
                <video
                  src={active.url}
                  poster={active.thumbnail_url ?? undefined}
                  controls
                  autoPlay
                  playsInline
                  className="h-full w-full object-contain"
                />
              ) : (
                <Image
                  src={active.url}
                  alt={captionOf(active)}
                  fill
                  unoptimized={!active.url.startsWith("/")}
                  sizes="(max-width: 1024px) 100vw, 1024px"
                  className="object-contain"
                />
              )}
            </div>

            <figcaption className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-[var(--pp-glass-brd)] pt-3">
              <span className="flex flex-wrap items-center gap-2">
                {active.type === "video" && (
                  <span className="pp-chip pp-chip-hot">vídeo</span>
                )}
                {active.origin === "doca" && (
                  <span className="pp-chip">via Doca</span>
                )}
                <span className="text-sm text-[var(--pp-mute)]">
                  {captionOf(active)}
                </span>
              </span>
              <span className="pp-label">
                {position} / {visible.length}
              </span>
            </figcaption>
          </figure>
        </div>
      )}
    </>
  );
}
