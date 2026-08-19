import type { Metadata } from "next";
import Link from "next/link";

import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/utils/supabase/server";

export const metadata: Metadata = { title: "Pepper · Admin" };
export const revalidate = 0;

export default async function PepperAdminOverviewPage() {
  await requireAdmin();
  const supabase = await createClient();

  const [
    { count: creatorsTotal },
    { count: creatorsPublished },
    { count: quotesTotal },
    { count: quotesNew },
  ] = await Promise.all([
    supabase.from("pepper_creators").select("*", { count: "exact", head: true }),
    supabase.from("pepper_creators").select("*", { count: "exact", head: true }).eq("is_published", true),
    supabase.from("pepper_quotes").select("*", { count: "exact", head: true }),
    supabase.from("pepper_quotes").select("*", { count: "exact", head: true }).eq("status", "new"),
  ]);

  return (
    <div>
      <dl className="grid grid-cols-2 gap-4 border-b border-concrete pb-6 sm:grid-cols-4">
        <div>
          <dt className="stamp">Creators</dt>
          <dd className="font-display text-4xl text-neon-blue">{String(creatorsTotal ?? 0).padStart(2, "0")}</dd>
        </div>
        <div>
          <dt className="stamp">Publicados</dt>
          <dd className="font-display text-4xl text-neon-green">{String(creatorsPublished ?? 0).padStart(2, "0")}</dd>
        </div>
        <div>
          <dt className="stamp">Orçamentos</dt>
          <dd className="font-display text-4xl text-neon-purple">{String(quotesTotal ?? 0).padStart(2, "0")}</dd>
        </div>
        <div>
          <dt className="stamp">Novos leads</dt>
          <dd className="font-display text-4xl text-neon-red">{String(quotesNew ?? 0).padStart(2, "0")}</dd>
        </div>
      </dl>

      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        <Link
          href="/dashboard/admin/pepper/creators"
          className="tape concrete flex flex-col justify-between gap-4 border border-concrete p-6 transition-colors hover:border-neon-blue"
        >
          <div>
            <p className="stamp text-neon-blue">Gestão do casting</p>
            <p className="mt-2 font-display text-3xl text-bone">Creators</p>
            <p className="stamp mt-2 text-ash">
              Cadastro, métricas, tier, multiplicador de preço e vínculo de conta.
            </p>
          </div>
          <span className="stamp text-bone">Abrir Casting →</span>
        </Link>

        <Link
          href="/dashboard/admin/pepper/quotes"
          className="tape concrete flex flex-col justify-between gap-4 border border-concrete p-6 transition-colors hover:border-neon-green"
        >
          <div>
            <p className="stamp text-neon-green">Caixa de entrada</p>
            <p className="mt-2 font-display text-3xl text-bone">Orçamentos</p>
            <p className="stamp mt-2 text-ash">
              Leads da calculadora pública, payload do configurador e status de negociação.
            </p>
          </div>
          <span className="stamp text-bone">Abrir Orçamentos →</span>
        </Link>
      </div>
    </div>
  );
}
