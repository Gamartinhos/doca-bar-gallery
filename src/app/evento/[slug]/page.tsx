import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { GalleryGrid, type GalleryItem } from "@/components/gallery-grid";
import type { DocaEvent, DocaMedia, DocaUser } from "@/lib/database.types";
import { createClient } from "@/utils/supabase/server";

export const revalidate = 0;

type Params = Promise<{ slug: string }>;

async function loadEvent(slug: string) {
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  return { supabase, event: event as DocaEvent | null };
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const { event } = await loadEvent(slug);

  if (!event) return { title: "Evento não encontrado" };

  return {
    title: event.title,
    description:
      event.description ?? `Registros da noite ${event.title} no Doca Bar.`,
    openGraph: {
      title: `${event.title} · DOCA BAR`,
      description: event.description ?? undefined,
      images: event.cover_image ? [event.cover_image] : undefined,
    },
  };
}

export default async function EventPage({ params }: { params: Params }) {
  const { slug } = await params;
  const { supabase, event } = await loadEvent(slug);

  if (!event) notFound();

  const { data: mediaData } = await supabase
    .from("media")
    .select("*")
    .eq("event_id", event.id)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  const media = (mediaData ?? []) as DocaMedia[];

  // Créditos dos fotógrafos
  const photographerIds = [
    ...new Set(media.map((m) => m.photographer_id).filter(Boolean)),
  ] as string[];

  const creditById = new Map<string, string>();
  if (photographerIds.length > 0) {
    const { data: people } = await supabase
      .from("users")
      .select("id, full_name")
      .in("id", photographerIds);

    for (const p of (people ?? []) as Pick<DocaUser, "id" | "full_name">[]) {
      if (p.full_name) creditById.set(p.id, p.full_name);
    }
  }

  const items: GalleryItem[] = media.map((m) => ({
    id: m.id,
    url: m.url,
    thumbnail_url: m.thumbnail_url,
    type: m.type,
    caption: m.caption,
    credit: m.photographer_id ? (creditById.get(m.photographer_id) ?? null) : null,
    eventTitle: event.title,
  }));

  const formatted = new Date(`${event.date}T12:00:00`).toLocaleDateString(
    "pt-BR",
    { day: "2-digit", month: "long", year: "numeric" },
  );

  const photoCount = media.filter((m) => m.type === "photo").length;
  const videoCount = media.filter((m) => m.type === "video").length;

  return (
    <>
      <section className="concrete relative overflow-hidden border-b border-concrete">
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            background:
              "radial-gradient(ellipse 60% 60% at 20% 0%, var(--color-neon-purple), transparent 65%)",
          }}
          aria-hidden="true"
        />

        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
          <Link
            href="/"
            className="stamp inline-block transition-colors hover:text-neon-blue"
          >
            ← Todas as noites
          </Link>

          <p className="stamp mt-8 text-neon-green">{formatted}</p>

          <h1 className="chromatic mt-3 text-balance-tight font-display text-[clamp(3rem,10vw,7.5rem)] leading-[0.82]">
            {event.title}
          </h1>

          {event.description && (
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-bone/75">
              {event.description}
            </p>
          )}

          <dl className="mt-12 flex flex-wrap gap-x-12 gap-y-6 border-t border-concrete pt-8">
            <div>
              <dt className="stamp">Fotos</dt>
              <dd className="font-display text-4xl text-neon-blue">
                {String(photoCount).padStart(2, "0")}
              </dd>
            </div>
            <div>
              <dt className="stamp">Vídeos</dt>
              <dd className="font-display text-4xl text-neon-red">
                {String(videoCount).padStart(2, "0")}
              </dd>
            </div>
            <div>
              <dt className="stamp">Fotógrafos</dt>
              <dd className="font-display text-4xl text-neon-purple">
                {String(photographerIds.length).padStart(2, "0")}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <GalleryGrid items={items} />
      </section>
    </>
  );
}
