import type { Metadata } from "next";
import Link from "next/link";

import { requirePermission } from "@/lib/auth";
import type { MenuCategory, MenuItem } from "@/lib/database.types";
import { createClient } from "@/utils/supabase/server";

import { CardapioClient } from "./cardapio-client";

export const metadata: Metadata = {
  title: "Gerenciador de Cardápio · QG da Doca",
};
export const revalidate = 0;

export default async function DashboardCardapioPage() {
  await requirePermission("menu", "/dashboard/cardapio");

  const supabase = await createClient();

  const [{ data: categoriesData }, { data: itemsData }] = await Promise.all([
    supabase
      .from("menu_categories")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("menu_items")
      .select("*")
      .order("name", { ascending: true }),
  ]);

  const categories = (categoriesData ?? []) as MenuCategory[];
  const items = (itemsData ?? []) as MenuItem[];

  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/dashboard"
            className="stamp inline-block text-ash transition-colors hover:text-gold-bright"
          >
            ← Voltar ao QG
          </Link>
          <p className="stamp mt-4 text-neon-orange">
            ▸ Balcão da Doca · Estoque &amp; Preços
          </p>
          <h1 className="mt-2 font-display text-5xl sm:text-7xl">
            <span className="text-bone">CARDÁPIO</span>{" "}
            <span className="neon neon-orange">AO VIVO</span>
          </h1>
        </div>

        <Link
          href="/cardapio"
          className="btn-ghost neon-gold !px-4 !py-2.5 !text-xs"
        >
          Ver Cardápio Público ↗
        </Link>
      </div>

      <CardapioClient initialCategories={categories} initialItems={items} />
    </div>
  );
}
