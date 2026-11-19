"use server";

import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/auth";
import type { BirthdayGuest } from "@/lib/database.types";
import { createClient } from "@/utils/supabase/server";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const VALID_REWARD_KEYS = new Set([
  "tier_1",
  "tier_5",
  "tier_10",
  "tier_15",
  "tier_20",
]);

function revalidateDoorPaths() {
  revalidatePath("/dashboard/portaria");
  revalidatePath("/dashboard/comercial");
}

export async function toggleGuestCheckinAction(input: {
  guestId: string;
  checkedIn: boolean;
}): Promise<{
  ok: boolean;
  error?: string;
  checkedIn?: boolean;
  checkedInAt?: string | null;
}> {
  await requirePermission("door_checkin", "/dashboard/portaria");

  const guestId = input.guestId.trim();
  if (!UUID_REGEX.test(guestId)) {
    return { ok: false, error: "Convidado inválido." };
  }

  const checkedIn = Boolean(input.checkedIn);
  const checkedInAt = checkedIn ? new Date().toISOString() : null;

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("birthday_guests")
      .update({
        checked_in: checkedIn,
        checked_in_at: checkedInAt,
      })
      .eq("id", guestId);

    if (error) {
      return { ok: false, error: "Erro ao atualizar check-in na portaria." };
    }

    revalidateDoorPaths();
    return { ok: true, checkedIn, checkedInAt };
  } catch {
    return { ok: false, error: "Falha de conexão ao registrar check-in." };
  }
}

export async function addDoorGuestAction(input: {
  leadId: string;
  guestName: string;
  documentHint?: string;
  checkedIn?: boolean;
}): Promise<{
  ok: boolean;
  error?: string;
  guest?: BirthdayGuest;
}> {
  await requirePermission("door_checkin", "/dashboard/portaria");

  const leadId = input.leadId.trim();
  const cleanName = input.guestName.replace(/\s+/g, " ").trim();
  const cleanHint = input.documentHint?.trim() || null;
  const checkedIn = input.checkedIn ?? true;
  const checkedInAt = checkedIn ? new Date().toISOString() : null;

  if (!UUID_REGEX.test(leadId)) {
    return { ok: false, error: "Lista de aniversário inválida." };
  }

  if (cleanName.length < 2) {
    return {
      ok: false,
      error: "Informe o nome do convidado (mínimo 2 letras).",
    };
  }

  if (cleanName.length > 120) {
    return {
      ok: false,
      error: "O nome deve ter no máximo 120 caracteres.",
    };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("birthday_guests")
      .insert({
        lead_id: leadId,
        guest_name: cleanName,
        document_hint: cleanHint,
        checked_in: checkedIn,
        checked_in_at: checkedInAt,
      })
      .select("*")
      .single();

    if (error || !data) {
      return {
        ok: false,
        error: "Não foi possível adicionar o convidado na portaria.",
      };
    }

    revalidateDoorPaths();
    return { ok: true, guest: data as BirthdayGuest };
  } catch {
    return { ok: false, error: "Falha de conexão ao cadastrar convidado." };
  }
}

export async function updateExtraCheckedInAction(input: {
  leadId: string;
  extraCheckedIn: number;
}): Promise<{
  ok: boolean;
  error?: string;
  extraCheckedIn?: number;
}> {
  await requirePermission("door_checkin", "/dashboard/portaria");

  const leadId = input.leadId.trim();
  if (!UUID_REGEX.test(leadId)) {
    return { ok: false, error: "Lista inválida." };
  }

  const nextExtra = Math.max(0, Math.floor(Number(input.extraCheckedIn) || 0));

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("birthday_leads")
      .update({ extra_checked_in: nextExtra })
      .eq("id", leadId);

    if (error) {
      return { ok: false, error: "Erro ao atualizar convidados avulsos." };
    }

    revalidateDoorPaths();
    return { ok: true, extraCheckedIn: nextExtra };
  } catch {
    return { ok: false, error: "Falha de conexão ao atualizar avulsos." };
  }
}

export async function toggleClaimedTierAction(input: {
  leadId: string;
  tierKey: string;
  claimed: boolean;
}): Promise<{
  ok: boolean;
  error?: string;
  claimedTiers?: string[];
}> {
  await requirePermission("door_checkin", "/dashboard/portaria");

  const leadId = input.leadId.trim();
  const tierKey = input.tierKey.trim();

  if (!UUID_REGEX.test(leadId) || !VALID_REWARD_KEYS.has(tierKey)) {
    return { ok: false, error: "Prêmio ou lista inválidos." };
  }

  try {
    const supabase = await createClient();
    const { data: leadRow, error: fetchError } = await supabase
      .from("birthday_leads")
      .select("claimed_tiers")
      .eq("id", leadId)
      .single();

    if (fetchError || !leadRow) {
      return { ok: false, error: "Lista não encontrada para atualizar prêmio." };
    }

    const currentSet = new Set<string>(
      Array.isArray(leadRow.claimed_tiers) ? leadRow.claimed_tiers : [],
    );

    if (input.claimed) {
      currentSet.add(tierKey);
    } else {
      currentSet.delete(tierKey);
    }

    const nextClaimedTiers = Array.from(currentSet);

    const { error: updateError } = await supabase
      .from("birthday_leads")
      .update({ claimed_tiers: nextClaimedTiers })
      .eq("id", leadId);

    if (updateError) {
      return { ok: false, error: "Erro ao salvar entrega do prêmio." };
    }

    revalidateDoorPaths();
    return { ok: true, claimedTiers: nextClaimedTiers };
  } catch {
    return { ok: false, error: "Falha de conexão ao atualizar prêmio." };
  }
}
