import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAdmin } from "@/lib/auth";
import { brl } from "@/lib/pepper/format";
import type {
  PepperQuote,
  PepperQuoteStatus,
  PepperUrgency,
  PepperUsage,
} from "@/lib/pepper/types";
import { createClient } from "@/utils/supabase/server";

import { QuoteStatusForm } from "../status-form";

export const metadata: Metadata = { title: "Pepper · Orçamento" };
export const revalidate = 0;

type Params = Promise<{ id: string }>;

const STATUS_LABEL: Record<PepperQuoteStatus, string> = {
  new: "Novo",
  contacted: "Contatado",
  won: "Ganho",
  lost: "Perdido",
};

const URGENCY_LABEL: Record<PepperUrgency, string> = {
  flex: "Flexível",
  padrao: "Padrão",
  expresso: "Expresso",
};

const USAGE_LABEL: Record<PepperUsage, string> = {
  organico: "Só orgânico",
  paid30: "Whitelisting / paid 30 dias",
  paid90: "Whitelisting / paid 90 dias",
};

export default async function PepperQuoteDetailPage({ params }: { params: Params }) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: quoteRow }, { data: servicesRows }, { data: creatorsRows }] = await Promise.all([
    supabase.from("pepper_quotes").select("*").eq("id", id).maybeSingle(),
    supabase.from("pepper_services").select("slug, name, unit"),
    supabase.from("pepper_creators").select("id, name, slug"),
  ]);

  if (!quoteRow) notFound();
  const quote = quoteRow as PepperQuote;

  const serviceLookup = new Map(
    (servicesRows ?? []).map((s) => [s.slug as string, s as { slug: string; name: string; unit: string }]),
  );
  const creatorLookup = new Map(
    (creatorsRows ?? []).map((c) => [c.id as string, c as { id: string; name: string; slug: string }]),
  );

  const payload = quote.payload ?? { services: {}, creatorIds: [], urgency: "padrao", usage: "organico", exclusivity: false };
  const serviceEntries = Object.entries(payload.services ?? {});
  const creatorIds = payload.creatorIds ?? [];

  return (
    <div>
      <Link href="/dashboard/admin/pepper/quotes" className="stamp text-ash hover:text-neon-green">
        ‹ Orçamentos
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4 border-b border-concrete pb-6">
        <div>
          <h2 className="font-display text-4xl text-bone">{quote.company || quote.contact_name}</h2>
          <p className="stamp mt-2">
            {quote.contact_name} · {quote.email}
            {quote.whatsapp ? ` · ${quote.whatsapp}` : ""}
          </p>
          <p className="stamp mt-1 text-ash">
            Recebido em {new Date(quote.created_at).toLocaleDateString("pt-BR")}
          </p>
        </div>

        <div className="text-right">
          <p className="stamp mb-2">Status — {STATUS_LABEL[quote.status]}</p>
          <QuoteStatusForm quoteId={quote.id} status={quote.status} />
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <section>
          <h3 className="stamp mb-3 text-neon-blue">Estimativa</h3>
          <p className="font-display text-3xl text-bone">
            {brl(quote.estimate_min)} – {brl(quote.estimate_max)}
          </p>

          {quote.briefing && (
            <>
              <h3 className="stamp mb-2 mt-6 text-neon-blue">Briefing</h3>
              <p className="whitespace-pre-wrap text-bone">{quote.briefing}</p>
            </>
          )}

          <h3 className="stamp mb-2 mt-6 text-neon-blue">Condições</h3>
          <ul className="stamp space-y-1 text-bone">
            <li>Urgência: {URGENCY_LABEL[payload.urgency] ?? payload.urgency}</li>
            <li>Uso da mídia: {USAGE_LABEL[payload.usage] ?? payload.usage}</li>
            <li>Exclusividade: {payload.exclusivity ? "sim" : "não"}</li>
          </ul>
        </section>

        <section>
          <h3 className="stamp mb-3 text-neon-purple">Serviços selecionados</h3>
          {serviceEntries.length === 0 ? (
            <p className="stamp text-ash">Nenhum serviço no payload.</p>
          ) : (
            <ul className="space-y-2">
              {serviceEntries.map(([slug, qty]) => {
                const svc = serviceLookup.get(slug);
                return (
                  <li key={slug} className="flex items-center justify-between border-b border-concrete/60 py-2">
                    <span className="text-bone">
                      {svc?.name ?? slug}
                      {svc?.unit ? <span className="stamp text-ash"> · {svc.unit}</span> : null}
                    </span>
                    <span className="stamp shrink-0 text-bone">× {qty}</span>
                  </li>
                );
              })}
            </ul>
          )}

          <h3 className="stamp mb-3 mt-6 text-neon-purple">Casting selecionado</h3>
          {creatorIds.length === 0 ? (
            <p className="stamp text-ash">Nenhum creator no payload.</p>
          ) : (
            <ul className="space-y-2">
              {creatorIds.map((creatorId) => {
                const c = creatorLookup.get(creatorId);
                return (
                  <li key={creatorId} className="border-b border-concrete/60 py-2">
                    {c ? (
                      <Link
                        href={`/dashboard/admin/pepper/creators?edit=${c.id}`}
                        className="text-bone hover:text-neon-purple"
                      >
                        {c.name}
                      </Link>
                    ) : (
                      <span className="stamp text-ash">{creatorId} (removido)</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <details className="mt-10 border border-concrete bg-ink p-4">
        <summary className="stamp cursor-pointer select-none text-bone">Ver payload bruto (JSON)</summary>
        <pre className="stamp mt-4 overflow-x-auto whitespace-pre-wrap text-ash">
          {JSON.stringify(quote.payload, null, 2)}
        </pre>
      </details>
    </div>
  );
}
