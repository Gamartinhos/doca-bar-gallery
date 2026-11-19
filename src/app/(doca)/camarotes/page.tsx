import type { Metadata } from "next";

import type { PublicEventSpaceStatus, DocaEvent } from "@/lib/database.types";
import { createClient } from "@/utils/supabase/server";

import {
  CamarotesClient,
  type UpcomingEventOption,
} from "./camarotes-client";

export const revalidate = 0;

export const metadata: Metadata = {
  title: "Camarotes & Bistrôs VIP",
  description:
    "Conheça os camarotes do Térreo (C1–C3), Mezanino (C4–C6), Bistrôs de Pista (B1–B7) e o exclusivo Camarote do Chefe da DOCA BAR na Lapa. Consulte condições para a sua noite.",
};

export default async function CamarotesPage() {
  const supabase = await createClient();
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).format(new Date());

  const { data } = await supabase
    .from("events")
    .select("id, title, slug, date")
    .eq("is_published", true)
    .gte("date", today)
    .order("date", { ascending: true });

  const { data: spacesData } = await supabase.rpc("get_public_event_spaces");

  const upcomingEvents: UpcomingEventOption[] = (data ?? []) as Pick<
    DocaEvent,
    "id" | "title" | "slug" | "date"
  >[];
  const spaceStatuses: PublicEventSpaceStatus[] = (spacesData ??
    []) as PublicEventSpaceStatus[];

  return (
    <CamarotesClient
      upcomingEvents={upcomingEvents}
      spaceStatuses={spaceStatuses}
    />
  );
}
