import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { CreatorAvatar } from "@/components/pepper/creator-avatar";
import { TIER_LABEL } from "@/components/pepper/creator-card";
import {
  PortfolioUploader,
  RemoverPecaButton,
} from "@/components/pepper/portfolio-uploader";
import { Reveal } from "@/components/pepper/reveal";
import { requireUser } from "@/lib/auth";
import { getDocaEventOptions, getMyCreatorProfile } from "@/lib/pepper/data";
import type { PepperMedia, PepperMediaStatus } from "@/lib/pepper/types";
import { createClient } from "@/utils/supabase/server";

export const revalidate = 0;

export const metadata: Metadata = {
  title: "Estúdio",
  description: "Área do creator: suba material para o portfólio da Pepper.",
};

const STATUS_ROTULO: Record<PepperMediaStatus, string> = {
  pending: "na fila",
  approved: "no ar",
  rejected: "recusada",
};

const STATUS_CLASSE: Record<PepperMediaStatus, string> = {
  pending: "border-[var(--pp-amber)]/55 bg-[var(--pp-amber)]/12 text-[var(--pp-amber)]",
  approved:
    "border-[var(--pp-glass-brd)] bg-[var(--pp-glass-bg)] text-[var(--pp-mute)]",
  rejected:
    "border-[var(--pp-pepper)]/55 bg-[var(--pp-pepper)]/12 text-[var(--pp-pepper-soft)]",
};

/**
 * Peças do próprio creator, incluindo as que ainda não foram aprovadas.
 *
 * `getPepperMedia` filtra por `status = 'approved'` porque serve o
 * portfólio público. Aqui é o contrário: o creator precisa justamente ver
 * o que está na fila e o que foi recusado.
 */
async function carregarMinhasPecas(creatorId: string): Promise<PepperMedia[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("pepper_media")
      .select("*")
      .eq("creator_id", creatorId)
      .order("created_at", { ascending: false })
      .limit(60);

    if (error) throw error;
    return (data ?? []) as PepperMedia[];
  } catch {
    // Migration 0006 ainda não rodou: o uploader continua na tela, só a
    // grade de histórico fica vazia.
    return [];
  }
}

