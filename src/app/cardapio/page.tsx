import type { Metadata } from "next";
import { createClient } from "@/utils/supabase/server";
import type { MenuCategory, MenuItem } from "@/lib/database.types";

export const metadata: Metadata = {
  title: "Cardápio · DOCA BAR",
  description: "Bebidas e porções da Lapa.",
};

export const revalidate = 0;

function formatPrice(price: number | null): string {
  if (price === null) return "consultar";
  return `R$ ${Number(price).toFixed(2).replace(".", ",")}`;
}

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

  const itemsByCategory = new Map<string, MenuItem[]>();
  for (const item of items) {
    if (!itemsByCategory.has(item.category_id)) {
      itemsByCategory.set(item.category_id, []);
    }
    itemsByCategory.get(item.category_id)!.push(item);
  }

  const menu = categories
    .map((category) => ({ category, items: itemsByCategory.get(category.id) ?? [] }))
    .filter((group) => group.items.length > 0);

  return (
    <>
      {/* ================= HERO ================= */}
      <section className="concrete relative overflow-hidden border-b border-concrete">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -left-6 bottom-6 select-none font-tag text-6xl text-neon-green/12 sm:text-8xl"
        >
          sem gelo? nunca
        </span>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-4 top-8 select-none font-tag text-5xl text-neon-blue/12 sm:text-7xl"
        >
          fiado não
        </span>

        <div className="relative mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 sm:py-28">
          <p className="stamp animate-rise text-neon-green">
            ▸ Balcão da Doca
          </p>
          <h1 className="chromatic animate-rise mt-4 text-balance-tight font-display text-[clamp(3.5rem,14vw,8rem)] leading-[0.82]">
            CARDÁPIO
          </h1>
          <p className="animate-rise mt-6 max-w-lg mx-auto text-lg leading-relaxed text-bone/75">
            Bebida gelada, porção generosa, preço sem susto. Peça no balcão.
          </p>
        </div>

        <div className="hazard h-1 opacity-70" aria-hidden="true" />
      </section>

      {menu.length === 0 ? (
        <div className="mx-auto max-w-4xl px-4 py-24 sm:px-6">
          <div className="fence border border-concrete px-6 py-20 text-center">
            <p className="font-display text-4xl text-bone/70">
              Cardápio em montagem
            </p>
            <p className="stamp mt-3">Volta aqui daqui a pouco</p>
          </div>
        </div>
      ) : (
        <>
          {/* ================= NAV DE CATEGORIAS ================= */}
          <nav
            aria-label="Categorias do cardápio"
            className="sticky top-14 z-30 overflow-x-auto border-b border-concrete bg-void/90 backdrop-blur-md sm:top-16"
          >
            <ul className="mx-auto flex max-w-4xl gap-2 whitespace-nowrap px-4 py-3 sm:px-6">
              {menu.map(({ category, items: catItems }) => (
                <li key={category.id}>
                  <a
                    href={`#cat-${category.id}`}
                    className="stamp inline-block border border-concrete px-3 py-1.5 transition-colors hover:border-neon-magenta hover:text-neon-magenta"
                  >
                    {category.name}{" "}
                    <span className="text-ash">({catItems.length})</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* ================= CATEGORIAS ================= */}
          <div className="mx-auto max-w-4xl space-y-16 px-4 py-16 sm:px-6 sm:py-20">
            {menu.map(({ category, items: catItems }) => (
              <section
                key={category.id}
                id={`cat-${category.id}`}
                className="scroll-mt-32"
              >
                <div className="tape concrete mb-8 flex items-baseline justify-between gap-4 border border-concrete px-5 py-4">
                  <h2 className="font-display text-3xl text-neon-purple sm:text-4xl">
                    {category.name}
                  </h2>
                  <span className="stamp shrink-0">
                    {catItems.length} {catItems.length === 1 ? "item" : "itens"}
                  </span>
                </div>

                <ul className="space-y-6">
                  {catItems.map((item) => (
                    <li key={item.id}>
                      <div className="flex items-baseline gap-3">
                        <h3 className="shrink-0 font-display text-xl leading-tight text-bone sm:text-2xl">
                          {item.name}
                        </h3>
                        <span
                          aria-hidden="true"
                          className="mb-1 flex-1 border-b border-dotted border-ash/40"
                        />
                        <span className="shrink-0 font-tech text-lg text-neon-blue">
                          {formatPrice(item.price)}
                        </span>
                      </div>
                      {item.description && (
                        <p className="mt-1.5 text-sm leading-snug text-bone/60">
                          {item.description}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}
    </>
  );
}
