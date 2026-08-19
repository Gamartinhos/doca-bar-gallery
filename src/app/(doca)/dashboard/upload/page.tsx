import type { Metadata } from "next";
import Link from "next/link";

import { requireUser } from "@/lib/auth";
import type { DocaEvent, DocaMedia } from "@/lib/database.types";
import { isDriveConfigured } from "@/lib/google-drive";
import { createClient } from "@/utils/supabase/server";

import { Uploader } from "./uploader";

export const metadata: Metadata = { title: "Subir mídia" };
export const revalidate = 0;

export default async function UploadPage() {
  const user = await requireUser("/dashboard/upload");
  const supabase = await createClient();

  const [{ data: eventsData }, { data: mineData }] = await Promise.all([
    supabase
      .from("events")
      .select("id, title, date")
      .order("date", { ascending: false }),
    supabase
      .from("media")
      .select("*")
      .eq("photographer_id", user.id)
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  const events = (eventsData ?? []) as Pick<
    DocaEvent,
    "id" | "title" | "date"
  >[];
  const mine = (mineData ?? []) as DocaMedia[];

  return (
    <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
      <p className="stamp text-neon-green">Área do fotógrafo</p>
      <h1 className="mt-2 font-display text-6xl sm:text-7xl">
        <span className="text-bone">SUBIR</span>{" "}
        <span className="neon neon-green">MÍDIA</span>
      </h1>

      {!user.is_approved ? (
        <div className="mt-12 border border-neon-red bg-neon-red/5 px-6 py-14 text-center">
          <p className="font-display text-4xl text-neon-red">
            CREDENCIAL NA FILA
          </p>
          <p className="mt-4 text-bone/75">
            A casa ainda não liberou seu acesso. Assim que um admin aprovar,
            esta página destrava sozinha.
          </p>
          <Link href="/dashboard" className="btn-ghost neon-red mt-8">
            Voltar pro painel
          </Link>
        </div>
      ) : (
        <div className="mt-12">
          <Uploader
            events={events}
            driveEnabled={isDriveConfigured()}
            photographerId={user.id}
          />
        </div>
      )}

      {/* ---------- histórico ---------- */}
      {mine.length > 0 && (
        <section className="mt-20">
          <h2 className="mb-5 border-b border-concrete pb-3 font-display text-4xl">
            <span className="text-bone">SEUS</span>{" "}
            <span className="neon neon-blue">ÚLTIMOS</span>
          </h2>

          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {mine.map((m) => (
              <li
                key={m.id}
                className="scanlines relative aspect-square overflow-hidden border border-concrete bg-ink"
              >
                {m.type === "video" ? (
                  <video
                    src={m.url}
                    muted
                    preload="metadata"
                    className="h-full w-full object-cover opacity-75"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.thumbnail_url || m.url}
                    alt={m.caption ?? "Mídia enviada"}
                    loading="lazy"
                    className="h-full w-full object-cover opacity-75"
                  />
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
