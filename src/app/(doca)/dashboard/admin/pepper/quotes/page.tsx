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

export default async function PepperQuotesPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data } = await supabase
    .from("pepper_quotes")
    .select("*")
    .order("created_at", { ascending: false });

  const quotes = (data ?? []) as PepperQuote[];

  const counts = {
    new: quotes.filter((q) => q.status === "new").length,
    contacted: quotes.filter((q) => q.status === "contacted").length,
    won: quotes.filter((q) => q.status === "won").length,
    lost: quotes.filter((q) => q.status === "lost").length,
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

      {quotes.length === 0 ? (
        <p className="stamp py-6">Nenhum orçamento recebido ainda.</p>
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
    </div>
  );
}