export default async function PepperEstudioPage() {
  const user = await requireUser("/pepper/estudio");
  const creator = await getMyCreatorProfile(user.id);

  if (!creator) {
    return (
      <div className="mx-auto max-w-3xl px-4 pb-28 pt-20 sm:px-6">
        <span
          aria-hidden="true"
          className="pp-heat left-1/2 top-24 h-80 w-80 -translate-x-1/2 opacity-50"
        />

        <Reveal className="relative">
          <p className="pp-label pp-label-hot">Estúdio do creator</p>

          <h1 className="mt-5 text-[clamp(2.25rem,7vw,4.5rem)]">
            <span className="block text-[var(--pp-chalk)]">Sua ficha</span>
            <span className="pp-hot-text block">ainda não existe</span>
          </h1>

          <div className="pp-glass-lit mt-10 rounded-2xl p-6 sm:p-8">
            <p className="text-[var(--pp-mute)]">
              Seu login{" "}
              <strong className="font-semibold text-[var(--pp-chalk)]">
                {user.email ?? user.full_name ?? "atual"}
              </strong>{" "}
              está ativo, mas ninguém ligou ele a um creator do casting ainda.
              Quem faz esse vínculo é o time da Pepper — assim que a ficha for
              criada, esta página vira seu painel de upload.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/pepper/creators" className="pp-btn">
                Ver o casting
              </Link>
              <Link href="/pepper" className="pp-btn-ghost">
                Voltar pra Pepper
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    );
  }

  const [pecas, eventos] = await Promise.all([
    carregarMinhasPecas(creator.id),
    getDocaEventOptions(),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-28 pt-14 sm:px-6 sm:pt-20">
      <header className="relative">
        <span
          aria-hidden="true"
          className="pp-heat -left-24 -top-32 h-72 w-72 opacity-60"
        />

        <Reveal>
          <p className="pp-label pp-label-hot">Estúdio do creator</p>

          <div className="mt-6 flex flex-wrap items-center gap-5">
            <CreatorAvatar
              name={creator.name}
              slug={creator.slug}
              src={creator.avatar_url}
              size={72}
            />
            <div className="min-w-0">
              <h1 className="text-[clamp(2rem,6vw,3.75rem)] text-[var(--pp-chalk)]">
                {creator.name}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="pp-chip pp-chip-hot">
                  {TIER_LABEL[creator.tier]}
                </span>
                {creator.handle && (
                  <span className="pp-chip">@{creator.handle}</span>
                )}
                <Link
                  href={`/pepper/creators/${creator.slug}`}
                  className="pp-label underline decoration-[var(--pp-fog)] underline-offset-4 transition-colors duration-150 hover:text-[var(--pp-pepper-soft)]"
                >
                  ver meu perfil público
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </header>

      <div className="mt-14">
        <PortfolioUploader
          creatorId={creator.id}
          eventos={eventos}
          credencialLiberada={user.is_approved}
        />
      </div>

      <section className="mt-20">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--pp-glass-brd)] pb-5">
          <h2 className="text-[clamp(1.75rem,4.5vw,2.75rem)]">
            <span className="text-[var(--pp-chalk)]">Suas</span>{" "}
            <span className="pp-hot-text">peças</span>
          </h2>
          <p className="pp-label">
            {String(pecas.length).padStart(2, "0")}{" "}
            {pecas.length === 1 ? "peça" : "peças"} no portfólio
          </p>
        </div>

        {pecas.length === 0 ? (
          <div className="pp-panel mt-8 rounded-2xl px-6 py-16 text-center">
            <p className="font-[family-name:var(--pp-font-display)] text-2xl font-black uppercase tracking-[-0.03em] text-[var(--pp-chalk)]">
              Nada aqui ainda
            </p>
            <p className="pp-label mt-3">
              Sobe o primeiro material aí em cima
            </p>
          </div>
        ) : (
          <ul className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {pecas.map((peca) => (
              <li
                key={peca.id}
                className="pp-card group relative aspect-[4/5] overflow-hidden"
              >
                {peca.type === "video" ? (
                  <video
                    src={peca.url}
                    muted
                    playsInline
                    preload="metadata"
                    className="h-full w-full object-cover opacity-80 transition-opacity duration-300 group-hover:opacity-100"
                  />
                ) : (
                  <Image
                    src={peca.thumbnail_url || peca.url}
                    alt={peca.caption ?? "Peça do portfólio"}
                    fill
                    unoptimized={!peca.url.startsWith("/")}
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className="object-cover opacity-80 transition-all duration-300 group-hover:scale-[1.04] group-hover:opacity-100"
                  />
                )}

                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-t from-[var(--pp-ink)] via-transparent to-transparent"
                />

                <div className="absolute inset-x-0 top-0 z-[4] flex flex-wrap gap-1.5 p-2.5">
                  <span
                    className={`pp-chip !border !text-[0.58rem] ${
                      STATUS_CLASSE[peca.status]
                    }`}
                  >
                    {STATUS_ROTULO[peca.status]}
                  </span>
                  {peca.origin === "doca" && (
                    <span className="pp-chip !text-[0.58rem]">via Doca</span>
                  )}
                </div>

                <div className="absolute inset-x-0 bottom-0 z-[4] flex items-end justify-between gap-2 p-2.5">
                  <p className="pp-label line-clamp-2 text-[0.58rem] text-[var(--pp-chalk)]/80">
                    {peca.caption ?? "sem legenda"}
                  </p>
                  <RemoverPecaButton
                    id={peca.id}
                    rotulo={peca.caption ?? "esta peça"}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
