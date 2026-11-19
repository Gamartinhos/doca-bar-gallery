import type { Metadata } from "next";
import Image from "next/image";

import type { MenuCategory, MenuItem } from "@/lib/database.types";
import { createClient } from "@/utils/supabase/server";

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
    .map((category) => ({
      category,
      items: itemsByCategory.get(category.id) ?? [],
    }))
    .filter((group) => group.items.length > 0);

  return (
    <>
      {/* ================= HERO ================= */}
      <section className="concrete relative overflow-hidden border-b border-concrete">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-20"
        >
          <Image
            src="/id-visual/capa-cardapio.jfif"
            alt=""
            fill
            unoptimized
            sizes="100vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-void/80 via-void/70 to-void" />
        </div>

        <span
          aria-hidden="true"
          className="pointer-events-none absolute -left-6 bottom-6 select-none font-tag text-6xl text-neon-orange/15 sm:text-8xl"
        >
          sem gelo? nunca
        </span>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-4 top-8 select-none font-tag text-5xl text-neon-gold/15 sm:text-7xl"
        >
          fiado não
        </span>

        <div className="relative mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 sm:py-28">
          <p className="stamp animate-rise text-gold-bright">
            ▸ Balcão da Doca
          </p>
          <h1 className="chromatic animate-rise mt-4 text-balance-tight font-display text-[clamp(3.5rem,14vw,8rem)] leading-[0.82]">
            CARDÁPIO
          </h1>
          <p className="animate-rise mx-auto mt-6 max-w-lg text-lg leading-relaxed text-bone/80">
            Bebida gelada, combo de respeito e porção generosa. Peça no balcão
            ou direto no camarote.
          </p>
        </div>

        <div className="hazard h-1 opacity-75" aria-hidden="true" />
      </section>

      {menu.length === 0 ? (
        <div className="mx-auto max-w-4xl px-4 py-24 sm:px-6">
          <div className="fence border border-concrete px-6 py-20 text-center">
            <p className="font-display text-4xl text-bone/75">
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
            className="sticky top-[104px] z-30 overflow-x-auto border-b border-concrete bg-void/95 backdrop-blur-md lg:top-[66px]"
          >
            <ul className="mx-auto flex max-w-4xl gap-2 whitespace-nowrap px-4 py-3 sm:px-6">
              {menu.map(({ category, items: catItems }) => (
                <li key={category.id}>
                  <a
                    href={`#cat-${category.id}`}
                    className="stamp inline-block border border-concrete px-3 py-1.5 text-bone/85 transition-colors hover:border-neon-orange hover:text-neon-orange"
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
                className="scroll-mt-40 lg:scroll-mt-32"
              >
                <div className="tape concrete mb-8 flex items-baseline justify-between gap-4 border border-neon-gold/30 px-5 py-4">
                  <h2 className="font-display text-3xl text-gold-bright sm:text-4xl">
                    {category.name}
                  </h2>
                  <span className="stamp shrink-0 text-neon-orange">
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
                        <span className="shrink-0 font-tech text-lg font-semibold text-gold-bright">
                          {formatPrice(item.price)}
                        </span>
                      </div>
                      {item.description && (
                        <p className="mt-1.5 text-sm leading-snug text-bone/65">
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
