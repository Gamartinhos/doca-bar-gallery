import type { Metadata } from "next";
import Link from "next/link";

import type { BirthdayLeadStatus } from "@/lib/database.types";
import { createClient } from "@/utils/supabase/server";

import type { PublicGuestItem } from "./actions";
import { GuestListClient, type PublicBirthdayList } from "./guest-list-client";

export const revalidate = 0;

export const metadata: Metadata = {
  title: "Minha Lista VIP de Aniversário",
  description:
    "Adicione os nomes dos seus convidados para a portaria da Doca Bar e acompanhe a Escadinha VIP em tempo real.",
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const VALID_STATUSES = new Set<BirthdayLeadStatus>([
  "new",
  "contacted",
  "confirmed",
  "attended",
  "cancelled",
]);

function parsePublicBirthdayList(payload: unknown): PublicBirthdayList | null {
  if (!payload || typeof payload !== "object") return null;
  const raw = payload as Record<string, unknown>;

  if (typeof raw.id !== "string" || typeof raw.full_name !== "string") {
    return null;
  }

  const rawStatus = typeof raw.status === "string" ? raw.status : "new";
  const status: BirthdayLeadStatus = VALID_STATUSES.has(
    rawStatus as BirthdayLeadStatus,
  )
    ? (rawStatus as BirthdayLeadStatus)
    : "new";

  const guestsRaw = Array.isArray(raw.guests) ? raw.guests : [];
  const guests: PublicGuestItem[] = [];

  for (const item of guestsRaw) {
    if (!item || typeof item !== "object") continue;
    const g = item as Record<string, unknown>;
    if (typeof g.id !== "string" || typeof g.guest_name !== "string") continue;
    guests.push({
      id: g.id,
      guest_name: g.guest_name,
      document_hint:
        typeof g.document_hint === "string" ? g.document_hint : null,
      checked_in: Boolean(g.checked_in),
      created_at:
        typeof g.created_at === "string"
          ? g.created_at
          : new Date().toISOString(),
    });
  }

  return {
    id: raw.id,
    full_name: raw.full_name,
    event_label:
      typeof raw.event_label === "string" ? raw.event_label : "Evento Doca Bar",
    guest_tier:
      typeof raw.guest_tier === "string" ? raw.guest_tier : "ate_5",
    status,
    extra_checked_in:
      typeof raw.extra_checked_in === "number" &&
      Number.isFinite(raw.extra_checked_in)
        ? Math.max(0, raw.extra_checked_in)
        : 0,
    guests,
  };
}

export default async function BirthdayGuestListPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  let list: PublicBirthdayList | null = null;

  if (UUID_REGEX.test(token)) {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_birthday_list_by_token", {
      p_token: token,
    });

    if (!error && data) {
      list = parsePublicBirthdayList(data);
    }
  }

  if (!list) {
    return (
      <section className="concrete min-h-[70vh] px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-2xl">
          <div className="glass-vip tape p-6 text-center sm:p-10">
            <p className="stamp text-neon-red">Erro 404 · Link inválido</p>
            <h1 className="mt-3 font-display text-5xl text-bone sm:text-6xl">
              LISTA NÃO <span className="neon neon-orange">ENCONTRADA</span>
            </h1>
            <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-bone/80">
              Não encontramos nenhuma lista VIP com este código. Confira se o link
              foi copiado por completo ou faça um novo cadastro de aniversário na
              Doca Bar.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/aniversario" className="btn-gold">
                Criar Minha Lista VIP →
              </Link>
              <Link href="/" className="btn-ghost neon-orange">
                Voltar para a Doca
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="concrete min-h-screen">
      <div className="border-b border-concrete bg-ink/80">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Link
            href="/aniversario"
            className="stamp text-ash transition-colors hover:text-neon-gold"
          >
            ← Regras e Escadinha do Aniversário VIP
          </Link>
          <p className="stamp text-[0.65rem] text-neon-orange">
            Doca Bar · Lapa, SP
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <GuestListClient token={token} initialList={list} />
      </div>
    </div>
  );
}
