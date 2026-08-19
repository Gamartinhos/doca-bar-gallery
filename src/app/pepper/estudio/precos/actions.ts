"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/utils/supabase/server";

/**
 * Estúdio do creator — preços customizados por serviço.
 *
 * Um envio grava a mesa inteira de uma vez: cada serviço vira uma linha
 * `price_<service_id>` no formulário. Campo em branco significa "sem
 * customização" (apaga a linha e o preço volta a ser o `base_price` da
 * Pepper); campo preenchido vira upsert.
 */

export interface PrecosState {
  error?: string;
  message?: string;
}

function toPrice(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const parsed = Number.parseFloat(raw.replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : NaN;
}

export async function salvarPrecosCustomizados(
  _prev: PrecosState,
  formData: FormData,
): Promise<PrecosState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Sua sessão caiu. Entra de novo." };

  const supabase = await createClient();

  const { data: creator } = await supabase
    .from("pepper_creators")
    .select("id, slug")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!creator) {
    return { error: "Sua ficha de creator não está mais ligada a este login." };
  }

  const { data: services } = await supabase
    .from("pepper_services")
    .select("id")
    .eq("is_active", true);

  const serviceIds = (services ?? []).map((s) => s.id as string);

  const toUpsert: {
    creator_id: string;
    service_id: string;
    custom_price: number;
    is_active: boolean;
  }[] = [];
  const toDelete: string[] = [];

  for (const serviceId of serviceIds) {
    const price = toPrice(formData.get(`price_${serviceId}`));
    if (price === null) {
      toDelete.push(serviceId);
      continue;
    }
    if (Number.isNaN(price)) {
      return { error: "Algum preço personalizado é inválido." };
    }
    toUpsert.push({
      creator_id: creator.id,
      service_id: serviceId,
      custom_price: price,
      is_active: true,
    });
  }

  if (toUpsert.length > 0) {
    const { error } = await supabase
      .from("pepper_creator_services")
      .upsert(toUpsert, { onConflict: "creator_id,service_id" });
    if (error) return { error: "Não deu pra salvar os preços. Tenta de novo." };
  }

  if (toDelete.length > 0) {
    const { error } = await supabase
      .from("pepper_creator_services")
      .delete()
      .eq("creator_id", creator.id)
      .in("service_id", toDelete);
    if (error) return { error: "Não deu pra limpar os preços removidos." };
  }

  revalidatePath("/pepper/estudio/precos");
  revalidatePath(`/pepper/creators/${creator.slug}/orcamento`);

  return { message: "Preços atualizados." };
}
