"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import type { MenuCategory, MenuItem } from "@/lib/database.types";

import {
  createCategory,
  createMenuItem,
  deleteCategory,
  deleteMenuItem,
  quickUpdateItemPrice,
  toggleItemAvailability,
  updateCategory,
  updateMenuItem,
} from "./actions";

type AvailabilityFilter = "all" | "available" | "soldout";

function formatPriceInput(price: number | null): string {
  if (price === null || price === undefined) return "";
  return Number(price).toFixed(2).replace(".", ",");
}

function sortCategories(list: MenuCategory[]): MenuCategory[] {
  return [...list].sort(
    (a, b) =>
      a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at),
  );
}

function sortItems(list: MenuItem[]): MenuItem[] {
  return [...list].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

function MenuItemRow({
  item,
  categories,
  onUpdated,
  onDeleted,
}: {
  item: MenuItem;
  categories: MenuCategory[];
  onUpdated: (item: MenuItem) => void;
  onDeleted: (itemId: string) => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [priceDraft, setPriceDraft] = useState(() =>
    formatPriceInput(item.price),
  );
  const [editing, setEditing] = useState(false);
  const [editCategoryId, setEditCategoryId] = useState(item.category_id);
  const [editName, setEditName] = useState(item.name);
  const [editDesc, setEditDesc] = useState(item.description ?? "");
  const [editPrice, setEditPrice] = useState(() => formatPriceInput(item.price));
  const [editAvailable, setEditAvailable] = useState(item.is_available);
  const [feedback, setFeedback] = useState<{
    type: "ok" | "error";
    text: string;
  } | null>(null);

  const serverPriceStr = formatPriceInput(item.price);
  const isPriceDirty = priceDraft.trim() !== serverPriceStr;

  function handleQuickPrice(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    startTransition(async () => {
      const res = await quickUpdateItemPrice({
        id: item.id,
        priceRaw: priceDraft,
      });
      if (!res.ok || !res.data) {
        setFeedback({
          type: "error",
          text: res.error ?? "Erro ao atualizar preço.",
        });
        return;
      }
      onUpdated(res.data);
      setPriceDraft(formatPriceInput(res.data.price));
      setEditPrice(formatPriceInput(res.data.price));
      setFeedback({ type: "ok", text: "Preço salvo" });
      router.refresh();
    });
  }

  function handleToggleAvailability() {
    setFeedback(null);
    const next = !item.is_available;
    startTransition(async () => {
      const res = await toggleItemAvailability({
        id: item.id,
        isAvailable: next,
      });
      if (!res.ok || !res.data) {
        setFeedback({
          type: "error",
          text: res.error ?? "Erro ao alterar disponibilidade.",
        });
        return;
      }
      onUpdated(res.data);
      setEditAvailable(res.data.is_available);
      setFeedback({
        type: "ok",
        text: res.data.is_available ? "Disponível" : "Esgotou",
      });
      router.refresh();
    });
  }

  function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    startTransition(async () => {
      const res = await updateMenuItem({
        id: item.id,
        categoryId: editCategoryId,
        name: editName,
        description: editDesc,
        priceRaw: editPrice,
        isAvailable: editAvailable,
      });
      if (!res.ok || !res.data) {
        setFeedback({
          type: "error",
          text: res.error ?? "Erro ao salvar item.",
        });
        return;
      }
      onUpdated(res.data);
      setPriceDraft(formatPriceInput(res.data.price));
      setEditing(false);
      setFeedback({ type: "ok", text: "Item atualizado" });
      router.refresh();
    });
  }

  function handleDelete() {
    if (!confirm(`Remover "${item.name}" do cardápio?`)) return;
    setFeedback(null);
    startTransition(async () => {
      const res = await deleteMenuItem(item.id);
      if (!res.ok) {
        setFeedback({
          type: "error",
          text: res.error ?? "Erro ao remover item.",
        });
        return;
      }
      onDeleted(item.id);
      router.refresh();
    });
  }

  return (
    <li
      className={`border px-4 py-3.5 transition-colors ${
        item.is_available
          ? "border-concrete bg-ink"
          : "border-neon-red/40 bg-void/80"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4
              className={`font-display text-2xl leading-tight ${
                item.is_available
                  ? "text-bone"
                  : "text-bone/55 line-through"
              }`}
            >
              {item.name}
            </h4>
            {!item.is_available && (
              <span className="skew-tag bg-neon-red px-2 py-0.5 font-tech text-[0.58rem] font-bold uppercase tracking-widest text-void">
                Esgotou
              </span>
            )}
          </div>
          {item.description && (
            <p className="mt-1 text-sm text-ash">{item.description}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Atualização rápida de preço */}
          <form onSubmit={handleQuickPrice} className="flex items-center gap-1.5">
            <label htmlFor={`price-${item.id}`} className="stamp text-[0.6rem]">
              R$
            </label>
            <input
              id={`price-${item.id}`}
              type="text"
              inputMode="decimal"
              value={priceDraft}
              onChange={(e) => setPriceDraft(e.target.value)}
              placeholder="Consultar"
              className="field !w-24 !px-2.5 !py-1.5 font-tech !text-xs text-gold-bright"
            />
            <button
              type="submit"
              disabled={isPending}
              className={`btn-ghost !px-2.5 !py-1.5 !text-[0.65rem] ${
                isPriceDirty
                  ? "border-gold-bright text-gold-bright"
                  : "text-ash"
              }`}
            >
              Salvar R$
            </button>
          </form>

          {/* Toggle 1-clique Disponível / Esgotou */}
          <button
            type="button"
            disabled={isPending}
            onClick={handleToggleAvailability}
            title="Clique para alternar Disponível / Esgotou"
            className={`border px-3 py-1.5 font-tech text-xs font-bold uppercase tracking-[0.12em] transition-colors disabled:opacity-50 ${
              item.is_available
                ? "border-emerald-400/60 bg-emerald-500/15 text-emerald-300 hover:border-neon-red hover:bg-neon-red/15 hover:text-neon-red"
                : "border-neon-red/70 bg-neon-red/15 text-neon-red hover:border-emerald-400 hover:bg-emerald-500/15 hover:text-emerald-300"
            }`}
          >
            {item.is_available ? "● Disponível" : "✕ Esgotou"}
          </button>

          <button
            type="button"
            onClick={() => {
              setEditing((v) => !v);
              setEditCategoryId(item.category_id);
              setEditName(item.name);
              setEditDesc(item.description ?? "");
              setEditPrice(formatPriceInput(item.price));
              setEditAvailable(item.is_available);
            }}
            className="btn-ghost neon-orange !px-3 !py-1.5 !text-xs"
          >
            {editing ? "Fechar" : "Editar"}
          </button>

          <button
            type="button"
            disabled={isPending}
            onClick={handleDelete}
            className="btn-ghost neon-red !px-3 !py-1.5 !text-xs"
          >
            Apagar
          </button>
        </div>
      </div>

      {editing && (
        <form
          onSubmit={handleSaveEdit}
          className="mt-4 space-y-3 border-t border-concrete pt-4"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor={`edit-cat-${item.id}`}
                className="stamp mb-1 block text-[0.6rem]"
              >
                Categoria
              </label>
              <select
                id={`edit-cat-${item.id}`}
                value={editCategoryId}
                onChange={(e) => setEditCategoryId(e.target.value)}
                className="field !py-2 !text-sm"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id} className="bg-ink">
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor={`edit-name-${item.id}`}
                className="stamp mb-1 block text-[0.6rem]"
              >
                Nome *
              </label>
              <input
                id={`edit-name-${item.id}`}
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="field !py-2 !text-sm"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
            <div>
              <label
                htmlFor={`edit-desc-${item.id}`}
                className="stamp mb-1 block text-[0.6rem]"
              >
                Descrição
              </label>
              <input
                id={`edit-desc-${item.id}`}
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                placeholder="Dose, garrafa, acompanhamento…"
                className="field !py-2 !text-sm"
              />
            </div>

            <div>
              <label
                htmlFor={`edit-price-${item.id}`}
                className="stamp mb-1 block text-[0.6rem]"
              >
                Preço (R$)
              </label>
              <input
                id={`edit-price-${item.id}`}
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
                placeholder="Vazio = consultar"
                className="field !py-2 !text-sm"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex cursor-pointer items-center gap-2 font-tech text-xs uppercase tracking-wider text-bone">
              <input
                type="checkbox"
                checked={editAvailable}
                onChange={(e) => setEditAvailable(e.target.checked)}
                className="h-4 w-4 accent-neon-gold"
              />
              <span>Disponível no cardápio</span>
            </label>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="btn-ghost !px-3 !py-1.5 !text-xs"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="btn-gold !px-4 !py-1.5 !text-xs"
              >
                {isPending ? "Salvando…" : "Salvar Alterações"}
              </button>
            </div>
          </div>
        </form>
      )}

      {feedback && (
        <p
          role={feedback.type === "error" ? "alert" : "status"}
          className={`mt-2.5 border px-2.5 py-1 font-tech text-[0.65rem] uppercase tracking-wider ${
            feedback.type === "error"
              ? "border-neon-red bg-neon-red/10 text-neon-red"
              : "border-emerald-400/50 bg-emerald-500/10 text-emerald-300"
          }`}
        >
          {feedback.text}
        </p>
      )}
    </li>
  );
}

function CategoryBlock({
  category,
  items,
  allCategories,
  onCategoryUpdated,
  onCategoryDeleted,
  onItemUpdated,
  onItemDeleted,
}: {
  category: MenuCategory;
  items: MenuItem[];
  allCategories: MenuCategory[];
  onCategoryUpdated: (cat: MenuCategory) => void;
  onCategoryDeleted: (catId: string) => void;
  onItemUpdated: (item: MenuItem) => void;
  onItemDeleted: (itemId: string) => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState(category.name);
  const [orderDraft, setOrderDraft] = useState(String(category.sort_order));
  const [catError, setCatError] = useState<string | null>(null);

  function handleSaveCategory(e: React.FormEvent) {
    e.preventDefault();
    setCatError(null);
    startTransition(async () => {
      const res = await updateCategory({
        id: category.id,
        name: nameDraft,
        sortOrder: orderDraft,
      });
      if (!res.ok || !res.data) {
        setCatError(res.error ?? "Erro ao atualizar categoria.");
        return;
      }
      onCategoryUpdated(res.data);
      setEditing(false);
      router.refresh();
    });
  }

  function handleDeleteCategory() {
    const warn =
      items.length > 0
        ? `Atenção: remover "${category.name}" também apagará seus ${items.length} iten(s)! Continuar?`
        : `Remover a categoria "${category.name}"?`;
    if (!confirm(warn)) return;

    setCatError(null);
    startTransition(async () => {
      const res = await deleteCategory(category.id);
      if (!res.ok) {
        setCatError(res.error ?? "Erro ao remover categoria.");
        return;
      }
      onCategoryDeleted(category.id);
      router.refresh();
    });
  }

  return (
    <section className="space-y-3">
      <div className="tape concrete border border-neon-gold/35 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-baseline gap-3">
            <span className="border border-neon-orange/50 bg-neon-orange/15 px-2 py-0.5 font-tech text-[0.65rem] font-bold uppercase tracking-widest text-neon-orange">
              Ordem #{category.sort_order}
            </span>
            <h3 className="font-display text-3xl text-gold-bright">
              {category.name}
            </h3>
            <span className="stamp text-[0.65rem] text-ash">
              {items.length} {items.length === 1 ? "item" : "itens"}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setEditing((v) => !v);
                setNameDraft(category.name);
                setOrderDraft(String(category.sort_order));
              }}
              className="btn-ghost neon-gold !px-3 !py-1.5 !text-xs"
            >
              {editing ? "Fechar" : "Editar Categoria"}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={handleDeleteCategory}
              className="btn-ghost neon-red !px-3 !py-1.5 !text-xs"
            >
              Excluir Categoria
            </button>
          </div>
        </div>

        {editing && (
          <form
            onSubmit={handleSaveCategory}
            className="mt-4 grid gap-3 border-t border-concrete pt-4 sm:grid-cols-[1fr_110px_auto] sm:items-end"
          >
            <div>
              <label
                htmlFor={`cat-name-${category.id}`}
                className="stamp mb-1 block text-[0.6rem]"
              >
                Nome da Categoria
              </label>
              <input
                id={`cat-name-${category.id}`}
                required
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                className="field !py-2 !text-sm"
              />
            </div>

            <div>
              <label
                htmlFor={`cat-order-${category.id}`}
                className="stamp mb-1 block text-[0.6rem]"
              >
                Ordem
              </label>
              <input
                id={`cat-order-${category.id}`}
                type="number"
                value={orderDraft}
                onChange={(e) => setOrderDraft(e.target.value)}
                className="field !py-2 !text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="btn-gold !px-4 !py-2.5 !text-xs"
            >
              {isPending ? "Salvando…" : "Salvar"}
            </button>
          </form>
        )}

        {catError && (
          <p
            role="alert"
            className="mt-3 border border-neon-red bg-neon-red/10 px-3 py-1.5 font-tech text-xs text-neon-red"
          >
            {catError}
          </p>
        )}
      </div>

      {items.length === 0 ? (
        <p className="border border-dashed border-concrete bg-void/50 px-4 py-5 text-center font-tech text-xs uppercase tracking-wider text-ash">
          Nenhum item exibido nesta categoria com os filtros atuais.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {items.map((item) => (
            <MenuItemRow
              key={item.id}
              item={item}
              categories={allCategories}
              onUpdated={onItemUpdated}
              onDeleted={onItemDeleted}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

export function CardapioClient({
  initialCategories,
  initialItems,
}: {
  initialCategories: MenuCategory[];
  initialItems: MenuItem[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [categories, setCategories] = useState<MenuCategory[]>(() =>
    sortCategories(initialCategories),
  );
  const [items, setItems] = useState<MenuItem[]>(() => sortItems(initialItems));

  // Filtros
  const [search, setSearch] = useState("");
  const [availabilityFilter, setAvailabilityFilter] =
    useState<AvailabilityFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Formulário Nova Categoria
  const [newCatName, setNewCatName] = useState("");
  const [newCatOrder, setNewCatOrder] = useState("");
  const [catFormMsg, setCatFormMsg] = useState<{
    type: "ok" | "error";
    text: string;
  } | null>(null);

  // Formulário Novo Item
  const [newItemCatId, setNewItemCatId] = useState<string>(
    initialCategories[0]?.id ?? "",
  );
  const [newItemName, setNewItemName] = useState("");
  const [newItemDesc, setNewItemDesc] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newItemAvailable, setNewItemAvailable] = useState(true);
  const [itemFormMsg, setItemFormMsg] = useState<{
    type: "ok" | "error";
    text: string;
  } | null>(null);

  const effectiveNewItemCatId = categories.some((c) => c.id === newItemCatId)
    ? newItemCatId
    : (categories[0]?.id ?? "");

  const stats = useMemo(() => {
    const available = items.filter((i) => i.is_available).length;
    const soldout = items.length - available;
    return {
      categories: categories.length,
      total: items.length,
      available,
      soldout,
    };
  }, [categories.length, items]);

  const filteredItemsByCategory = useMemo(() => {
    const q = search.trim().toLowerCase();
    const map = new Map<string, MenuItem[]>();
    for (const item of items) {
      if (availabilityFilter === "available" && !item.is_available) continue;
      if (availabilityFilter === "soldout" && item.is_available) continue;
      if (q) {
        const matchName = item.name.toLowerCase().includes(q);
        const matchDesc = (item.description ?? "").toLowerCase().includes(q);
        if (!matchName && !matchDesc) continue;
      }
      if (!map.has(item.category_id)) map.set(item.category_id, []);
      map.get(item.category_id)!.push(item);
    }
    return map;
  }, [items, availabilityFilter, search]);

  const visibleCategories = useMemo(() => {
    const base =
      categoryFilter === "all"
        ? categories
        : categories.filter((c) => c.id === categoryFilter);
    if (!search.trim() && availabilityFilter === "all") return base;
    return base.filter(
      (c) => (filteredItemsByCategory.get(c.id)?.length ?? 0) > 0,
    );
  }, [
    categories,
    categoryFilter,
    search,
    availabilityFilter,
    filteredItemsByCategory,
  ]);

  function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault();
    setCatFormMsg(null);
    startTransition(async () => {
      const res = await createCategory({
        name: newCatName,
        sortOrder: newCatOrder,
      });
      if (!res.ok || !res.data) {
        setCatFormMsg({
          type: "error",
          text: res.error ?? "Erro ao criar categoria.",
        });
        return;
      }
      const created = res.data;
      setCategories((prev) => sortCategories([...prev, created]));
      if (!effectiveNewItemCatId) setNewItemCatId(created.id);
      setNewCatName("");
      setNewCatOrder("");
      setCatFormMsg({
        type: "ok",
        text: `Categoria "${created.name}" criada.`,
      });
      router.refresh();
    });
  }

  function handleCreateItem(e: React.FormEvent) {
    e.preventDefault();
    setItemFormMsg(null);
    startTransition(async () => {
      const res = await createMenuItem({
        categoryId: effectiveNewItemCatId,
        name: newItemName,
        description: newItemDesc,
        priceRaw: newItemPrice,
        isAvailable: newItemAvailable,
      });
      if (!res.ok || !res.data) {
        setItemFormMsg({
          type: "error",
          text: res.error ?? "Erro ao criar item.",
        });
        return;
      }
      const created = res.data;
      setItems((prev) => sortItems([...prev, created]));
      setNewItemName("");
      setNewItemDesc("");
      setNewItemPrice("");
      setNewItemAvailable(true);
      setItemFormMsg({
        type: "ok",
        text: `Item "${created.name}" adicionado ao cardápio.`,
      });
      router.refresh();
    });
  }

  return (
    <div className="space-y-10">
      {/* KPIs */}
      <dl className="grid grid-cols-2 gap-4 border-y border-concrete py-5 sm:grid-cols-4">
        <div>
          <dt className="stamp">Categorias</dt>
          <dd className="font-display text-4xl text-neon-gold">
            {String(stats.categories).padStart(2, "0")}
          </dd>
        </div>
        <div>
          <dt className="stamp">Total de Itens</dt>
          <dd className="font-display text-4xl text-bone">
            {String(stats.total).padStart(2, "0")}
          </dd>
        </div>
        <div>
          <dt className="stamp text-emerald-300">Disponíveis</dt>
          <dd className="font-display text-4xl text-emerald-300">
            {String(stats.available).padStart(2, "0")}
          </dd>
        </div>
        <div>
          <dt className="stamp text-neon-red">Esgotados</dt>
          <dd className="font-display text-4xl text-neon-red">
            {String(stats.soldout).padStart(2, "0")}
          </dd>
        </div>
      </dl>

      <div className="grid gap-12 lg:grid-cols-[1fr_380px]">
        {/* ============ COLUNA ESQUERDA: FILTROS + CARDÁPIO ============ */}
        <div className="space-y-8">
          <div className="glass-vip border border-concrete p-4 sm:p-5">
            <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar drink, combo, dose, porção…"
                className="field !py-2.5 !text-sm"
              />
              <select
                aria-label="Filtrar por categoria"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="field bg-void/90 !py-2.5 !text-sm"
              >
                <option value="all" className="bg-ink">
                  Todas as categorias
                </option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id} className="bg-ink">
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {(
                [
                  { id: "all", label: `Todos (${stats.total})` },
                  { id: "available", label: `Disponíveis (${stats.available})` },
                  { id: "soldout", label: `Esgotados (${stats.soldout})` },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setAvailabilityFilter(tab.id)}
                  className={`border px-3 py-1.5 font-tech text-[0.65rem] uppercase tracking-[0.14em] transition-colors ${
                    availabilityFilter === tab.id
                      ? "border-gold-bright bg-gold-bright font-bold text-void"
                      : "border-concrete bg-void/75 text-bone/80 hover:border-neon-gold hover:text-gold-bright"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {categories.length === 0 ? (
            <div className="fence border border-concrete px-6 py-16 text-center">
              <p className="font-display text-4xl text-bone/80">
                Nenhuma categoria criada ainda
              </p>
              <p className="stamp mt-3 text-ash">
                Crie sua primeira categoria no formulário ao lado para começar a
                cadastrar itens.
              </p>
            </div>
          ) : visibleCategories.length === 0 ? (
            <div className="fence border border-concrete px-6 py-12 text-center">
              <p className="font-display text-3xl text-bone/75">
                Nenhum item encontrado com esses filtros
              </p>
            </div>
          ) : (
            <div className="space-y-10">
              {visibleCategories.map((cat) => (
                <CategoryBlock
                  key={cat.id}
                  category={cat}
                  items={filteredItemsByCategory.get(cat.id) ?? []}
                  allCategories={categories}
                  onCategoryUpdated={(updated) =>
                    setCategories((prev) =>
                      sortCategories(
                        prev.map((c) => (c.id === updated.id ? updated : c)),
                      ),
                    )
                  }
                  onCategoryDeleted={(catId) => {
                    setCategories((prev) => prev.filter((c) => c.id !== catId));
                    setItems((prev) =>
                      prev.filter((i) => i.category_id !== catId),
                    );
                  }}
                  onItemUpdated={(updated) =>
                    setItems((prev) =>
                      sortItems(
                        prev.map((i) => (i.id === updated.id ? updated : i)),
                      ),
                    )
                  }
                  onItemDeleted={(itemId) =>
                    setItems((prev) => prev.filter((i) => i.id !== itemId))
                  }
                />
              ))}
            </div>
          )}
        </div>

        {/* ============ COLUNA DIREITA: NOVO ITEM + NOVA CATEGORIA ============ */}
        <aside className="space-y-8 lg:sticky lg:top-24 lg:self-start">
          {/* Novo Item */}
          <div className="tape concrete border border-neon-gold/45 p-6">
            <h2 className="mb-5 font-display text-3xl">
              <span className="gold-vip">NOVO</span>{" "}
              <span className="text-bone">ITEM</span>
            </h2>

            {categories.length === 0 ? (
              <p className="stamp text-neon-orange">
                Crie ao menos 1 categoria abaixo antes de adicionar itens.
              </p>
            ) : (
              <form onSubmit={handleCreateItem} className="space-y-3.5">
                <div>
                  <label
                    htmlFor="new-item-cat"
                    className="stamp mb-1.5 block text-[0.65rem]"
                  >
                    Categoria *
                  </label>
                  <select
                    id="new-item-cat"
                    required
                    value={effectiveNewItemCatId}
                    onChange={(e) => setNewItemCatId(e.target.value)}
                    className="field bg-void/90"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id} className="bg-ink">
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="new-item-name"
                    className="stamp mb-1.5 block text-[0.65rem]"
                  >
                    Nome do Item *
                  </label>
                  <input
                    id="new-item-name"
                    required
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder="Ex.: Combo Absolut + 5 Red Bull"
                    className="field"
                  />
                </div>

                <div>
                  <label
                    htmlFor="new-item-price"
                    className="stamp mb-1.5 block text-[0.65rem]"
                  >
                    Preço (R$)
                  </label>
                  <input
                    id="new-item-price"
                    inputMode="decimal"
                    value={newItemPrice}
                    onChange={(e) => setNewItemPrice(e.target.value)}
                    placeholder="Ex.: 380,00 (vazio = Consultar)"
                    className="field"
                  />
                </div>

                <div>
                  <label
                    htmlFor="new-item-desc"
                    className="stamp mb-1.5 block text-[0.65rem]"
                  >
                    Descrição
                  </label>
                  <textarea
                    id="new-item-desc"
                    rows={2}
                    value={newItemDesc}
                    onChange={(e) => setNewItemDesc(e.target.value)}
                    placeholder="Ingredientes, dose, gelo de coco…"
                    className="field resize-y"
                  />
                </div>

                <label className="flex cursor-pointer items-center gap-2 font-tech text-xs uppercase tracking-wider text-bone">
                  <input
                    type="checkbox"
                    checked={newItemAvailable}
                    onChange={(e) => setNewItemAvailable(e.target.checked)}
                    className="h-4 w-4 accent-neon-gold"
                  />
                  <span>Disponível imediatamente</span>
                </label>

                {itemFormMsg && (
                  <p
                    role={itemFormMsg.type === "error" ? "alert" : "status"}
                    className={`border px-3 py-2 font-tech text-xs ${
                      itemFormMsg.type === "error"
                        ? "border-neon-red bg-neon-red/10 text-neon-red"
                        : "border-emerald-400/50 bg-emerald-500/10 text-emerald-300"
                    }`}
                  >
                    {itemFormMsg.text}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isPending}
                  className="btn-gold w-full !py-3 !text-sm"
                >
                  {isPending ? "Salvando…" : "Adicionar Item"}
                </button>
              </form>
            )}
          </div>

          {/* Nova Categoria */}
          <div className="concrete border border-concrete p-6">
            <h2 className="mb-5 font-display text-3xl">
              <span className="neon neon-orange">NOVA</span>{" "}
              <span className="text-bone">CATEGORIA</span>
            </h2>

            <form onSubmit={handleCreateCategory} className="space-y-3.5">
              <div>
                <label
                  htmlFor="new-cat-name"
                  className="stamp mb-1.5 block text-[0.65rem]"
                >
                  Nome da Categoria *
                </label>
                <input
                  id="new-cat-name"
                  required
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Ex.: Drinks Autorais, Combos, Porções"
                  className="field"
                />
              </div>

              <div>
                <label
                  htmlFor="new-cat-order"
                  className="stamp mb-1.5 block text-[0.65rem]"
                >
                  Ordem de Exibição (sort_order)
                </label>
                <input
                  id="new-cat-order"
                  type="number"
                  value={newCatOrder}
                  onChange={(e) => setNewCatOrder(e.target.value)}
                  placeholder="Automático se vazio"
                  className="field"
                />
              </div>

              {catFormMsg && (
                <p
                  role={catFormMsg.type === "error" ? "alert" : "status"}
                  className={`border px-3 py-2 font-tech text-xs ${
                    catFormMsg.type === "error"
                      ? "border-neon-red bg-neon-red/10 text-neon-red"
                      : "border-emerald-400/50 bg-emerald-500/10 text-emerald-300"
                  }`}
                >
                  {catFormMsg.text}
                </p>
              )}

              <button
                type="submit"
                disabled={isPending}
                className="btn-street neon-orange w-full !py-3 !text-sm"
              >
                {isPending ? "Salvando…" : "Criar Categoria"}
              </button>
            </form>
          </div>
        </aside>
      </div>
    </div>
  );
}
