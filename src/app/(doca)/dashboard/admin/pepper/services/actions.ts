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

function toInt(value: FormDataEntryValue | null, fallback = 0): number {
  const n = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function toDecimal(value: FormDataEntryValue | null, fallback: number): number {
  const n = Number.parseFloat(String(value ?? "").replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

async function resolveUniqueSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  base: string,
  ignoreId?: string,
): Promise<string> {
  const { data: existing } = await supabase
    .from("pepper_services")
    .select("id, slug")
    .like("slug", `${base}%`);

  const taken = new Set(
    (existing ?? []).filter((s) => s.id !== ignoreId).map((s) => s.slug),
  );

  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

export async function createService(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const unit = String(formData.get("unit") ?? "").trim() || "entrega";
  const basePrice = toDecimal(formData.get("base_price"), 0);
  const leadDays = toInt(formData.get("lead_days"), 7);
  const icon = String(formData.get("icon") ?? "").trim() || "*";

  if (!name) return { error: "O serviço precisa de um nome." };

  const supabase = await createClient();

  const base = slugify(slugInput || name) || "servico";
  const slug = await resolveUniqueSlug(supabase, base);

  const { data: maxRow } = await supabase
    .from("pepper_services")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const sortOrder = (maxRow?.sort_order ?? -1) + 1;

  const { error } = await supabase.from("pepper_services").insert({
    slug,
    name,
    description: description || null,
    unit,
    base_price: basePrice,
    lead_days: leadDays,
    icon,
    sort_order: sortOrder,
    is_active: true,
  });

  if (error) return { error: `Não rolou: ${error.message}` };

  revalidatePath("/dashboard/admin/pepper/services");
  revalidatePath("/pepper/orcamento");

  return { message: `Serviço "${name}" criado.` };
}

export async function updateService(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const serviceId = String(formData.get("service_id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const unit = String(formData.get("unit") ?? "").trim() || "entrega";
  const basePrice = toDecimal(formData.get("base_price"), 0);
  const leadDays = toInt(formData.get("lead_days"), 7);
  const icon = String(formData.get("icon") ?? "").trim() || "*";

  if (!serviceId) return { error: "ID do serviço não encontrado." };
  if (!name) return { error: "O serviço precisa de um nome." };

  const supabase = await createClient();

  const base = slugify(slugInput || name) || "servico";
  const slug = await resolveUniqueSlug(supabase, base, serviceId);

  const { error } = await supabase
    .from("pepper_services")
    .update({
      slug,
      name,
      description: description || null,
      unit,
      base_price: basePrice,
      lead_days: leadDays,
      icon,
    })
    .eq("id", serviceId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/admin/pepper/services");
  revalidatePath("/pepper/orcamento");

  return { message: "success" };
}

export async function toggleServiceActive(formData: FormData): Promise<void> {
  await requireAdmin();

  const serviceId = String(formData.get("service_id") ?? "");
  const active = String(formData.get("active") ?? "") === "true";
  if (!serviceId) return;

  const supabase = await createClient();
  await supabase.from("pepper_services").update({ is_active: active }).eq("id", serviceId);

  revalidatePath("/dashboard/admin/pepper/services");
  revalidatePath("/pepper/orcamento");
}

export async function deleteService(formData: FormData): Promise<void> {
  await requireAdmin();

  const serviceId = String(formData.get("service_id") ?? "");
  if (!serviceId) return;

  const supabase = await createClient();
  await supabase.from("pepper_services").delete().eq("id", serviceId);

  revalidatePath("/dashboard/admin/pepper/services");
  revalidatePath("/pepper/orcamento");
}

/** Sobe/desce um serviço na ordem de exibição (mesma lógica de moveCreator). */
export async function moveService(formData: FormData): Promise<void> {
  await requireAdmin();

  const serviceId = String(formData.get("service_id") ?? "");
  const direction = String(formData.get("direction") ?? "");
  if (!serviceId || (direction !== "up" && direction !== "down")) return;

  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("pepper_services")
    .select("id")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  const ids = (rows ?? []).map((r) => r.id as string);
  const index = ids.indexOf(serviceId);
  if (index === -1) return;

  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= ids.length) return;

  [ids[index], ids[swapWith]] = [ids[swapWith], ids[index]];

  await Promise.all(
    ids.map((rowId, position) =>
      supabase.from("pepper_services").update({ sort_order: position }).eq("id", rowId),
    ),
  );

  revalidatePath("/dashboard/admin/pepper/services");
  revalidatePath("/pepper/orcamento");
}
