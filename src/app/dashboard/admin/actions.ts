"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/utils/supabase/server";

export interface ActionState {
  error?: string;
  message?: string;
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    // tira marcas de acentuação (combining diacritics U+0300–U+036F)
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

/* ------------------------------------------------------------------ */
/* Fotógrafos                                                          */
/* ------------------------------------------------------------------ */

export async function setApproval(formData: FormData): Promise<void> {
  await requireAdmin();

  const userId = String(formData.get("user_id") ?? "");
  const approve = String(formData.get("approve") ?? "") === "true";
  if (!userId) return;

  const supabase = await createClient();
  await supabase
    .from("users")
    .update({ is_approved: approve })
    .eq("id", userId);

  revalidatePath("/dashboard/admin");
}

export async function setRole(formData: FormData): Promise<void> {
  const admin = await requireAdmin();

  const userId = String(formData.get("user_id") ?? "");
  const role = String(formData.get("role") ?? "");

  // Um admin não pode rebaixar a si mesmo (evita ficar sem admin).
  if (!userId || userId === admin.id) return;
  if (role !== "admin" && role !== "photographer") return;

  const supabase = await createClient();
  await supabase
    .from("users")
    .update({ role, ...(role === "admin" ? { is_approved: true } : {}) })
    .eq("id", userId);

  revalidatePath("/dashboard/admin");
}

/* ------------------------------------------------------------------ */
/* Eventos                                                             */
/* ------------------------------------------------------------------ */

export async function createEvent(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdmin();

  const title = String(formData.get("title") ?? "").trim();
  const date = String(formData.get("date") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const coverImage = String(formData.get("cover_image") ?? "").trim();
  const accent = String(formData.get("accent") ?? "purple");
  const interestType = String(formData.get("interest_type") ?? "none");
  const ticketUrl = String(formData.get("ticket_url") ?? "").trim();
  const instagramUrl = String(formData.get("instagram_url") ?? "").trim();

  if (!title) return { error: "O evento precisa de um nome." };
  if (!date) return { error: "Escolha a data da noite." };

  const supabase = await createClient();

  // Garante slug único acrescentando sufixo quando necessário.
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
    interest_type: (["none", "link", "count", "lead"] as const).includes(interestType as any)
      ? (interestType as "none" | "link" | "count" | "lead")
      : "none",
    interest_count: 0,
    ticket_url: ticketUrl || null,
    instagram_url: instagramUrl || null,
    accent: (["purple", "blue", "red", "green"] as const).includes(
      accent as "purple",
    )
      ? (accent as "purple" | "blue" | "red" | "green")
      : "purple",
    is_published: true,
    created_by: admin.id,
  });

  if (error) return { error: `Não rolou: ${error.message}` };

  revalidatePath("/dashboard/admin");
  revalidatePath("/");

  return { message: `Evento "${title}" no ar.` };
}

export async function updateEvent(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdmin();

  const eventId = String(formData.get("event_id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const date = String(formData.get("date") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const coverImage = String(formData.get("cover_image") ?? "").trim();
  const accent = String(formData.get("accent") ?? "purple");
  const interestType = String(formData.get("interest_type") ?? "none");
  const ticketUrl = String(formData.get("ticket_url") ?? "").trim();
  const instagramUrl = String(formData.get("instagram_url") ?? "").trim();

  if (!eventId) return { error: "ID do evento não encontrado." };
  if (!title) return { error: "O evento precisa de um nome." };
  if (!date) return { error: "Escolha a data da noite." };

  const supabase = await createClient();

  const { error } = await supabase.from("events").update({
    title,
    date,
    description: description || null,
    cover_image: coverImage || null,
    interest_type: (["none", "link", "count", "lead"] as const).includes(interestType as any)
      ? (interestType as "none" | "link" | "count" | "lead")
      : "none",
    ticket_url: ticketUrl || null,
    instagram_url: instagramUrl || null,
    accent: (["purple", "blue", "red", "green"] as const).includes(
      accent as "purple",
    )
      ? (accent as "purple" | "blue" | "red" | "green")
      : "purple",
  }).eq("id", eventId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/admin");
  revalidatePath("/", "layout");

  return { message: "success" };
}

export async function togglePublished(formData: FormData): Promise<void> {
  await requireAdmin();

  const eventId = String(formData.get("event_id") ?? "");
  const publish = String(formData.get("publish") ?? "") === "true";
  if (!eventId) return;

  const supabase = await createClient();
  await supabase
    .from("events")
    .update({ is_published: publish })
    .eq("id", eventId);

  revalidatePath("/dashboard/admin");
  revalidatePath("/");
}

export async function deleteEvent(formData: FormData): Promise<void> {
  await requireAdmin();

  const eventId = String(formData.get("event_id") ?? "");
  if (!eventId) return;

  const supabase = await createClient();
  await supabase.from("events").delete().eq("id", eventId);

  revalidatePath("/dashboard/admin");
  revalidatePath("/");
}
