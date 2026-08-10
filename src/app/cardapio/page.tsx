import type { Metadata } from "next";
import { createClient } from "@/utils/supabase/server";
import type { MenuCategory, MenuItem } from "@/lib/database.types";

export const metadata: Metadata = {
  title: "Cardápio · DOCA BAR",
  description: "Bebidas e porções da Lapa.",
};

export const revalidate = 0;

export default async function CardapioPage() {
  const supabase = await createClient();

  const { data: categoriesData } = await supabase
    .from("menu_categories")
    .select("*")
    .order("sort_order", { ascending: true });

  const { data: itemsData } = await supabase
    .from("menu_items")
    .select("*")
    .eq("is_available", true)
    .order("name", { ascending: true });

  const categories = (categoriesData ?? []) as MenuCategory[];
  const items = (itemsData ?? []) as MenuItem[];

  // Group items by category
  const itemsByCategory = new Map<string, MenuItem[]>();
  for (const item of items) {
    if (!itemsByCategory.has(item.category_id)) {
      itemsByCategory.set(item.category_id, []);
    }
    itemsByCategory.get(item.category_id)!.push(item);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-24 sm:px-6">
      <header className="mb-16 text-center">
        <h1 className="chromatic font-display text-5xl sm:text-7xl">CARDÁPIO</h1>
        <p className="stamp mt-4 text-neon-green">Sirva-se</p>
      </header>

      {categories.length === 0 ? (
        <div className="fence border border-concrete p-12 text-center text-bone/60">
          Nenhum item cadastrado no cardápio ainda.
        </div>
      ) : (
        <div className="space-y-16">
          {categories.map((category) => {
            const catItems = itemsByCategory.get(category.id) ?? [];
            if (catItems.length === 0) return null;

            return (
              <section key={category.id}>
                <h2 className="mb-8 border-b border-concrete pb-4 font-display text-3xl text-neon-purple">
                  {category.name}
                </h2>
                <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  {catItems.map((item) => (
                    <li key={item.id} className="flex justify-between gap-4">
                      <div>
                        <h3 className="font-bold text-bone">{item.name}</h3>
                        {item.description && (
                          <p className="mt-1 text-sm text-bone/70">
                            {item.description}
                          </p>
                        )}
                      </div>
                      <div className="font-tech text-lg text-neon-blue">
                        R$ {Number(item.price).toFixed(2).replace(".", ",")}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
