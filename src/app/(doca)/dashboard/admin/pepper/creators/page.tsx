import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { requireAdmin } from "@/lib/auth";
import { compactNumber, initials } from "@/lib/pepper/format";
import type { PepperCreator, PepperTier } from "@/lib/pepper/types";
import { createClient } from "@/utils/supabase/server";

import { deleteCreator, moveCreator, toggleCreatorPublished } from "./actions";
import { CreatorForm, type UserOption } from "./creator-form";

export const metadata: Metadata = { title: "Pepper · Casting" };
export const revalidate = 0;

const TIER_LABEL: Record<PepperTier, string> = {
  rising: "Rising",
  core: "Core",
  headline: "Headline",
};

const TIER_BG: Record<PepperTier, string> = {
  rising: "bg-neon-blue",
  core: "bg-neon-green",
  headline: "bg-neon-magenta",
};

function CreatorThumb({ creator }: { creator: PepperCreator }) {
  if (creator.avatar_url) {
    return (
      <Image
        src={creator.avatar_url}
        alt={creator.name}
        width={48}
        height={48}
        unoptimized={!creator.avatar_url.startsWith("/")}
        className="h-12 w-12 shrink-0 rounded-full border border-concrete object-cover"
      />
    );
  }
  return (
    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-concrete bg-smoke font-display text-lg text-ash">
      {initials(creator.name)}
    </span>
  );
}

export default async function PepperCreatorsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  await requireAdmin();
  const supabase = await createClient();

  const { edit: editId } = await searchParams;

  const [{ data: creatorsData }, { data: usersData }] = await Promise.all([
    supabase
      .from("pepper_creators")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase.from("users").select("id, full_name, email").order("full_name", { ascending: true }),
  ]);

  const creators = (creatorsData ?? []) as PepperCreator[];
  const usersRaw = (usersData ?? []) as { id: string; full_name: string | null; email: string | null }[];

  const userLabel = new Map(usersRaw.map((u) => [u.id, u.full_name || u.email || u.id]));
  const users: UserOption[] = usersRaw.map((u) => ({
    id: u.id,
    label: u.full_name && u.email ? `${u.full_name} (${u.email})` : u.full_name || u.email || u.id,
  }));

  const editCreator = editId ? creators.find((c) => c.id === editId) : undefined;

  return (
    <div className="grid gap-14 lg:grid-cols-[1fr_400px]">
      {/* ============ COLUNA ESQUERDA — LISTAGEM ============ */}
      <div>
        <h2 className="mb-5 border-b border-concrete pb-3 font-display text-4xl">
          <span className="text-bone">O</span> <span className="neon neon-blue">CASTING</span>
        </h2>

        {creators.length === 0 ? (
          <p className="stamp py-6">Nenhum creator cadastrado ainda.</p>
        ) : (
          <ul className="space-y-3">
            {creators.map((c, index) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-4 border border-concrete bg-ink px-4 py-3"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="flex shrink-0 flex-col gap-1">
                    <form action={moveCreator}>
                      <input type="hidden" name="creator_id" value={c.id} />
                      <input type="hidden" name="direction" value="up" />
                      <button
                        type="submit"
                        disabled={index === 0}
                        aria-label={`Subir ${c.name}`}
                        className="btn-ghost !px-2 !py-1 !text-xs disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        ↑
                      </button>
                    </form>
                    <form action={moveCreator}>
                      <input type="hidden" name="creator_id" value={c.id} />
                      <input type="hidden" name="direction" value="down" />
                      <button
                        type="submit"
                        disabled={index === creators.length - 1}
                        aria-label={`Descer ${c.name}`}
                        className="btn-ghost !px-2 !py-1 !text-xs disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        ↓
                      </button>
                    </form>
                  </div>
                  <CreatorThumb creator={c} />
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-display text-2xl text-bone">
                      <span className="truncate">{c.name}</span>
                      <span className={`skew-tag shrink-0 px-2 py-0.5 font-tech text-[0.6rem] font-bold tracking-widest text-void ${TIER_BG[c.tier]}`}>
                        {TIER_LABEL[c.tier]}
                      </span>
                      {!c.is_published && (
                        <span className="stamp shrink-0 text-[0.6rem] text-ash">rascunho</span>
                      )}
                    </p>
                    <p className="stamp truncate">
                      /{c.slug} · {compactNumber(c.followers_instagram + c.followers_tiktok)} de alcance ·{" "}
                      {c.user_id ? `conta: ${userLabel.get(c.user_id) ?? "—"}` : "sem conta vinculada"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <form action={toggleCreatorPublished}>
                    <input type="hidden" name="creator_id" value={c.id} />
                    <input type="hidden" name="publish" value={c.is_published ? "false" : "true"} />
                    <button type="submit" className="btn-ghost neon-blue !px-3 !py-1.5 !text-xs">
                      {c.is_published ? "Ocultar" : "Publicar"}
                    </button>
                  </form>

                  <Link
                    href={`/dashboard/admin/pepper/creators?edit=${c.id}`}
                    className="btn-ghost text-bone hover:text-neon-purple !px-3 !py-1.5 !text-xs"
                  >
                    Editar
                  </Link>

                  <form action={deleteCreator}>
                    <input type="hidden" name="creator_id" value={c.id} />
                    <button type="submit" className="btn-ghost neon-red !px-3 !py-1.5 !text-xs">
                      Apagar
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ============ COLUNA DIREITA — FORMULÁRIO ============ */}
      <aside className="lg:sticky lg:top-28 lg:self-start">
        <div className="tape concrete border border-concrete p-6">
          <h2 className="mb-6 font-display text-3xl">
            <span className="neon neon-magenta">{editCreator ? "EDITAR" : "NOVO"}</span>{" "}
            <span className="text-bone">CREATOR</span>
          </h2>
          <CreatorForm key={editCreator?.id || "new"} initialData={editCreator} users={users} />
        </div>
      </aside>
    </div>
  );
}
