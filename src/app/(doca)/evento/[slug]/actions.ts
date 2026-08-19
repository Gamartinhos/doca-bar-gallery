"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { deleteDriveFile } from "@/lib/google-drive";

const YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

/** Nome do cookie que marca "esse navegador já confirmou presença/entrou na lista pra esse evento". */
function interestCookie(eventId: string) {
  return `interesse_${eventId}`;
}
function leadCookie(eventId: string) {
  return `lead_${eventId}`;
}

/**
 * Botão "Vou Colar" — incrementa via RPC (public.increment_event_interest,
 * ver supabase/migrations/0005_interest_counter.sql) porque a policy de
 * `events` não libera UPDATE anônimo: RLS não restringe coluna, só linha,
 * então abrir esse policy deixaria qualquer visitante reescrever title,
 * date etc. A função é SECURITY DEFINER e só toca interest_count.
 *
 * Se a migração ainda não rodou no banco em produção, a RPC não existe e
 * isso falha em silêncio (o botão continua clicável, só não soma).
 */
export async function markInterest(formData: FormData): Promise<void> {
  const eventId = String(formData.get("event_id") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  if (!eventId || !slug) return;

  const cookieStore = await cookies();
  if (cookieStore.get(interestCookie(eventId))) return;

  const supabase = await createClient();
  const { error } = await supabase.rpc("increment_event_interest", {
    p_event_id: eventId,
  });
  if (error) return;

  cookieStore.set(interestCookie(eventId), "1", {
    maxAge: YEAR_IN_SECONDS,
    path: "/",
  });
  revalidatePath(`/evento/${slug}`);
}

export interface LeadState {
  error?: string;
  success?: boolean;
}

/** Botão "Lista VIP" — grava em event_leads (insert público liberado por RLS). */
export async function submitLead(
  _prev: LeadState,
  formData: FormData,
): Promise<LeadState> {
  const eventId = String(formData.get("event_id") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const whatsapp = String(formData.get("whatsapp") ?? "").replace(/\D/g, "");

  if (!eventId) return { error: "Evento inválido." };
  if (!name) return { error: "Seu nome, por favor." };
  if (whatsapp.length < 10) return { error: "WhatsApp inválido — inclui o DDD." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("event_leads")
    .insert({ event_id: eventId, name, whatsapp });

  if (error) return { error: "Não rolou, tenta de novo." };

  const cookieStore = await cookies();
  cookieStore.set(leadCookie(eventId), "1", { maxAge: YEAR_IN_SECONDS, path: "/" });

  if (slug) revalidatePath(`/evento/${slug}`);
  return { success: true };
}

export async function deleteMediaAction(mediaId: string, slug: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Não autenticado." };
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const userRole = profile?.role;

  const { data: media } = await supabase
    .from("media")
    .select("*")
    .eq("id", mediaId)
    .maybeSingle();

  if (!media) {
    return { success: false, error: "Mídia não encontrada." };
  }

  const isOwner = media.photographer_id === user.id;
  const isAdmin = userRole === "admin";

  if (!isOwner && !isAdmin) {
    return { success: false, error: "Sem permissão." };
  }

  try {
    if (media.drive_file_id) {
      await deleteDriveFile(media.drive_file_id);
    }
    if (media.storage_path) {
      await supabase.storage.from("media").remove([media.storage_path]);
    }

    const { error } = await supabase.from("media").delete().eq("id", mediaId);
    if (error) throw error;

    revalidatePath(`/evento/${slug}`);
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao excluir.";
    return { success: false, error: message };
  }
}
