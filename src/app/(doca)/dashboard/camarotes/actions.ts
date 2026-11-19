"use server";

import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/auth";
import type {
  EventSpaceStatus,
  SpaceAvailabilityStatus,
  SpaceCode,
} from "@/lib/database.types";
import { createClient } from "@/utils/supabase/server";

const VALID_SPACE_CODES: readonly SpaceCode[] = [
  "C1",
  "C2",
  "C3",
  "C4",
  "C5",
  "C6",
  "B1",
  "B2",
  "B3",
  "B4",
  "B5",
  "B6",
  "B7",
];

const VALID_STATUSES: readonly SpaceAvailabilityStatus[] = [
  "available",
  "negotiating",
  "reserved",
];

export interface UpsertSpacePayload {
  eventId: string;
  spaceCode: SpaceCode;
  status: SpaceAvailabilityStatus;
  clientName?: string;
  clientWhatsapp?: string;
  notes?: string;
}

export interface UpsertSpaceResult {
  ok: boolean;
  error?: string;
  record?: EventSpaceStatus;
}

export async function upsertSpaceStatus(
  payload: UpsertSpacePayload,
): Promise<UpsertSpaceResult> {
  await requirePermission("camarotes", "/dashboard/camarotes");

  const eventId = String(payload.eventId ?? "").trim();
  const spaceCode = payload.spaceCode;
  const status = payload.status;

  if (!eventId) {
    return { ok: false, error: "Selecione um evento válido." };
  }
  if (!(VALID_SPACE_CODES as readonly string[]).includes(spaceCode)) {
    return { ok: false, error: "Código de espaço inválido." };
  }
  if (!(VALID_STATUSES as readonly string[]).includes(status)) {
    return { ok: false, error: "Status inválido." };
  }

  const clientName = String(payload.clientName ?? "").trim();
  const clientWhatsapp = String(payload.clientWhatsapp ?? "").trim();
  const notes = String(payload.notes ?? "").trim();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_space_status")
    .upsert(
      {
        event_id: eventId,
        space_code: spaceCode,
        status,
        client_name: clientName || null,
        client_whatsapp: clientWhatsapp || null,
        notes: notes || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "event_id,space_code" },
    )
    .select("*")
    .single();

  if (error) {
    return { ok: false, error: `Falha ao salvar ${spaceCode}: ${error.message}` };
  }

  revalidatePath("/dashboard/camarotes");
  revalidatePath("/camarotes");

  return { ok: true, record: data as EventSpaceStatus };
}
