import { createClient } from "@/utils/supabase/server";

import { DEMO_CREATORS, DEMO_MEDIA, DEMO_SERVICES } from "./demo";
import type { PepperCreator, PepperMedia, PepperService } from "./types";

/**
 * Leitura da área Pepper com degradação suave.
 *
 * A migration 0006 pode ainda não ter rodado no projeto Supabase quando
 * alguém abrir `/pepper` — nesse caso o PostgREST devolve
 * "relation does not exist" e uma leitura ingênua derrubaria a página
 * inteira no error boundary. Toda função aqui devolve `source`, e a UI usa
 * isso para avisar que o conteúdo ainda é vitrine em vez de mentir que
 * aquele é o casting real.
 */

export type Sourced<T> = { data: T; source: "db" | "demo" };

function demo<T>(data: T): Sourced<T> {
  return { data, source: "demo" };
}

export async function getPepperCreators(): Promise<Sourced<PepperCreator[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("pepper_creators")
      .select("*")
      .eq("is_published", true)
      .order("sort_order", { ascending: true });

    if (error || !data || data.length === 0) return demo(DEMO_CREATORS);
    return { data: data as PepperCreator[], source: "db" };
  } catch {
    return demo(DEMO_CREATORS);
  }
}

/**
 * Busca por slug ou por id — o link do card usa slug, mas o painel do
 * creator e os redirects internos carregam o uuid.
 */
export async function getPepperCreator(
  idOrSlug: string,
): Promise<Sourced<PepperCreator | null>> {
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      idOrSlug,
    );

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("pepper_creators")
      .select("*")
      .eq(isUuid ? "id" : "slug", idOrSlug)
      .eq("is_published", true)
      .maybeSingle();

    if (error) throw error;
    if (data) return { data: data as PepperCreator, source: "db" };
  } catch {
    // cai para a vitrine
  }

  const fallback =
    DEMO_CREATORS.find((c) => c.slug === idOrSlug || c.id === idOrSlug) ?? null;
  return demo(fallback);
}

export async function getPepperMedia(
  creatorId: string,
): Promise<Sourced<PepperMedia[]>> {
  if (creatorId.startsWith("demo-")) {
    return demo(DEMO_MEDIA.filter((m) => m.creator_id === creatorId));
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("pepper_media")
      .select("*")
      .eq("creator_id", creatorId)
      .eq("status", "approved")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) throw error;
    return { data: (data ?? []) as PepperMedia[], source: "db" };
  } catch {
    return demo([]);
  }
}

export async function getPepperServices(): Promise<Sourced<PepperService[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("pepper_services")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error || !data || data.length === 0) return demo(DEMO_SERVICES);
    return { data: data as PepperService[], source: "db" };
  } catch {
    return demo(DEMO_SERVICES);
  }
}

/** O creator ligado ao login atual, se existir. Usado no /pepper/estudio. */
export async function getMyCreatorProfile(
  userId: string,
): Promise<PepperCreator | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("pepper_creators")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    return (data as PepperCreator | null) ?? null;
  } catch {
    return null;
  }
}

/**
 * Preços que o creator personalizou, indexados por `service_id`.
 *
 * Usado tanto pelo estúdio (pra prencher o formulário com o que já foi
 * salvo) quanto pela calculadora exclusiva do creator (pra sobrepor o
 * `base_price` da tabela pública). Linha ausente ou `is_active = false`
 * significa "sem customização" — quem decide isso é o chamador.
 */
export async function getCreatorCustomPrices(
  creatorId: string,
): Promise<Record<string, number>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("pepper_creator_services")
      .select("service_id, custom_price")
      .eq("creator_id", creatorId)
      .eq("is_active", true);

    if (error) throw error;

    const prices: Record<string, number> = {};
    for (const row of data ?? []) prices[row.service_id] = Number(row.custom_price);
    return prices;
  } catch {
    return {};
  }
}

/** Eventos do Doca que o creator pode vincular a uma peça do portfólio. */
export async function getDocaEventOptions(): Promise<
  { id: string; title: string; date: string }[]
> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("events")
      .select("id, title, date")
      .eq("is_published", true)
      .order("date", { ascending: false })
      .limit(50);

    if (error) throw error;
    return data ?? [];
  } catch {
    return [];
  }
}
