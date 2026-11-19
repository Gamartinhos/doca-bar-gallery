"use server";

import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/auth";
import type { BirthdayLeadStatus } from "@/lib/database.types";
import { createClient } from "@/utils/supabase/server";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const VALID_STATUSES = new Set<BirthdayLeadStatus>([
  "new",
  "contacted",
  "confirmed",
  "attended",
  "cancelled",
]);

export interface UpdateLeadCrmInput {
  leadId: string;
  status: BirthdayLeadStatus;
  notes: string;
}

export interface UpdateLeadCrmResult {
  ok: boolean;
  error?: string;
  status?: BirthdayLeadStatus;
  notes?: string | null;
}

export async function updateLeadCrm(
  input: UpdateLeadCrmInput,
): Promise<UpdateLeadCrmResult> {
  await requirePermission("vip_crm", "/dashboard/comercial");

  const leadId = input.leadId.trim();
  if (!UUID_REGEX.test(leadId)) {
    return { ok: false, error: "Identificador de lead inválido." };
  }

  if (!VALID_STATUSES.has(input.status)) {
    return { ok: false, error: "Status inválido." };
  }

  const cleanNotes = input.notes.trim() || null;

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("birthday_leads")
      .update({
        status: input.status,
        notes: cleanNotes,
      })
      .eq("id", leadId);

    if (error) {
      return {
        ok: false,
        error: `Erro ao atualizar CRM: ${error.message}`,
      };
    }

    revalidatePath("/dashboard/comercial");
    revalidatePath("/dashboard/portaria");
    revalidatePath("/dashboard/admin");

    return {
      ok: true,
      status: input.status,
      notes: cleanNotes,
    };
  } catch {
    return {
      ok: false,
      error: "Falha de conexão ao salvar no CRM.",
    };
  }
}
