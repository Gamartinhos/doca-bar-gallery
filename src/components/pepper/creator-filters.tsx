"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useId, useMemo, useState } from "react";

import type { PepperCreator, PepperTier } from "@/lib/pepper/types";

import { CreatorCard, TIER_LABEL } from "./creator-card";

/**
 * Filtro do casting.
 *
 * Roda inteiro no cliente de propósito: o casting da Pepper é uma lista
 * curta (dezenas, não milhares) que a página já carregou. Mandar cada
 * clique de chip pro servidor só adicionaria latência — aqui o recorte é
 * instantâneo e os cards animam a troca.
 */

const EASE = [0.22, 1, 0.36, 1] as const;

const TIER_ORDER: PepperTier[] = ["rising", "core", "headline"];

type SortKey = "alcance" | "engajamento" | "recente";

const SORT_LABEL: Record<SortKey, string> = {
  alcance: "Maior alcance",
  engajamento: "Maior engajamento",
  recente: "Entrou por último",
};

/** Acima disso a lista de tags vira uma parede de chips — colapsa. */
const TAG_LIMIT = 12;

/** Tira acento e caixa: quem digita "sao paulo" acha "São Paulo". */
function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function reachOf(creator: PepperCreator): number {
  return creator.followers_instagram + creator.followers_tiktok;
}

function createdAt(creator: PepperCreator): number {
  const ms = Date.parse(creator.created_at);
  return Number.isNaN(ms) ? 0 : ms;
}

/** 7 → "07": contador com cara de painel, não de resultado de busca. */
function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
}

