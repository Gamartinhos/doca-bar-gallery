import type { Metadata } from "next";
import Link from "next/link";

import { requireAdmin } from "@/lib/auth";
import { brl } from "@/lib/pepper/format";
import type { PepperService } from "@/lib/pepper/types";
import { createClient } from "@/utils/supabase/server";

import { deleteService, moveService, toggleServiceActive } from "./actions";
import { ServiceForm } from "./service-form";

export const metadata: Metadata = { title: "Pepper · Serviços" };
export const revalidate = 0;

export default async function PepperServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  await requireAdmin();
  const supabase = await createClient();

  const { edit: editId } = await searchParams;

  const { data } = await supabase
    .from("pepper_services")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  const services = (data ?? []) as PepperService[];
  const editService = editId ? services.find((s) => s.id === editId) : undefined;

  return (
    <div className="grid gap-14 lg:grid-cols-[1fr_400px]">
      {/* ============ COLUNA ESQUERDA — LISTAGEM ============ */}
      <div>
        <h2 className="mb-5 border-b border-concrete pb-3 font-display text-4xl">
          <span className="text-bone">TABELA DE</span> <span className="neon neon-purple">SERVIÇOS</span>
        </h2>

        {services.length === 0 ? (
          <p className="stamp py-6">Nenhum serviço cadastrado ainda.</p>
        ) : (
          <ul className="space-y-3">
            {services.map((s, index) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-4 border border-concrete bg-ink px-4 py-3"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="flex shrink-0 flex-col gap-1">
                    <form action={moveService}>
                      <input type="hidden" name="service_id" value={s.id} />
                      <input type="hidden" name="direction" value="up" />
                      <button
                        type="submit"
                        disabled={index === 0}
                        aria-label={`Subir ${s.name}`}
                        className="btn-ghost !px-2 !py-1 !text-xs disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        ↑
                      </button>
                    </form>
                    <form action={moveService}>
                      <input type="hidden" name="service_id" value={s.id} />
                      <input type="hidden" name="direction" value="down" />
                      <button
                        type="submit"
                        disabled={index === services.length - 1}
                        aria-label={`Descer ${s.name}`}
                        className="btn-ghost !px-2 !py-1 !text-xs disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        ↓
                      </button>
                    </form>
                  </div>

                  <span
                    aria-hidden="true"
                    className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-concrete bg-smoke font-display text-lg text-ash"
                  >
                    {s.icon}
                  </span>

                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-display text-2xl text-bone">
                      <span className="truncate">{s.name}</span>
                      {!s.is_active && (
                        <span className="stamp shrink-0 text-[0.6rem] text-ash">inativo</span>
                      )}
                    </p>
                    <p className="stamp truncate">
                      /{s.slug} · {brl(s.base_price)} / {s.unit} · {s.lead_days} dias
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <form action={toggleServiceActive}>
                    <input type="hidden" name="service_id" value={s.id} />
                    <input type="hidden" name="active" value={s.is_active ? "false" : "true"} />
                    <button type="submit" className="btn-ghost neon-blue !px-3 !py-1.5 !text-xs">
                      {s.is_active ? "Desativar" : "Ativar"}
                    </button>
                  </form>

                  <Link
                    href={`/dashboard/admin/pepper/services?edit=${s.id}`}
                    className="btn-ghost text-bone hover:text-neon-purple !px-3 !py-1.5 !text-xs"
                  >
                    Editar
                  </Link>

                  <form action={deleteService}>
                    <input type="hidden" name="service_id" value={s.id} />
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
            <span className="neon neon-purple">{editService ? "EDITAR" : "NOVO"}</span>{" "}
            <span className="text-bone">SERVIÇO</span>
          </h2>
          <ServiceForm key={editService?.id || "new"} initialData={editService} />
        </div>
      </aside>
    </div>
  );
}
