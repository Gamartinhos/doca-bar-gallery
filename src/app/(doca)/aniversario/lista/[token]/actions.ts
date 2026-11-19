"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/utils/supabase/server";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MAX_BULK_NAMES = 150;

export interface PublicGuestItem {
  id: string;
  guest_name: string;
  document_hint: string | null;
  checked_in: boolean;
  created_at: string;
}

export interface AddGuestActionResult {
  ok: boolean;
  error?: string;
  guest?: PublicGuestItem;
}

export interface AddBulkGuestsActionResult {
  ok: boolean;
  error?: string;
  addedCount: number;
  skippedCount: number;
  guests: PublicGuestItem[];
}

export interface RemoveGuestActionResult {
  ok: boolean;
  error?: string;
}

function parseAddedGuestRpc(
  data: unknown,
  fallbackName: string,
  documentHint: string | null,
): PublicGuestItem | null {
  if (!data || typeof data !== "object") return null;
  const record = data as Record<string, unknown>;
  const id = typeof record.id === "string" ? record.id : "";
  const guestName =
    typeof record.guest_name === "string" ? record.guest_name : fallbackName;

  if (!id) return null;

  return {
    id,
    guest_name: guestName,
    document_hint: documentHint,
    checked_in: false,
    created_at: new Date().toISOString(),
  };
}

function normalizeBulkLine(rawLine: string): string {
  return rawLine
    .replace(/^\s*(?:[-*•]+|\d+[.)\-])\s+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function revalidateListPaths(token: string) {
  revalidatePath(`/aniversario/lista/${token}`);
  revalidatePath("/dashboard/comercial");
  revalidatePath("/dashboard/portaria");
}

export async function addGuestAction(input: {
  token: string;
  guestName: string;
  documentHint?: string;
}): Promise<AddGuestActionResult> {
  const token = input.token.trim();
  const cleanName = input.guestName.replace(/\s+/g, " ").trim();
  const cleanHint = input.documentHint?.trim() || null;

  if (!UUID_REGEX.test(token)) {
    return { ok: false, error: "Link da lista inválido." };
  }

  if (cleanName.length < 2) {
    return {
      ok: false,
      error: "Informe o nome completo do convidado (mínimo 2 letras).",
    };
  }

  if (cleanName.length > 120) {
    return {
      ok: false,
      error: "O nome do convidado deve ter no máximo 120 caracteres.",
    };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("add_birthday_guest_by_token", {
      p_token: token,
      p_guest_name: cleanName,
      p_document_hint: cleanHint,
    });

    if (error) {
      if (error.message.toLowerCase().includes("não encontrada")) {
        return { ok: false, error: "Lista de aniversário não encontrada." };
      }
      return {
        ok: false,
        error: "Não foi possível adicionar o convidado agora. Tente novamente.",
      };
    }

    const guest = parseAddedGuestRpc(data, cleanName, cleanHint);
    if (!guest) {
      return {
        ok: false,
        error: "Resposta inesperada ao adicionar convidado.",
      };
    }

    revalidateListPaths(token);
    return { ok: true, guest };
  } catch {
    return {
      ok: false,
      error: "Falha de conexão ao salvar o convidado.",
    };
  }
}

export async function addBulkGuestsAction(input: {
  token: string;
  rawText: string;
}): Promise<AddBulkGuestsActionResult> {
  const token = input.token.trim();

  if (!UUID_REGEX.test(token)) {
    return {
      ok: false,
      error: "Link da lista inválido.",
      addedCount: 0,
      skippedCount: 0,
      guests: [],
    };
  }

  const lines = input.rawText.split(/\r?\n/);
  const validNames: string[] = [];
  let skippedCount = 0;

  for (const rawLine of lines) {
    const rawTrimmed = rawLine.trim();
    if (!rawTrimmed) continue;

    const cleanName = normalizeBulkLine(rawTrimmed);
    if (cleanName.length < 2 || cleanName.length > 120) {
      skippedCount += 1;
      continue;
    }

    validNames.push(cleanName);
  }

  if (validNames.length === 0) {
    return {
      ok: false,
      error: "Cole pelo menos um nome válido (um nome por linha, mínimo 2 letras).",
      addedCount: 0,
      skippedCount,
      guests: [],
    };
  }

  if (validNames.length > MAX_BULK_NAMES) {
    return {
      ok: false,
      error: `Envie no máximo ${MAX_BULK_NAMES} nomes por lote.`,
      addedCount: 0,
      skippedCount,
      guests: [],
    };
  }

  try {
    const supabase = await createClient();
    const addedGuests: PublicGuestItem[] = [];

    for (const name of validNames) {
      const { data, error } = await supabase.rpc("add_birthday_guest_by_token", {
        p_token: token,
        p_guest_name: name,
        p_document_hint: null,
      });

      if (error) {
        if (error.message.toLowerCase().includes("não encontrada")) {
          return {
            ok: false,
            error: "Lista de aniversário não encontrada.",
            addedCount: 0,
            skippedCount,
            guests: [],
          };
        }
        skippedCount += 1;
        continue;
      }

      const parsed = parseAddedGuestRpc(data, name, null);
      if (parsed) {
        addedGuests.push(parsed);
      } else {
        skippedCount += 1;
      }
    }

    if (addedGuests.length > 0) {
      revalidateListPaths(token);
    }

    return {
      ok: addedGuests.length > 0,
      error:
        addedGuests.length === 0
          ? "Nenhum nome pôde ser adicionado. Tente novamente."
          : undefined,
      addedCount: addedGuests.length,
      skippedCount,
      guests: addedGuests,
    };
  } catch {
    return {
      ok: false,
      error: "Falha de conexão ao importar os nomes.",
      addedCount: 0,
      skippedCount,
      guests: [],
    };
  }
}

export async function removeGuestAction(input: {
  token: string;
  guestId: string;
}): Promise<RemoveGuestActionResult> {
  const token = input.token.trim();
  const guestId = input.guestId.trim();

  if (!UUID_REGEX.test(token) || !UUID_REGEX.test(guestId)) {
    return { ok: false, error: "Identificador inválido." };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("remove_birthday_guest_by_token", {
      p_token: token,
      p_guest_id: guestId,
    });

    if (error || !data) {
      return {
        ok: false,
        error:
          "Não foi possível remover este convidado (ele pode já ter dado entrada na portaria).",
      };
    }

    revalidateListPaths(token);
    return { ok: true };
  } catch {
    return {
      ok: false,
      error: "Falha de conexão ao remover convidado.",
    };
  }
}
