"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

export interface GalleryItem {
  id: string;
  url: string;
  thumbnail_url?: string | null;
  type: "photo" | "video";
  caption?: string | null;
  credit?: string | null;
  eventTitle?: string | null;
}

/** Padrão de alturas para quebrar o ritmo do grid (parede de lambe-lambe). */
const SPANS = [
  "row-span-2",
  "row-span-3",
  "row-span-2",
  "row-span-4",
  "row-span-3",
  "row-span-2",
  "row-span-3",
  "row-span-2",
];

const TILTS = ["-rotate-1", "rotate-1", "rotate-0", "-rotate-2", "rotate-2"];

export function GalleryGrid({ items }: { items: GalleryItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const close = useCallback(() => setOpenIndex(null), []);
  const go = useCallback(
    (delta: number) =>
      setOpenIndex((current) =>
        current === null
          ? null
          : (current + delta + items.length) % items.length,
      ),
    [items.length],
  );

  useEffect(() => {
    if (openIndex === null) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key === "ArrowRight") go(1);
      if (event.key === "ArrowLeft") go(-1);
    };

    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [openIndex, close, go]);

  if (items.length === 0) {
    return (
      <div className="fence border border-concrete px-6 py-20 text-center">
        <p className="font-display text-4xl text-bone/70">Nada aqui ainda</p>
        <p className="stamp mt-3">O filme ainda está sendo revelado</p>
      </div>
    );
  }

  const active = openIndex === null ? null : items[openIndex];

  return (
    <>
      <div className="grid auto-rows-[34px] grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {items.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setOpenIndex(index)}
            className={`group scanlines relative overflow-hidden border border-concrete bg-ink transition-all duration-200 hover:z-10 hover:border-neon-magenta hover:shadow-[0_0_38px_-6px_var(--color-neon-magenta)] ${
              SPANS[index % SPANS.length]
            } ${TILTS[index % TILTS.length]} hover:rotate-0`}
            aria-label={`Abrir ${item.caption ?? "mídia"} em tela cheia`}
          >
            {item.type === "video" ? (
              <video
                src={item.url}
                muted
                loop
                playsInline
                preload="metadata"
                className="h-full w-full object-cover opacity-85 transition-all duration-300 group-hover:scale-105 group-hover:opacity-100"
                onMouseEnter={(e) => void e.currentTarget.play()}
                onMouseLeave={(e) => e.currentTarget.pause()}
              />
            ) : (
              <Image
                src={item.thumbnail_url || item.url}
                alt={item.caption ?? "Registro da noite no Doca Bar"}
                fill
                unoptimized={!item.url.startsWith("/")}
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className="object-cover opacity-85 grayscale-[35%] transition-all duration-300 group-hover:scale-105 group-hover:opacity-100 group-hover:grayscale-0"
              />
            )}

            {/* selo de vídeo */}
            {item.type === "video" && (
              <span className="absolute left-2 top-2 z-10 bg-neon-red px-1.5 py-0.5 font-tech text-[0.6rem] font-bold tracking-widest text-void">
                VÍDEO
              </span>
            )}

            {/* legenda no hover */}
            <span className="pointer-events-none absolute inset-x-0 bottom-0 z-10 translate-y-full bg-gradient-to-t from-void via-void/85 to-transparent p-3 text-left transition-transform duration-200 group-hover:translate-y-0">
              {item.eventTitle && (
                <span className="block font-display text-sm leading-tight text-bone">
                  {item.eventTitle}
                </span>
              )}
              {item.credit && (
                <span className="stamp block text-[0.6rem] text-neon-blue">
                  © {item.credit}
                </span>
              )}
            </span>
          </button>
        ))}
      </div>

      {/* ---------------- Lightbox ---------------- */}
      {active && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Visualizador de mídia"
          className="fixed inset-0 z-[200] flex items-center justify-center bg-void/97 p-4 backdrop-blur-sm"
          onClick={close}
        >
          <button
            type="button"
            onClick={close}
            aria-label="Fechar"
            className="absolute right-4 top-4 z-10 font-display text-4xl leading-none text-bone transition-colors hover:text-neon-red"
          >
            ×
          </button>

          {items.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Anterior"
                onClick={(e) => {
                  e.stopPropagation();
                  go(-1);
                }}
                className="absolute left-2 z-10 px-3 py-6 font-display text-3xl text-bone/60 transition-colors hover:text-neon-blue sm:left-6"
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="Próxima"
                onClick={(e) => {
                  e.stopPropagation();
                  go(1);
                }}
                className="absolute right-2 z-10 px-3 py-6 font-display text-3xl text-bone/60 transition-colors hover:text-neon-blue sm:right-6"
              >
                ›
              </button>
            </>
          )}

          <figure
            className="relative max-h-[86vh] w-full max-w-5xl"
            onClick={(e) => e.stopPropagation()}
          >
            {active.type === "video" ? (
              <video
                src={active.url}
                controls
                autoPlay
                playsInline
                className="max-h-[76vh] w-full border border-concrete object-contain"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={active.url}
                alt={active.caption ?? "Registro da noite no Doca Bar"}
                className="mx-auto max-h-[76vh] w-auto border border-concrete object-contain"
              />
            )}

            <figcaption className="mt-4 flex flex-wrap items-baseline justify-between gap-2 border-t border-concrete pt-3">
              <span className="font-display text-xl text-bone">
                {active.eventTitle ?? "Doca Bar"}
              </span>
              <span className="stamp">
                {active.credit ? `foto: ${active.credit}` : "acervo da casa"} ·{" "}
                {openIndex! + 1}/{items.length}
              </span>
            </figcaption>
          </figure>
        </div>
      )}
    </>
  );
}
