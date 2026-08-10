import Image from "next/image";
import Link from "next/link";

import type { EventAccent } from "@/lib/database.types";

const ACCENT_CLASS: Record<EventAccent, string> = {
  purple: "neon-purple",
  blue: "neon-blue",
  red: "neon-red",
  green: "neon-green",
};

export function EventCard({
  slug,
  title,
  date,
  coverImage,
  accent,
  mediaCount,
  isUpcoming = false,
}: {
  slug: string;
  title: string;
  date: string;
  coverImage: string | null;
  accent: EventAccent;
  mediaCount: number;
  isUpcoming?: boolean;
}) {
  const accentClass = ACCENT_CLASS[accent] ?? "neon-purple";
  const formatted = new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <Link
      href={`/evento/${slug}`}
      className={`card-slab ${accentClass} group block`}
    >
      <div className="scanlines relative aspect-[4/5] overflow-hidden">
        {coverImage ? (
          <Image
            src={coverImage}
            alt={`Capa do evento ${title}`}
            fill
            unoptimized={!coverImage.startsWith("/")}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover opacity-70 grayscale-[45%] transition-all duration-500 group-hover:scale-105 group-hover:opacity-100 group-hover:grayscale-0"
          />
        ) : (
          <div className="concrete absolute inset-0" />
        )}

        {/* verniz de neon por cima da capa */}
        <div
          className="absolute inset-0 opacity-45 mix-blend-color transition-opacity duration-500 group-hover:opacity-15"
          style={{ background: "var(--neon, #b026ff)" }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-void via-void/45 to-transparent" />

        {/* data carimbada */}
        <span className="absolute left-0 top-4 skew-tag bg-void px-3 py-1 font-tech text-[0.68rem] font-bold uppercase tracking-[0.2em] text-bone">
          {formatted}
        </span>

        <div className="absolute inset-x-0 bottom-0 p-4">
          <h3 className="chromatic text-balance-tight font-display text-3xl leading-[0.86] sm:text-4xl">
            {title}
          </h3>
          {isUpcoming ? (
            <p className="stamp mt-2 flex items-center gap-2 text-bone/80">
               <span className="inline-block h-2 w-2 animate-flicker rounded-full bg-neon-green" />
               Em breve
            </p>
          ) : (
            <p className="stamp mt-2 flex items-center gap-2">
              <span className="inline-block h-2 w-2 animate-flicker rounded-full bg-current" />
              {mediaCount} {mediaCount === 1 ? "registro" : "registros"}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
