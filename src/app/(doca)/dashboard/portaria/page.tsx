import type { Metadata } from "next";

import { requirePermission, userHasPermission } from "@/lib/auth";
import type { BirthdayGuest, BirthdayLead } from "@/lib/database.types";
import { createClient } from "@/utils/supabase/server";

import {
  PortariaClient,
  type PortariaEventSummary,
  type PortariaLeadWithGuests,
} from "./portaria-client";

export const metadata: Metadata = {
  title: "Portaria Mobile · Check-in VIP",
};

export const revalidate = 0;

export default async function PortariaPage() {
  const user = await requirePermission("door_checkin", "/dashboard/portaria");
  const supabase = await createClient();

  const [{ data: leadsData }, { data: guestsData }, { data: eventsData }] =
    await Promise.all([
      supabase
        .from("birthday_leads")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("birthday_guests")
        .select("*")
        .order("created_at", { ascending: true }),
      supabase
        .from("events")
        .select("id, title, date, slug, is_published")
        .order("date", { ascending: false }),
    ]);

  const leads = (leadsData ?? []) as BirthdayLead[];
  const guests = (guestsData ?? []) as BirthdayGuest[];
  const events = (eventsData ?? []) as PortariaEventSummary[];

  const guestsByLead = new Map<string, BirthdayGuest[]>();
  for (const guest of guests) {
    const list = guestsByLead.get(guest.lead_id) ?? [];
    list.push(guest);
    guestsByLead.set(guest.lead_id, list);
  }

  const leadsWithGuests: PortariaLeadWithGuests[] = leads.map((lead) => ({
    ...lead,
    claimed_tiers: Array.isArray(lead.claimed_tiers) ? lead.claimed_tiers : [],
    guests: guestsByLead.get(lead.id) ?? [],
  }));

  return (
    <div className="mx-auto max-w-5xl px-3 py-8 sm:px-6 sm:py-12">
      <div className="mb-6">
        <p className="stamp text-neon-orange">QG da Doca · Operação de Porta</p>
        <h1 className="mt-2 font-display text-5xl sm:text-6xl">
          <span className="text-bone">PORTARIA</span>{" "}
          <span className="gold-vip">MOBILE</span>
        </h1>
        <p className="mt-2 text-sm text-ash">
          Toque no nome do convidado para dar entrada, ajuste avulsos em{" "}
          <span className="text-bone">-1 / +1</span> e entregue os prêmios da
          Escadinha ao vivo.
        </p>
      </div>

      <PortariaClient
        initialLeads={leadsWithGuests}
        events={events}
        canOpenComercial={userHasPermission(user, "vip_crm")}
      />
    </div>
  );
}