export function CreatorFilters({ creators }: { creators: PepperCreator[] }) {
  const reduce = useReducedMotion();
  const searchId = useId();
  const sortId = useId();
  const tierLabelId = useId();
  const tagLabelId = useId();

  const [query, setQuery] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tiers, setTiers] = useState<PepperTier[]>([]);
  const [sort, setSort] = useState<SortKey>("alcance");
  const [allTagsOpen, setAllTagsOpen] = useState(false);

  // Uma string normalizada por creator, montada uma vez: a busca a cada
  // tecla vira `includes` em texto pronto em vez de remontar tudo.
  const haystacks = useMemo(() => {
    const map = new Map<string, string>();
    for (const creator of creators) {
      map.set(
        creator.id,
        normalize(
          [
            creator.name,
            creator.handle ? `@${creator.handle}` : "",
            creator.tiktok_handle ? `@${creator.tiktok_handle}` : "",
            creator.city ?? "",
            ...creator.tags,
          ].join(" "),
        ),
      );
    }
    return map;
  }, [creators]);

  // Tags reais do casting, das mais recorrentes para as mais raras.
  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const creator of creators) {
      for (const tag of creator.tags) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, "pt-BR"));
  }, [creators]);

  const tierCounts = useMemo(() => {
    const counts: Record<PepperTier, number> = {
      rising: 0,
      core: 0,
      headline: 0,
    };
    for (const creator of creators) counts[creator.tier] += 1;
    return counts;
  }, [creators]);

  const visible = useMemo(() => {
    const terms = normalize(query).split(/\s+/).filter(Boolean);

    // Chip marcado soma opções em vez de estreitar: quem marca "trap" e
    // "dancehall" quer os dois times na tela, não a interseção (que num
    // casting desse tamanho quase sempre é vazia).
    const filtered = creators.filter((creator) => {
      if (tiers.length > 0 && !tiers.includes(creator.tier)) return false;
      if (tags.length > 0 && !creator.tags.some((tag) => tags.includes(tag))) {
        return false;
      }
      if (terms.length === 0) return true;
      const hay = haystacks.get(creator.id) ?? "";
      return terms.every((term) => hay.includes(term));
    });

    return filtered.sort((a, b) => {
      const primary =
        sort === "engajamento"
          ? b.engagement_rate - a.engagement_rate
          : sort === "recente"
            ? createdAt(b) - createdAt(a)
            : reachOf(b) - reachOf(a);
      if (primary !== 0) return primary;
      // Empate cai na ordem curada do casting — nunca em ordem aleatória.
      return (
        a.sort_order - b.sort_order || a.name.localeCompare(b.name, "pt-BR")
      );
    });
  }, [creators, query, tags, tiers, sort, haystacks]);

  const hasFilters =
    query.trim() !== "" || tags.length > 0 || tiers.length > 0;

  // Tag marcada que ficou fora do corte continua visível — senão o filtro
  // ativo some da tela e o usuário não entende o recorte.
  const shownTags =
    allTagsOpen || tagCounts.length <= TAG_LIMIT
      ? tagCounts
      : tagCounts.filter(
          (entry, index) => index < TAG_LIMIT || tags.includes(entry.tag),
        );

  function clearAll() {
    setQuery("");
    setTags([]);
    setTiers([]);
  }

  const gridClass = "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3";

  return (
    <section aria-label="Casting de creators">
      <div className="pp-glass-lit rounded-2xl p-4 sm:p-5 lg:sticky lg:top-[4.75rem] lg:z-40">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label htmlFor={searchId} className="pp-label mb-2 block">
              Buscar no casting
            </label>
            <div className="relative">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--pp-faint)]"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.6-3.6" />
              </svg>
              <input
                id={searchId}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="nome, @handle, cidade ou tag"
                autoComplete="off"
                spellCheck={false}
                className="pp-field pl-11 pr-12 [&::-webkit-search-cancel-button]:hidden"
              />
              {query !== "" && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Limpar busca"
                  className="absolute right-3 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full border border-[var(--pp-glass-brd)] text-[var(--pp-mute)] transition-colors duration-150 hover:border-[var(--pp-pepper)] hover:text-[var(--pp-chalk)]"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    className="h-3.5 w-3.5"
                  >
                    <path d="M6 6l12 12M18 6 6 18" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          <div className="sm:w-60">
            <label htmlFor={sortId} className="pp-label mb-2 block">
              Ordenar por
            </label>
            <div className="relative">
              <select
                id={sortId}
                value={sort}
                onChange={(event) => setSort(event.target.value as SortKey)}
                className="pp-field cursor-pointer appearance-none pr-10"
              >
                {(Object.keys(SORT_LABEL) as SortKey[]).map((key) => (
                  <option
                    key={key}
                    value={key}
                    className="bg-[var(--pp-graphite)] text-[var(--pp-chalk)]"
                  >
                    {SORT_LABEL[key]}
                  </option>
                ))}
              </select>
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--pp-mute)]"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 border-t border-[var(--pp-glass-brd)] pt-4">
          <div
            role="group"
            aria-labelledby={tierLabelId}
            className="flex flex-wrap items-center gap-2"
          >
            <span id={tierLabelId} className="pp-label mr-1">
              Faixa
            </span>
            {TIER_ORDER.map((tier) => (
              <button
                key={tier}
                type="button"
                aria-pressed={tiers.includes(tier)}
                onClick={() => setTiers((current) => toggle(current, tier))}
                className="pp-chip pp-chip-btn"
              >
                {TIER_LABEL[tier]}
                <span className="opacity-55">{pad2(tierCounts[tier])}</span>
              </button>
            ))}
          </div>

          {tagCounts.length > 0 && (
            <div
              role="group"
              aria-labelledby={tagLabelId}
              className="flex flex-wrap items-center gap-2"
            >
              <span id={tagLabelId} className="pp-label mr-1">
                Tags
              </span>
              {shownTags.map(({ tag, count }) => (
                <button
                  key={tag}
                  type="button"
                  aria-pressed={tags.includes(tag)}
                  onClick={() => setTags((current) => toggle(current, tag))}
                  className="pp-chip pp-chip-btn"
                >
                  {tag}
                  <span className="opacity-55">{pad2(count)}</span>
                </button>
              ))}
              {tagCounts.length > TAG_LIMIT && (
                <button
                  type="button"
                  onClick={() => setAllTagsOpen((open) => !open)}
                  aria-expanded={allTagsOpen}
                  className="pp-label pp-label-hot underline decoration-dotted underline-offset-4 transition-opacity duration-150 hover:opacity-70"
                >
                  {allTagsOpen
                    ? "ver menos"
                    : `+ ${tagCounts.length - TAG_LIMIT} tags`}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--pp-glass-brd)] pt-4">
          <p
            role="status"
            aria-live="polite"
            className="pp-label flex items-center gap-2.5"
          >
            <span className="pp-live-dot" aria-hidden="true" />
            <span>
              <span className="pp-label-hot font-bold">
                {pad2(visible.length)}
              </span>{" "}
              de {pad2(creators.length)} creators
            </span>
          </p>

          {hasFilters && (
            <button
              type="button"
              onClick={clearAll}
              className="pp-chip pp-chip-btn"
            >
              limpar filtros
            </button>
          )}
        </div>
      </div>

      <div className="mt-8">
        {visible.length === 0 ? (
          <div className="pp-panel relative overflow-hidden rounded-2xl px-6 py-16 text-center">
            {/* Centraliza por margem, não por `-translate-x-1/2`: o keyframe
                da brasa anima `transform` e apagaria a translação. */}
            <span
              aria-hidden="true"
              className="pp-heat left-1/2 top-0 -ml-24 h-48 w-48 opacity-45"
            />
            <p
              aria-hidden="true"
              className="pp-outline pp-drift font-[family-name:var(--pp-font-display)] text-[clamp(3.5rem,14vw,7rem)] font-black uppercase leading-none tracking-[-0.05em]"
            >
              00
            </p>
            <h3 className="mt-5 text-2xl text-[var(--pp-chalk)] sm:text-3xl">
              Ninguém nessa vibe
            </h3>
            <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-[var(--pp-mute)]">
              Nenhum creator do casting bate com esse recorte. Afrouxa o filtro
              — ou fala com a gente que a gente monta o time sob medida pra sua
              campanha.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <button type="button" onClick={clearAll} className="pp-btn">
                Limpar filtros
              </button>
              <Link href="/pepper/orcamento" className="pp-btn-ghost">
                Casting sob medida
              </Link>
            </div>
          </div>
        ) : reduce ? (
          <div className={gridClass}>
            {visible.map((creator, index) => (
              <CreatorCard
                key={creator.id}
                creator={creator}
                priority={index < 3}
              />
            ))}
          </div>
        ) : (
          <motion.div layout className={gridClass}>
            {/* `popLayout` tira quem sai do fluxo na hora, então os cards que
                ficam deslizam pro lugar novo em vez de pularem. */}
            <AnimatePresence mode="popLayout" initial={false}>
              {visible.map((creator, index) => (
                <motion.div
                  key={creator.id}
                  layout
                  initial={{ opacity: 0, y: 18, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.94 }}
                  transition={{ duration: 0.3, ease: EASE }}
                >
                  <CreatorCard creator={creator} priority={index < 3} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </section>
  );
}
