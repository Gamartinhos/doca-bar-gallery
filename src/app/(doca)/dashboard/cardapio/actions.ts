"use server";

import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/auth";
import type { MenuCategory, MenuItem } from "@/lib/database.types";
import { createClient } from "@/utils/supabase/server";

export interface MenuActionResult<T = undefined> {
  ok: boolean;
  error?: string;
  data?: T;
}

function revalidateMenu() {
  revalidatePath("/cardapio");
  revalidatePath("/dashboard/cardapio");
}

function parsePrice(
  raw: string,
): { ok: true; value: number | null } | { ok: false; error: string } {
  const cleaned = raw.trim().replace(/^R\$\s*/i, "").replace(",", ".");
  if (!cleaned) {
    return { ok: true, value: null };
  }
  const num = Number(cleaned);
  if (!Number.isFinite(num) || num < 0) {
    return { ok: false, error: "Informe um preço válido (ex.: 25,00) ou deixe vazio para Consultar." };
  }
  return { ok: true, value: Math.round(num * 100) / 100 };
}

function parseSortOrder(raw: unknown, fallback = 0): number {
  const num = Number.parseInt(String(raw ?? ""), 10);
  return Number.isFinite(num) ? num : fallback;
}

export async function createCategory(input: {
  name: string;
  sortOrder?: string | number | null;
}): Promise<MenuActionResult<MenuCategory>> {
  await requirePermission("menu", "/dashboard/cardapio");

  const name = String(input.name ?? "").trim();
  if (!name) {
    return { ok: false, error: "Informe o nome da categoria." };
  }

  const supabase = await createClient();

  let sortOrder: number;
  if (
    input.sortOrder === undefined ||
    input.sortOrder === null ||
    String(input.sortOrder).trim() === ""
  ) {
    const { data: maxRow } = await supabase
      .from("menu_categories")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    sortOrder = (maxRow?.sort_order ?? -1) + 1;
  } else {
    sortOrder = parseSortOrder(input.sortOrder, 0);
  }

  const { data, error } = await supabase
    .from("menu_categories")
    .insert({ name, sort_order: sortOrder })
    .select("*")
    .single();

  if (error) {
    return { ok: false, error: `Erro ao criar categoria: ${error.message}` };
  }

  revalidateMenu();
  return { ok: true, data: data as MenuCategory };
}

export async function updateCategory(input: {
  id: string;
  name: string;
  sortOrder: string | number;
}): Promise<MenuActionResult<MenuCategory>> {
  await requirePermission("menu", "/dashboard/cardapio");

  const id = String(input.id ?? "").trim();
  const name = String(input.name ?? "").trim();
  if (!id) return { ok: false, error: "Categoria inválida." };
  if (!name) return { ok: false, error: "O nome da categoria não pode ficar vazio." };

  const sortOrder = parseSortOrder(input.sortOrder, 0);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("menu_categories")
    .update({ name, sort_order: sortOrder })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return { ok: false, error: `Erro ao atualizar categoria: ${error.message}` };
  }

  revalidateMenu();
  return { ok: true, data: data as MenuCategory };
}

export async function deleteCategory(
  categoryId: string,
): Promise<MenuActionResult> {
  await requirePermission("menu", "/dashboard/cardapio");

  const id = String(categoryId ?? "").trim();
  if (!id) return { ok: false, error: "Categoria inválida." };

  const supabase = await createClient();
  const { error } = await supabase.from("menu_categories").delete().eq("id", id);

  if (error) {
    return { ok: false, error: `Erro ao remover categoria: ${error.message}` };
  }

  revalidateMenu();
  return { ok: true };
}

export async function createMenuItem(input: {
  categoryId: string;
  name: string;
  description?: string;
  priceRaw: string;
  isAvailable: boolean;
}): Promise<MenuActionResult<MenuItem>> {
  await requirePermission("menu", "/dashboard/cardapio");

  const categoryId = String(input.categoryId ?? "").trim();
  const name = String(input.name ?? "").trim();
  const description = String(input.description ?? "").trim();

  if (!categoryId) return { ok: false, error: "Escolha uma categoria." };
  if (!name) return { ok: false, error: "Informe o nome do item." };

  const parsedPrice = parsePrice(String(input.priceRaw ?? ""));
  if (!parsedPrice.ok) return { ok: false, error: parsedPrice.error };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("menu_items")
    .insert({
      category_id: categoryId,
      name,
      description: description || null,
      price: parsedPrice.value,
      is_available: Boolean(input.isAvailable),
    })
    .select("*")
    .single();

  if (error) {
    return { ok: false, error: `Erro ao criar item: ${error.message}` };
  }

  revalidateMenu();
  return { ok: true, data: data as MenuItem };
}

export async function updateMenuItem(input: {
  id: string;
  categoryId: string;
  name: string;
  description?: string;
  priceRaw: string;
  isAvailable: boolean;
}): Promise<MenuActionResult<MenuItem>> {
  await requirePermission("menu", "/dashboard/cardapio");

  const id = String(input.id ?? "").trim();
  const categoryId = String(input.categoryId ?? "").trim();
  const name = String(input.name ?? "").trim();
  const description = String(input.description ?? "").trim();

  if (!id) return { ok: false, error: "Item inválido." };
  if (!categoryId) return { ok: false, error: "Escolha uma categoria." };
  if (!name) return { ok: false, error: "O item precisa de um nome." };

  const parsedPrice = parsePrice(String(input.priceRaw ?? ""));
  if (!parsedPrice.ok) return { ok: false, error: parsedPrice.error };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("menu_items")
    .update({
      category_id: categoryId,
      name,
      description: description || null,
      price: parsedPrice.value,
      is_available: Boolean(input.isAvailable),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return { ok: false, error: `Erro ao atualizar item: ${error.message}` };
  }

  revalidateMenu();
  return { ok: true, data: data as MenuItem };
}

export async function quickUpdateItemPrice(input: {
  id: string;
  priceRaw: string;
}): Promise<MenuActionResult<MenuItem>> {
  await requirePermission("menu", "/dashboard/cardapio");

  const id = String(input.id ?? "").trim();
  if (!id) return { ok: false, error: "Item inválido." };

  const parsedPrice = parsePrice(String(input.priceRaw ?? ""));
  if (!parsedPrice.ok) return { ok: false, error: parsedPrice.error };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("menu_items")
    .update({ price: parsedPrice.value })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return { ok: false, error: `Erro ao atualizar preço: ${error.message}` };
  }

  revalidateMenu();
  return { ok: true, data: data as MenuItem };
}

export async function toggleItemAvailability(input: {
  id: string;
  isAvailable: boolean;
}): Promise<MenuActionResult<MenuItem>> {
  await requirePermission("menu", "/dashboard/cardapio");

  const id = String(input.id ?? "").trim();
  if (!id) return { ok: false, error: "Item inválido." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("menu_items")
    .update({ is_available: Boolean(input.isAvailable) })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return { ok: false, error: `Erro ao alterar disponibilidade: ${error.message}` };
  }

  revalidateMenu();
  return { ok: true, data: data as MenuItem };
}

export async function deleteMenuItem(
  itemId: string,
): Promise<MenuActionResult> {
  await requirePermission("menu", "/dashboard/cardapio");

  const id = String(itemId ?? "").trim();
  if (!id) return { ok: false, error: "Item inválido." };

  const supabase = await createClient();
  const { error } = await supabase.from("menu_items").delete().eq("id", id);

  if (error) {
    return { ok: false, error: `Erro ao remover item: ${error.message}` };
  }

  revalidateMenu();
  return { ok: true };
}
