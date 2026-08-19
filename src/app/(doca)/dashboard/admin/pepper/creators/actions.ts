"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import type { PepperTier } from "@/lib/pepper/types";
import { createClient } from "@/utils/supabase/server";

export interface ActionState {
  error?: string;
  message?: string;
}

const TIERS: readonly PepperTier[] = ["rising", "core", "headline"];

function toTier(value: string): PepperTier {
  return (TIERS as readonly string[]).includes(value) ? (value as PepperTier) : "rising";
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

function toInt(value: FormDataEntryValue | null, fallback = 0): number {
  const n = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function toDecimal(value: FormDataEntryValue | null, fallback: number): number {
  const n = Number.parseFloat(String(value ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
}

interface CreatorFields {
  name: string;
  slugInput: string;
  handle: string;
  tiktokHandle: string;
  bio: string;
  city: string;
  avatarUrl: string;
  coverUrl: string;
  followersInstagram: number;
  followersTiktok: number;
  avgViews: number;
  engagementRate: number;
  rateMultiplier: number;
  tier: PepperTier;
  userId: string;
}

function readFields(formData: FormData): CreatorFields {
  return {
    name: String(formData.get("name") ?? "").trim(),
    slugInput: String(formData.get("slug") ?? "").trim(),
    handle: String(formData.get("handle") ?? "").trim().replace(/^@/, ""),
    tiktokHandle: String(formData.get("tiktok_handle") ?? "").trim().replace(/^@/, ""),
    bio: String(formData.get("bio") ?? "").trim(),
    city: String(formData.get("city") ?? "").trim(),
    avatarUrl: String(formData.get("avatar_url") ?? "").trim(),
    coverUrl: String(formData.get("cover_url") ?? "").trim(),
    followersInstagram: toInt(formData.get("followers_instagram")),
    followersTiktok: toInt(formData.get("followers_tiktok")),
    avgViews: toInt(formData.get("avg_views")),
    engagementRate: toDecimal(formData.get("engagement_rate"), 0),
    rateMultiplier: Math.min(9, Math.max(0.1, toDecimal(formData.get("rate_multiplier"), 1))),
    tier: toTier(String(formData.get("tier") ?? "rising")),
    userId: String(formData.get("user_id") ?? "").trim(),
  };
}

/** Sobe o arquivo pro Storage se veio um, senão devolve a URL colada no campo texto. */
async function resolveAvatarUrl(
  supabase: Awaited<ReturnType<typeof createClient>>,
  avatarFile: File | null,
  fallbackUrl: string,
): Promise<{ url: string } | { error: string }> {
  if (!avatarFile || avatarFile.size === 0) return { url: fallbackUrl };

  const ext = avatarFile.name.split(".").pop() ?? "bin";
  const path = `pepper/avatars/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error: uploadError } = await supabase.storage.from("media").upload(path, avatarFile, {
    cacheControl: "31536000",
    contentType: avatarFile.type,
  });

  if (uploadError) return { error: `Erro ao subir a foto: ${uploadError.message}` };

  const { data } = supabase.storage.from("media").getPublicUrl(path);
  return { url: data.publicUrl };
}

/** Garante slug único, opcionalmente ignorando o próprio registro (edição). */
async function resolveUniqueSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  base: string,
  ignoreId?: string,
): Promise<string> {
  const { data: existing } = await supabase
    .from("pepper_creators")
    .select("id, slug")
    .like("slug", `${base}%`);

  const taken = new Set(
    (existing ?? []).filter((c) => c.id !== ignoreId).map((c) => c.slug),
  );

  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

export async function createCreator(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const f = readFields(formData);
  const avatarFile = formData.get("avatar_url_file") as File | null;

  if (!f.name) return { error: "O creator precisa de um nome." };

  const supabase = await createClient();

  const avatarResult = await resolveAvatarUrl(supabase, avatarFile, f.avatarUrl);
  if ("error" in avatarResult) return { error: avatarResult.error };

  const base = slugify(f.slugInput || f.name) || "creator";
  const slug = await resolveUniqueSlug(supabase, base);

  const { error } = await supabase.from("pepper_creators").insert({
    name: f.name,
    slug,
    handle: f.handle || null,
    tiktok_handle: f.tiktokHandle || null,
    bio: f.bio || null,
    city: f.city || null,
    avatar_url: avatarResult.url || null,
    cover_url: f.coverUrl || null,
    tags: [],
    followers_instagram: f.followersInstagram,
    followers_tiktok: f.followersTiktok,
    avg_views: f.avgViews,
    engagement_rate: f.engagementRate,
    rate_multiplier: f.rateMultiplier,
    tier: f.tier,
    user_id: f.userId || null,
    is_published: false,
    sort_order: 0,
  });

  if (error) return { error: `Não rolou: ${error.message}` };

  revalidatePath("/dashboard/admin/pepper/creators");
  revalidatePath("/pepper/creators");
  revalidatePath(`/pepper/creators/${slug}`);

  return { message: `Creator "${f.name}" cadastrado — ainda oculto até publicar.` };
}

export async function updateCreator(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const creatorId = String(formData.get("creator_id") ?? "").trim();
  const f = readFields(formData);
  const avatarFile = formData.get("avatar_url_file") as File | null;

  if (!creatorId) return { error: "ID do creator não encontrado." };
  if (!f.name) return { error: "O creator precisa de um nome." };

  const supabase = await createClient();

  const avatarResult = await resolveAvatarUrl(supabase, avatarFile, f.avatarUrl);
  if ("error" in avatarResult) return { error: avatarResult.error };

  const base = slugify(f.slugInput || f.name) || "creator";
  const slug = await resolveUniqueSlug(supabase, base, creatorId);

  const { error } = await supabase
    .from("pepper_creators")
    .update({
      name: f.name,
      slug,
      handle: f.handle || null,
      tiktok_handle: f.tiktokHandle || null,
      bio: f.bio || null,
      city: f.city || null,
      avatar_url: avatarResult.url || null,
      cover_url: f.coverUrl || null,
      followers_instagram: f.followersInstagram,
      followers_tiktok: f.followersTiktok,
      avg_views: f.avgViews,
      engagement_rate: f.engagementRate,
      rate_multiplier: f.rateMultiplier,
      tier: f.tier,
      user_id: f.userId || null,
    })
    .eq("id", creatorId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/admin/pepper/creators");
  revalidatePath("/pepper/creators");
  revalidatePath(`/pepper/creators/${slug}`);

  return { message: "success" };
}

export async function toggleCreatorPublished(formData: FormData): Promise<void> {
  await requireAdmin();

  const creatorId = String(formData.get("creator_id") ?? "");
  const publish = String(formData.get("publish") ?? "") === "true";
  if (!creatorId) return;

  const supabase = await createClient();
  await supabase.from("pepper_creators").update({ is_published: publish }).eq("id", creatorId);

  revalidatePath("/dashboard/admin/pepper/creators");
  revalidatePath("/pepper/creators");
}

export async function deleteCreator(formData: FormData): Promise<void> {
  await requireAdmin();

  const creatorId = String(formData.get("creator_id") ?? "");
  if (!creatorId) return;

  const supabase = await createClient();
  await supabase.from("pepper_creators").delete().eq("id", creatorId);

  revalidatePath("/dashboard/admin/pepper/creators");
  revalidatePath("/pepper/creators");
}
