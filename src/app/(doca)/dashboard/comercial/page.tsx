import type { Metadata } from "next";

import { requirePermission, userHasPermission } from "@/lib/auth";
import type { BirthdayLead } from "@/lib/database.types";
import { createClient } from "@/utils/supabase/server";

import {
  ComercialClient,
  type ComercialEventSummary,
  type GuestStat,
} from "./comercial-client";

export const metadata: Metadata = {
  title: "Comercial & Listas VIP",
};

export const revalidate = 0;

export default async function ComercialPage() {
  const user = await requirePermission("vip_crm", "/dashboard/comercial");
  const supabase = await createClient();

  const [{ data: leadsData }, { data: guestsData }, { data: eventsData }] =
    await Promise.all([
      supabase
        .from("birthday_leads")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase.from("birthday_guests").select("lead_id, checked_in"),
      supabase
        .from("events")
        .select("id, title, date, slug, is_published")
        .order("date", { ascending: false }),
    ]);

  const leads = (leadsData ?? []) as BirthdayLead[];
  const events = (eventsData ?? []) as ComercialEventSummary[];

  const guestStats: Record<string, GuestStat> = {};
  for (const row of (guestsData ?? []) as Array<{
    lead_id: string;
    checked_in: boolean;
  }>) {
    const current = guestStats[row.lead_id] ?? { total: 0, checkedIn: 0 };
    current.total += 1;
    if (row.checked_in) current.checkedIn += 1;
    guestStats[row.lead_id] = current;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-14">
      <div className="mb-8">
        <p className="stamp text-neon-orange">QG da Doca · CRM VIP</p>
        <h1 className="mt-2 font-display text-5xl sm:text-7xl">
          <span className="text-bone">COMERCIAL &amp;</span>{" "}
          <span className="gold-vip">LISTAS VIP</span>
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-ash sm:text-base">
          Acompanhe todos os pedidos de aniversário, envie o link nominal para o
          cliente pelo WhatsApp e registre o avanço do atendimento.
        </p>
      </div>

      <ComercialClient
        initialLeads={leads}
        guestStats={guestStats}
        events={events}
        canOpenPortaria={userHasPermission(user, "door_checkin")}
      />
    </div>
  );
}
