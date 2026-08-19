import type { Metadata } from "next";
import Link from "next/link";

import { requireAdmin } from "@/lib/auth";
import { brl } from "@/lib/pepper/format";
import type { PepperQuote, PepperQuoteStatus } from "@/lib/pepper/types";
import { createClient } from "@/utils/supabase/server";

import { QuoteStatusForm } from "./status-form";

export const metadata: Metadata = { title: "Pepper · Orçamentos" };
export const revalidate = 0;

const STATUS_LABEL: Record<PepperQuoteStatus, string> = {
  new: "Novo",
  contacted: "Contatado",
  won: "Ganho",
  lost: "Perdido",
};

const STATUS_BG: Record<PepperQuoteStatus, string> = {
  new: "bg-neon-blue",
  contacted: "bg-neon-purple",
  won: "bg-neon-green",
  lost: "bg-neon-red",
};

const STATUS_FILTERS: { value: PepperQuoteStatus | "all"; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "new", label: "Novos" },
  { value: "contacted", label: "Contatados" },
  { value: "won", label: "Ganhos" },
  { value: "lost", label: "Perdidos" },
];

const PAGE_SIZE = 20;

function toStatusFilter(value: string | undefined): PepperQuoteStatus | "all" {
  const valid: readonly string[] = ["new", "contacted", "won", "lost"];
  return value && valid.includes(value) ? (value as PepperQuoteStatus) : "all";
}

function buildUrl(status: PepperQuoteStatus | "all", page: number): string {
  const params = new URLSearchParams();
  if (status !== "all") params.set("status", status);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return `/dashboard/admin/pepper/quotes${qs ? `?${qs}` : ""}`;
}

export default async function PepperQuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  await requireAdmin();
  const supabase = await createClient();

  const { status: statusParam, page: pageParam } = await searchParams;
  const status = toStatusFilter(statusParam);
  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  let listQuery = supabase
    .from("pepper_quotes")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);
  if (status !== "all") listQuery = listQuery.eq("status", status);

  const [{ data, count }, { count: countNew }, { count: countContacted }, { count: countWon }, { count: countLost }] =
    await Promise.all([
      listQuery,
      supabase.from("pepper_quotes").select("*", { count: "exact", head: true }).eq("status", "new"),
      supabase.from("pepper_quotes").select("*", { count: "exact", head: true }).eq("status", "contacted"),
      supabase.from("pepper_quotes").select("*", { count: "exact", head: true }).eq("status", "won"),
      supabase.from("pepper_quotes").select("*", { count: "exact", head: true }).eq("status", "lost"),
    ]);

  const quotes = (data ?? []) as PepperQuote[];
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const counts = {
    new: countNew ?? 0,
    contacted: countContacted ?? 0,
    won: countWon ?? 0,
    lost: countLost ?? 0,
  };

  return (
    <div>
      <h2 className="mb-5 border-b border-concrete pb-3 font-display text-4xl">
        <span className="text-bone">ORÇA</span>
        <span className="neon neon-green">MENTOS</span>
      </h2>

      <dl className="grid grid-cols-2 gap-4 border-b border-concrete pb-6 sm:grid-cols-4">
        <div>
          <dt className="stamp">Novos</dt>
          <dd className="font-display text-3xl text-neon-blue">{String(counts.new).padStart(2, "0")}</dd>
        </div>
        <div>
          <dt className="stamp">Contatados</dt>
          <dd className="font-display text-3xl text-neon-purple">{String(counts.contacted).padStart(2, "0")}</dd>
        </div>
        <div>
          <dt className="stamp">Ganhos</dt>
          <dd className="font-display text-3xl text-neon-green">{String(counts.won).padStart(2, "0")}</dd>
        </div>
        <div>
          <dt className="stamp">Perdidos</dt>
          <dd className="font-display text-3xl text-neon-red">{String(counts.lost).padStart(2, "0")}</dd>
        </div>
      </dl>

      <nav className="mt-6 flex flex-wrap gap-2" aria-label="Filtrar por status">
        {STATUS_FILTERS.map((f) => (
          <Link
            key={f.value}
            href={buildUrl(f.value, 1)}
            className={`btn-ghost !px-3 !py-1.5 !text-xs ${
              status === f.value ? "border-neon-green text-neon-green" : ""
            }`}
          >
            {f.label}
          </Link>
        ))}
      </nav>

      {quotes.length === 0 ? (
        <p className="stamp py-6">Nenhum orçamento encontrado com esse filtro.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {quotes.map((q) => (
            <li
              key={q.id}
              className="flex flex-wrap items-center justify-between gap-4 border border-concrete bg-ink px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <Link
                  href={`/dashboard/admin/pepper/quotes/${q.id}`}
                  className="block truncate font-display text-2xl text-bone hover:text-neon-green"
                >
                  {q.company || q.contact_name}
                </Link>
                <p className="stamp truncate">
                  {q.contact_name} · {q.email}
                  {q.whatsapp ? ` · ${q.whatsapp}` : ""}
                </p>
              </div>

              <div className="stamp shrink-0 text-right">
                <span className="text-bone">
                  {brl(q.estimate_min)} – {brl(q.estimate_max)}
                </span>
                <br />
                <span className="text-ash">{new Date(q.created_at).toLocaleDateString("pt-BR")}</span>
              </div>

              <span
                className={`skew-tag shrink-0 px-2 py-0.5 font-tech text-[0.6rem] font-bold tracking-widest text-void ${STATUS_BG[q.status]}`}
              >
                {STATUS_LABEL[q.status]}
              </span>

              <div className="shrink-0">
                <QuoteStatusForm quoteId={q.id} status={q.status} compact />
              </div>

              <Link
                href={`/dashboard/admin/pepper/quotes/${q.id}`}
                className="btn-ghost neon-green shrink-0 !px-3 !py-1.5 !text-xs"
              >
                Ver
              </Link>
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <nav className="mt-8 flex items-center justify-between gap-4 border-t border-concrete pt-6" aria-label="Paginação">
          {page > 1 ? (
            <Link href={buildUrl(status, page - 1)} className="btn-ghost !px-4 !py-2 !text-xs">
              ← Anterior
            </Link>
          ) : (
            <span className="btn-ghost !px-4 !py-2 !text-xs opacity-30">← Anterior</span>
          )}

          <p className="stamp">
            Página {page} de {totalPages} · {total} orçamento{total === 1 ? "" : "s"}
          </p>

          {page < totalPages ? (
            <Link href={buildUrl(status, page + 1)} className="btn-ghost !px-4 !py-2 !text-xs">
              Próxima →
            </Link>
          ) : (
            <span className="btn-ghost !px-4 !py-2 !text-xs opacity-30">Próxima →</span>
          )}
        </nav>
      )}
    </div>
  );
}
