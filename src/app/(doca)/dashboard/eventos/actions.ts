"use server";

import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/auth";
import type { EventAccent, InterestType, MediaStatus } from "@/lib/database.types";
import { deleteDriveFile } from "@/lib/google-drive";
import { createClient } from "@/utils/supabase/server";

export interface ActionState {
  error?: string;
  message?: string;
}

export interface MediaModActionResult {
  ok: boolean;
  error?: string;
  status?: MediaStatus;
}

const INTEREST_TYPES: readonly InterestType[] = ["none", "link", "count", "lead"];
const ACCENTS: readonly EventAccent[] = ["purple", "blue", "red", "green"];
const MEDIA_STATUSES: readonly MediaStatus[] = ["pending", "approved", "rejected"];
const MAX_FLYER_BYTES = 4.5 * 1024 * 1024;

function toInterestType(value: string): InterestType {
  return (INTEREST_TYPES as readonly string[]).includes(value)
    ? (value as InterestType)
    : "none";
}

function toAccent(value: string): EventAccent {
  return (ACCENTS as readonly string[]).includes(value)
    ? (value as EventAccent)
    : "purple";
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

function revalidateEventPaths(slug?: string | null) {
  revalidatePath("/dashboard/eventos");
  revalidatePath("/dashboard/admin");
  revalidatePath("/camarotes");
  revalidatePath("/");
  if (slug) {
    revalidatePath(`/evento/${slug}`);
  }
}

/* ------------------------------------------------------------------ */
/* Eventos (requer permissão "events")                                 */
/* ------------------------------------------------------------------ */

export async function createEvent(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requirePermission("events", "/dashboard/eventos");

  const title = String(formData.get("title") ?? "").trim();
  const date = String(formData.get("date") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  let coverImage = String(formData.get("cover_image") ?? "").trim();
  const accent = String(formData.get("accent") ?? "purple");
  const interestType = String(formData.get("interest_type") ?? "none");
  const ticketUrl = String(formData.get("ticket_url") ?? "").trim();
  const instagramUrl = String(formData.get("instagram_url") ?? "").trim();
  const coverImageFile = formData.get("cover_image_file") as File | null;

  if (!title) return { error: "O evento precisa de um nome." };
  if (!date) return { error: "Escolha a data da noite." };

  const supabase = await createClient();

  if (coverImageFile && coverImageFile.size > 0) {
    if (coverImageFile.size > MAX_FLYER_BYTES) {
      return { error: "O flyer ultrapassa o limite de 4.5MB." };
    }
    const ext = coverImageFile.name.split(".").pop() ?? "bin";
    const path = `flyers/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("media")
      .upload(path, coverImageFile, {
        cacheControl: "31536000",
        contentType: coverImageFile.type || undefined,
      });

    if (uploadError) {
      return { error: `Erro ao subir flyer: ${uploadError.message}` };
    }
    const { data } = supabase.storage.from("media").getPublicUrl(path);
    coverImage = data.publicUrl;
  }

  const base = slugify(title) || "evento";
  let slug = base;

  const { data: existing } = await supabase
    .from("events")
    .select("slug")
    .like("slug", `${base}%`);

  const taken = new Set((existing ?? []).map((e) => e.slug));
  if (taken.has(slug)) {
    let n = 2;
    while (taken.has(`${base}-${n}`)) n += 1;
    slug = `${base}-${n}`;
  }

  const { error } = await supabase.from("events").insert({
    title,
    slug,
    date,
    description: description || null,
    cover_image: coverImage || null,
    interest_type: toInterestType(interestType),
    interest_count: 0,
    ticket_url: ticketUrl || null,
    instagram_url: instagramUrl || null,
    accent: toAccent(accent),
    is_published: true,
    created_by: user.id,
  });

  if (error) return { error: `Não rolou: ${error.message}` };

  revalidateEventPaths(slug);
  return { message: `Evento "${title}" no ar.` };
}

export async function updateEvent(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requirePermission("events", "/dashboard/eventos");

  const eventId = String(formData.get("event_id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const date = String(formData.get("date") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  let coverImage = String(formData.get("cover_image") ?? "").trim();
  const accent = String(formData.get("accent") ?? "purple");
  const interestType = String(formData.get("interest_type") ?? "none");
  const ticketUrl = String(formData.get("ticket_url") ?? "").trim();
  const instagramUrl = String(formData.get("instagram_url") ?? "").trim();
  const coverImageFile = formData.get("cover_image_file") as File | null;

  if (!eventId) return { error: "ID do evento não encontrado." };
  if (!title) return { error: "O evento precisa de um nome." };
  if (!date) return { error: "Escolha a data da noite." };

  const supabase = await createClient();

  if (coverImageFile && coverImageFile.size > 0) {
    if (coverImageFile.size > MAX_FLYER_BYTES) {
      return { error: "O flyer ultrapassa o limite de 4.5MB." };
    }
    const ext = coverImageFile.name.split(".").pop() ?? "bin";
    const path = `flyers/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("media")
      .upload(path, coverImageFile, {
        cacheControl: "31536000",
        contentType: coverImageFile.type || undefined,
      });

    if (uploadError) {
      return { error: `Erro ao subir flyer: ${uploadError.message}` };
    }
    const { data } = supabase.storage.from("media").getPublicUrl(path);
    coverImage = data.publicUrl;
  }

  const { data: updated, error } = await supabase
    .from("events")
    .update({
      title,
      date,
      description: description || null,
      cover_image: coverImage || null,
      interest_type: toInterestType(interestType),
      ticket_url: ticketUrl || null,
      instagram_url: instagramUrl || null,
      accent: toAccent(accent),
    })
    .eq("id", eventId)
    .select("slug")
    .maybeSingle();

  if (error) {
    return { error: error.message };
  }

  revalidateEventPaths(updated?.slug);
  revalidatePath("/", "layout");

  return { message: `Evento "${title}" atualizado.` };
}

export async function togglePublished(formData: FormData): Promise<void> {
  await requirePermission("events", "/dashboard/eventos");

  const eventId = String(formData.get("event_id") ?? "").trim();
  const publish = String(formData.get("publish") ?? "") === "true";
  if (!eventId) return;

  const supabase = await createClient();
  const { data: updated } = await supabase
    .from("events")
    .update({ is_published: publish })
    .eq("id", eventId)
    .select("slug")
    .maybeSingle();

  revalidateEventPaths(updated?.slug);
}

export async function deleteEvent(formData: FormData): Promise<void> {
  await requirePermission("events", "/dashboard/eventos");

  const eventId = String(formData.get("event_id") ?? "").trim();
  if (!eventId) return;

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("events")
    .select("slug")
    .eq("id", eventId)
    .maybeSingle();

  await supabase.from("events").delete().eq("id", eventId);

  revalidateEventPaths(existing?.slug);
}

/* ------------------------------------------------------------------ */
/* Moderação Visual de Mídia (requer permissão "media_mod")            */
/* ------------------------------------------------------------------ */

export async function setMediaStatus(input: {
  mediaId: string;
  status: MediaStatus;
}): Promise<MediaModActionResult> {
  await requirePermission("media_mod", "/dashboard/eventos");

  const mediaId = String(input.mediaId ?? "").trim();
  const nextStatus = input.status;

  if (!mediaId) return { ok: false, error: "Mídia inválida." };
  if (!(MEDIA_STATUSES as readonly string[]).includes(nextStatus)) {
    return { ok: false, error: "Status inválido." };
  }

  const supabase = await createClient();
  const { data: mediaRow } = await supabase
    .from("media")
    .select("id, event_id")
    .eq("id", mediaId)
    .maybeSingle();

  if (!mediaRow) {
    return { ok: false, error: "Mídia não encontrada." };
  }

  const { error } = await supabase
    .from("media")
    .update({ status: nextStatus })
    .eq("id", mediaId);

  if (error) {
    return { ok: false, error: `Falha ao moderar mídia: ${error.message}` };
  }

  const { data: eventRow } = await supabase
    .from("events")
    .select("slug")
    .eq("id", mediaRow.event_id)
    .maybeSingle();

  revalidatePath("/");
  revalidatePath("/dashboard/eventos");
  if (eventRow?.slug) {
    revalidatePath(`/evento/${eventRow.slug}`);
  }

  return { ok: true, status: nextStatus };
}

export async function deleteModeratedMedia(
  mediaIdInput: string,
): Promise<MediaModActionResult> {
  await requirePermission("media_mod", "/dashboard/eventos");

  const mediaId = String(mediaIdInput ?? "").trim();
  if (!mediaId) return { ok: false, error: "Mídia inválida." };

  const supabase = await createClient();

  const { data: media } = await supabase
    .from("media")
    .select("*")
    .eq("id", mediaId)
    .maybeSingle();

  if (!media) {
    return { ok: false, error: "Mídia não encontrada." };
  }

  const { data: eventRow } = await supabase
    .from("events")
    .select("slug")
    .eq("id", media.event_id)
    .maybeSingle();

  try {
    if (media.drive_file_id) {
      await deleteDriveFile(media.drive_file_id);
    }
    if (media.storage_path) {
      await supabase.storage.from("media").remove([media.storage_path]);
    }

    const { error } = await supabase.from("media").delete().eq("id", mediaId);
    if (error) throw error;

    revalidatePath("/");
    revalidatePath("/dashboard/eventos");
    if (eventRow?.slug) {
      revalidatePath(`/evento/${eventRow.slug}`);
    }

    return { ok: true };
  } catch (cause) {
    const message =
      cause instanceof Error ? cause.message : "Falha ao excluir mídia.";
    return { ok: false, error: message };
  }
}
