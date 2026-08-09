import Link from "next/link";

import { EventCard } from "@/components/event-card";
import { GalleryGrid, type GalleryItem } from "@/components/gallery-grid";
import { Marquee } from "@/components/marquee";
import type { DocaEvent, DocaMedia } from "@/lib/database.types";
import { createClient } from "@/utils/supabase/server";

export const revalidate = 0;

export default async function HomePage() {
  const supabase = await createClient();

  const { data: eventsData } = await supabase
    .from("events")
    .select("*")
    .eq("is_published", true)
    .order("date", { ascending: false });

  const events = (eventsData ?? []) as DocaEvent[];
  const publishedIds = events.map((e) => e.id);

  // Só mostra mídia de evento publicado: esconder um evento tem que
  // esconder as fotos dele também.
  const [{ data: mediaData }, { data: countRows }] =
    publishedIds.length === 0
      ? [{ data: [] }, { data: [] }]
      : await Promise.all([
          supabase
            .from("media")
            .select("*")
            .eq("status", "approved")
            .in("event_id", publishedIds)
            .order("created_at", { ascending: false })
            .limit(24),
          supabase
            .from("media")
            .select("event_id")
            .eq("status", "approved")
            .in("event_id", publishedIds),
        ]);

  const media = (mediaData ?? []) as DocaMedia[];

  const counts = new Map<string, number>();
  for (const row of (countRows ?? []) as { event_id: string }[]) {
    counts.set(row.event_id, (counts.get(row.event_id) ?? 0) + 1);
  }

  const eventTitleById = new Map(events.map((e) => [e.id, e.title]));

  const galleryItems: GalleryItem[] = media.map((m) => ({
    id: m.id,
    url: m.url,
    thumbnail_url: m.thumbnail_url,
    type: m.type,
    caption: m.caption,
    eventTitle: eventTitleById.get(m.event_id) ?? null,
  }));

  const marqueeItems =
    events.length > 0
      ? events.slice(0, 8).map((e) => e.title.toUpperCase())
      : ["BAILE DO BIGODE", "DUB JUNGLE SYSTEM", "QUINTA FEVER", "B.O.S.S"];

  return (
    <>
      {/* ================= HERO ================= */}
      <section className="concrete relative overflow-hidden border-b border-concrete">
        {/* pichações de fundo */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -left-8 top-10 select-none font-tag text-7xl text-neon-purple/12 sm:text-9xl"
        >
          sem flash
        </span>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-4 bottom-16 select-none font-tag text-6xl text-neon-blue/12 sm:text-8xl"
        >
          lapa 24h
        </span>

        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32">
          <p className="stamp animate-rise mb-6 text-neon-green">
            ▸ Lapa · Rio de Janeiro · Desde sempre
          </p>

          <h1 className="animate-rise font-display text-[clamp(3.6rem,15vw,11rem)] leading-[0.78] tracking-tighter">
            <span className="chromatic block">REGISTRO</span>
            <span className="neon neon-magenta block">DAS NOITES</span>
            <span className="outline-type block">NA DOCA</span>
          </h1>

          <p className="animate-rise mt-8 max-w-xl text-lg leading-relaxed text-bone/75">
            Parede pichada, luz vermelha, som alto. Toda foto e todo vídeo que
            saiu daqui dentro está nesta página — sem filtro, sem curadoria de
            revista.
          </p>

          <div className="animate-rise mt-10 flex flex-wrap gap-4">
            <Link href="#eventos" className="btn-street neon-magenta">
              Ver as noites
            </Link>
            <Link href="/login" className="btn-ghost neon-green">
              Sou fotógrafo
            </Link>
          </div>

          <dl className="mt-16 flex flex-wrap gap-x-12 gap-y-6 border-t border-concrete pt-8">
            <div>
              <dt className="stamp">Eventos</dt>
              <dd className="font-display text-5xl text-neon-blue">
                {String(events.length).padStart(2, "0")}
              </dd>
            </div>
            <div>
              <dt className="stamp">Registros</dt>
              <dd className="font-display text-5xl text-neon-purple">
                {String(countRows?.length ?? 0).padStart(3, "0")}
              </dd>
            </div>
            <div>
              <dt className="stamp">Curadoria</dt>
              <dd className="font-display text-5xl text-neon-red">ZERO</dd>
            </div>
          </dl>
        </div>
      </section>

      <Marquee items={marqueeItems} />

      {/* ================= EVENTOS ================= */}
      <section id="eventos" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <header className="mb-10 flex flex-wrap items-end justify-between gap-4 border-b border-concrete pb-5">
          <h2 className="font-display text-5xl sm:text-6xl">
            <span className="text-bone">AS</span>{" "}
            <span className="neon neon-purple">NOITES</span>
          </h2>
          <p className="stamp">Arquivo por data · mais recente primeiro</p>
        </header>

        {events.length === 0 ? (
          <div className="fence border border-concrete px-6 py-20 text-center">
            <p className="font-display text-4xl text-bone/70">
              Nenhum evento publicado
            </p>
            <p className="stamp mt-3">
              O admin ainda não abriu a primeira noite
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <EventCard
                key={event.id}
                slug={event.slug}
                title={event.title}
                date={event.date}
                coverImage={event.cover_image}
                accent={event.accent}
                mediaCount={counts.get(event.id) ?? 0}
              />
            ))}
          </div>
        )}
      </section>

      {/* ================= FLASHES ================= */}
      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6">
        <header className="mb-10 flex flex-wrap items-end justify-between gap-4 border-b border-concrete pb-5">
          <h2 className="font-display text-5xl sm:text-6xl">
            <span className="text-bone">ÚLTIMOS</span>{" "}
            <span className="neon neon-blue">FLASHES</span>
          </h2>
          <p className="stamp">Direto da pista</p>
        </header>

        <GalleryGrid items={galleryItems} />
      </section>

      {/* ================= CTA ================= */}
      <section className="fence border-y border-concrete">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-6 px-4 py-14 sm:px-6">
          <div>
            <h2 className="font-display text-4xl sm:text-5xl">
              <span className="neon neon-green">FOTOGRAFOU</span>{" "}
              <span className="text-bone">AQUI?</span>
            </h2>
            <p className="mt-3 max-w-md text-bone/70">
              Peça credencial, espere a casa aprovar e suba seu material direto
              na galeria oficial.
            </p>
          </div>
          <Link href="/login?modo=cadastro" className="btn-street neon-green">
            Pedir credencial
          </Link>
        </div>
      </section>
    </>
  );
}
