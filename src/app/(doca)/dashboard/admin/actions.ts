"use server";

import { revalidatePath } from "next/cache";

import {
  ALL_STAFF_PERMISSIONS,
  requireAdmin,
  requirePermission,
  STAFF_ROLES,
} from "@/lib/auth";
import type {
  EventAccent,
  InterestType,
  StaffInviteRole,
  StaffPermission,
  UserRole,
} from "@/lib/database.types";
import { createClient } from "@/utils/supabase/server";

export interface ActionState {
  error?: string;
  message?: string;
}

const INTEREST_TYPES: readonly InterestType[] = ["none", "link", "count", "lead"];
const ACCENTS: readonly EventAccent[] = ["purple", "blue", "red", "green"];
const VALID_PERMISSIONS = new Set<string>(ALL_STAFF_PERMISSIONS);
const VALID_STAFF_ROLES = new Set<string>(STAFF_ROLES);
const VALID_MEMBER_ROLES = new Set<string>([...STAFF_ROLES, "creator"]);

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

function sanitizePermissions(entries: FormDataEntryValue[]): StaffPermission[] {
  const unique = new Set<StaffPermission>();
  for (const entry of entries) {
    const perm = String(entry).trim();
    if (VALID_PERMISSIONS.has(perm)) {
      unique.add(perm as StaffPermission);
    }
  }
  return Array.from(unique);
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    // tira marcas de acentuação (combining diacritics U+0300–U+036F)
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

/* ------------------------------------------------------------------ */
/* Equipe & Convites Híbridos                                          */
/* ------------------------------------------------------------------ */

export async function setApproval(formData: FormData): Promise<void> {
  const admin = await requireAdmin();

  const userId = String(formData.get("user_id") ?? "").trim();
  const approve = String(formData.get("approve") ?? "") === "true";
  if (!userId) return;
  if (userId === admin.id && !approve) return;

  const supabase = await createClient();
  await supabase
    .from("users")
    .update({ is_approved: approve })
    .eq("id", userId);

  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard");
}

export async function setRole(formData: FormData): Promise<void> {
  const admin = await requireAdmin();

  const userId = String(formData.get("user_id") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim();

  // Um admin não pode rebaixar a si mesmo (evita ficar sem admin).
  if (!userId || userId === admin.id) return;
  if (!VALID_STAFF_ROLES.has(role)) return;

  const supabase = await createClient();
  await supabase
    .from("users")
    .update({
      role: role as StaffInviteRole,
      ...(role === "admin" ? { is_approved: true } : {}),
    })
    .eq("id", userId);

  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard");
}

export async function updateMemberAccess(formData: FormData): Promise<void> {
  const admin = await requireAdmin();

  const userId = String(formData.get("user_id") ?? "").trim();
  const roleRaw = String(formData.get("role") ?? "").trim();

  // Impede que o admin altere ou rebaixe a própria credencial.
  if (!userId || userId === admin.id) return;
  if (!VALID_MEMBER_ROLES.has(roleRaw)) return;

  const role = roleRaw as UserRole;
  const permissions = sanitizePermissions(formData.getAll("permissions"));

  const supabase = await createClient();
  await supabase
    .from("users")
    .update({
      role,
      permissions,
      is_approved: true,
    })
    .eq("id", userId);

  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard");
}

export async function inviteStaff(formData: FormData): Promise<void> {
  const admin = await requireAdmin();

  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const roleRaw = String(formData.get("role") ?? "").trim();

  if (!fullName || !email || !email.includes("@")) return;
  if (!VALID_STAFF_ROLES.has(roleRaw)) return;

  const role = roleRaw as StaffInviteRole;
  const permissions = sanitizePermissions(formData.getAll("permissions"));

  const supabase = await createClient();

  const { data: inviteRow, error: upsertError } = await supabase
    .from("staff_invites")
    .upsert(
      {
        email,
        full_name: fullName,
        role,
        permissions,
        invited_by: admin.id,
        accepted_at: null,
      },
      { onConflict: "email" },
    )
    .select("id")
    .maybeSingle();

  if (upsertError) return;

  const { data: existingUsers } = await supabase
    .from("users")
    .select("id, full_name")
    .ilike("email", email)
    .limit(1);

  const existingUser = existingUsers?.[0];
  if (existingUser) {
    // Nunca permite que o próprio admin perca o cargo master por convite.
    const resolvedRole: StaffInviteRole =
      existingUser.id === admin.id ? "admin" : role;

    await supabase
      .from("users")
      .update({
        role: resolvedRole,
        permissions,
        is_approved: true,
        ...(existingUser.full_name?.trim() ? {} : { full_name: fullName }),
      })
      .eq("id", existingUser.id);

    if (inviteRow?.id) {
      await supabase
        .from("staff_invites")
        .update({ accepted_at: new Date().toISOString() })
        .eq("id", inviteRow.id);
    }
  }

  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard");
}

export async function cancelStaffInvite(formData: FormData): Promise<void> {
  await requireAdmin();

  const inviteId = String(formData.get("invite_id") ?? "").trim();
  if (!inviteId) return;

  const supabase = await createClient();
  await supabase.from("staff_invites").delete().eq("id", inviteId);

  revalidatePath("/dashboard/admin");
}

/* ------------------------------------------------------------------ */
/* Eventos                                                             */
/* ------------------------------------------------------------------ */

export async function createEvent(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requirePermission("events", "/dashboard/eventos");

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
    const ext = coverImageFile.name.split(".").pop() ?? "bin";
    const path = `flyers/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("media")
      .upload(path, coverImageFile, {
        cacheControl: "31536000",
        contentType: coverImageFile.type,
      });

    if (uploadError) return { error: `Erro ao subir flyer: ${uploadError.message}` };
    const { data } = supabase.storage.from("media").getPublicUrl(path);
    coverImage = data.publicUrl;
  }

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
    interest_type: toInterestType(interestType),
    interest_count: 0,
    ticket_url: ticketUrl || null,
    instagram_url: instagramUrl || null,
    accent: toAccent(accent),
    is_published: true,
    created_by: actor.id,
  });

  if (error) return { error: `Não rolou: ${error.message}` };

  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/eventos");
  revalidatePath("/");

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
    const ext = coverImageFile.name.split(".").pop() ?? "bin";
    const path = `flyers/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("media")
      .upload(path, coverImageFile, {
        cacheControl: "31536000",
        contentType: coverImageFile.type,
      });

    if (uploadError) return { error: `Erro ao subir flyer: ${uploadError.message}` };
    const { data } = supabase.storage.from("media").getPublicUrl(path);
    coverImage = data.publicUrl;
  }

  const { error } = await supabase
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
    .eq("id", eventId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/eventos");
  revalidatePath("/");
  revalidatePath("/", "layout");

  return { message: "success" };
}

export async function togglePublished(formData: FormData): Promise<void> {
  await requirePermission("events", "/dashboard/eventos");

  const eventId = String(formData.get("event_id") ?? "");
  const publish = String(formData.get("publish") ?? "") === "true";
  if (!eventId) return;

  const supabase = await createClient();
  await supabase
    .from("events")
    .update({ is_published: publish })
    .eq("id", eventId);

  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/eventos");
  revalidatePath("/");
}

export async function deleteEvent(formData: FormData): Promise<void> {
  await requirePermission("events", "/dashboard/eventos");

  const eventId = String(formData.get("event_id") ?? "");
  if (!eventId) return;

  const supabase = await createClient();
  await supabase.from("events").delete().eq("id", eventId);

  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/eventos");
  revalidatePath("/");
}
