import type { Metadata } from "next";
import Link from "next/link";

import { requirePermission } from "@/lib/auth";
import type { EventSpaceStatus } from "@/lib/database.types";
import { createClient } from "@/utils/supabase/server";

import {
  CamarotesAdminClient,
  type AdminSpaceEvent,
} from "./camarotes-admin-client";

export const metadata: Metadata = {
  title: "Camarotes & Bistrôs · QG da Doca",
};
export const revalidate = 0;

export default async function DashboardCamarotesPage() {
  await requirePermission("camarotes", "/dashboard/camarotes");

  const supabase = await createClient();
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).format(new Date());

  const [{ data: eventsData }, { data: spacesData }] = await Promise.all([
    supabase
      .from("events")
      .select("id, title, slug, date, is_published")
      .order("date", { ascending: false }),
    supabase
      .from("event_space_status")
      .select("*")
      .order("space_code", { ascending: true }),
  ]);

  const events = (eventsData ?? []) as AdminSpaceEvent[];
  const initialStatuses = (spacesData ?? []) as EventSpaceStatus[];

  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/dashboard"
            className="stamp inline-block text-ash transition-colors hover:text-gold-bright"
          >
            ← Voltar ao QG
          </Link>
          <p className="stamp mt-4 text-gold-bright">
            ▸ Operação VIP · Mapa de Ocupação
          </p>
          <h1 className="mt-2 font-display text-5xl sm:text-7xl">
            <span className="text-bone">CAMAROTES</span>{" "}
            <span className="gold-vip">&amp; BISTRÔS</span>
          </h1>
        </div>

        <Link
          href="/camarotes"
          className="btn-ghost neon-gold !px-4 !py-2.5 !text-xs"
        >
          Ver Vitrine Pública ↗
        </Link>
      </div>

      <CamarotesAdminClient
        events={events}
        initialStatuses={initialStatuses}
        today={today}
      />
    </div>
  );
}
