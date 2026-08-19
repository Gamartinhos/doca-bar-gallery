"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useReducedMotion } from "motion/react";

import { solicitarOrcamento } from "@/app/pepper/orcamento/actions";
import { brl, compactNumber } from "@/lib/pepper/format";
import {
  EXCLUSIVITY_FACTOR,
  URGENCY_HINT,
  URGENCY_LABEL,
  USAGE_HINT,
  USAGE_LABEL,
  estimateQuote,
} from "@/lib/pepper/pricing";
import type {
  PepperCreator,
  PepperQuoteBreakdown,
  PepperQuotePayload,
  PepperService,
  PepperUrgency,
  PepperUsage,
} from "@/lib/pepper/types";

import { CreatorAvatar } from "./creator-avatar";
import { TIER_LABEL } from "./creator-card";
import { Reveal, RevealGroup, RevealItem } from "./reveal";

/**
 * Configurador público de orçamento da Pepper.
 *
 * Quatro passos e um painel de preço que reage a cada clique. O cálculo é
 * o `estimateQuote` de `@/lib/pepper/pricing` — a mesma função pura que a
 * Server Action roda de novo no servidor antes de gravar. Aqui ele existe
 * só pra dar resposta imediata: o número da tela nunca vai pro banco.
 */

const STEPS = [
  { id: "servicos", index: "01", label: "Serviços" },
  { id: "casting", index: "02", label: "Casting" },
  { id: "condicoes", index: "03", label: "Condições" },
  { id: "contato", index: "04", label: "Contato" },
] as const;

const URGENCIES: PepperUrgency[] = ["flex", "padrao", "expresso"];
const USAGES: PepperUsage[] = ["organico", "paid30", "paid90"];

/** Teto por serviço — acima disso vira contrato, não orçamento automático. */
const MAX_QTY = 12;

/** Busca de casting só aparece quando a grade fica grande demais pra varrer. */
const SEARCH_THRESHOLD = 6;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

const FORM_ID = "pp-orcamento-form";

type ContactErrors = {
  contactName?: string;
  email?: string;
  whatsapp?: string;
};

/**
 * Interpola o número exibido até o valor novo.
 *
 * O `CountUp` das primitivas só anima uma vez, quando entra em cena — aqui
 * o valor muda a cada clique e a transição precisa acontecer sempre. Guarda
 * a posição atual num ref pra que uma troca no meio do caminho continue de
 * onde estava em vez de saltar pro início.
 */
function useTweenedNumber(value: number, duration = 420): number {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(value);
  const currentRef = useRef(value);

  useEffect(() => {
    if (reduce || currentRef.current === value) {
      currentRef.current = value;
      setShown(value);
      return;
    }

    const from = currentRef.current;
    const start = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = from + (value - from) * eased;
      currentRef.current = t < 1 ? next : value;
      setShown(next);
      if (t < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration, reduce]);

  return shown;
}

function MoneyRange({
  min,
  max,
  className = "",
}: {
  min: number;
  max: number;
  className?: string;
}) {
  const tweenMin = useTweenedNumber(min);
  const tweenMax = useTweenedNumber(max);

  return (
    <span className={className} aria-hidden="true">
      {brl(tweenMin)}
      <span className="px-1.5 text-[var(--pp-faint)]">–</span>
      {brl(tweenMax)}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Resumo                                                              */
/* ------------------------------------------------------------------ */

function LiveSummary({ breakdown }: { breakdown: PepperQuoteBreakdown }) {
  const hasLines = breakdown.lines.length > 0;

  return (
    <div className="pp-glass-lit sticky top-24 rounded-2xl p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="pp-label flex items-center gap-2">
          <span className="pp-live-dot" />
          Estimativa ao vivo
        </p>
        {breakdown.creatorCount > 0 && (
          <span className="pp-chip pp-chip-hot">
            {breakdown.creatorCount} no casting
          </span>
        )}
      </div>

      {hasLines ? (
        <>
          <ul className="mt-5 space-y-2.5">
            {breakdown.lines.map((line) => (
              <li key={line.label} className="flex items-baseline gap-3">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-[var(--pp-chalk)]">
                    {line.label}
                  </span>
                  <span className="pp-label text-[0.6rem]">{line.detail}</span>
                </span>
                <span className="shrink-0 font-[family-name:var(--pp-font-mono)] text-sm text-[var(--pp-mute)]">
                  {brl(line.amount)}
                </span>
              </li>
            ))}
          </ul>

          {breakdown.modifiers.length > 0 && (
            <ul className="mt-4 space-y-2 border-t border-[var(--pp-glass-brd)] pt-4">
              {breakdown.modifiers.map((mod) => (
                <li key={mod.label} className="flex items-baseline gap-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-[var(--pp-mute)]">
                      {mod.label}
                    </span>
                    <span className="pp-label pp-label-hot text-[0.6rem]">
                      {mod.detail}
                    </span>
                  </span>
                  <span className="shrink-0 font-[family-name:var(--pp-font-mono)] text-sm text-[var(--pp-mute)]">
                    {mod.amount === 0 ? "incluso" : `+ ${brl(mod.amount)}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <p className="mt-5 text-sm leading-relaxed text-[var(--pp-mute)]">
          Marca um serviço no passo 01 e o preço aparece aqui, atualizando a
          cada escolha.
        </p>
      )}

      <div className="mt-5 border-t border-[var(--pp-glass-brd)] pt-5">
        <p className="pp-label mb-2">Faixa estimada</p>
        <MoneyRange
          min={breakdown.min}
          max={breakdown.max}
          className="block font-[family-name:var(--pp-font-display)] text-[clamp(1.5rem,3.4vw,2.1rem)] font-black uppercase leading-none tracking-[-0.045em] text-[var(--pp-chalk)]"
        />
        {/* O contador anima 60×/s; o leitor de tela recebe só o valor final. */}
        <span role="status" aria-live="polite" className="sr-only">
          {breakdown.min > 0
            ? `Estimativa entre ${brl(breakdown.min)} e ${brl(breakdown.max)}.`
            : "Nenhum serviço selecionado ainda."}
        </span>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-[var(--pp-glass-brd)] pt-5">
        <div>
          <dt className="pp-label text-[0.58rem]">Prazo</dt>
          <dd className="font-[family-name:var(--pp-font-display)] text-xl font-black leading-none text-[var(--pp-chalk)]">
            {breakdown.leadDays > 0 ? `${breakdown.leadDays} dias` : "—"}
          </dd>
        </div>
        <div>
          <dt className="pp-label text-[0.58rem]">Alcance somado</dt>
          <dd className="font-[family-name:var(--pp-font-display)] text-xl font-black leading-none text-[var(--pp-ember)]">
            {breakdown.reach > 0 ? compactNumber(breakdown.reach) : "—"}
          </dd>
        </div>
      </dl>

      <p className="mt-5 border-t border-[var(--pp-glass-brd)] pt-4 text-xs leading-relaxed text-[var(--pp-faint)]">
        Estimativa automática, não é proposta fechada. O valor final sai depois
        que a gente lê o briefing e confirma a agenda do casting.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Configurador                                                        */
/* ------------------------------------------------------------------ */

export function QuoteConfigurator({
  services,
  creators,
  preselectedCreatorId = null,
}: {
  services: PepperService[];
  creators: PepperCreator[];
  preselectedCreatorId?: string | null;
}) {
  const [step, setStep] = useState(0);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [creatorIds, setCreatorIds] = useState<string[]>(
    preselectedCreatorId ? [preselectedCreatorId] : [],
  );
  const [urgency, setUrgency] = useState<PepperUrgency>("padrao");
  const [usage, setUsage] = useState<PepperUsage>("organico");
  const [exclusivity, setExclusivity] = useState(false);
  const [search, setSearch] = useState("");

  const [contactName, setContactName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [briefing, setBriefing] = useState("");

  const [errors, setErrors] = useState<ContactErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState<{
    id: string;
    min: number;
    max: number;
  } | null>(null);

  const [pending, startTransition] = useTransition();
  const reduce = useReducedMotion();
  const stepsRef = useRef<HTMLDivElement>(null);
  const firstRenderRef = useRef(true);

  const payload: PepperQuotePayload = useMemo(
    () => ({ services: quantities, creatorIds, urgency, usage, exclusivity }),
    [quantities, creatorIds, urgency, usage, exclusivity],
  );

  const breakdown = useMemo(
    () => estimateQuote(payload, services, creators),
    [payload, services, creators],
  );

  const selectedServiceCount = Object.keys(quantities).filter(
    (slug) => (quantities[slug] ?? 0) > 0,
  ).length;

  const visibleCreators = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return creators;
    return creators.filter((creator) =>
      [creator.name, creator.handle, creator.city, ...creator.tags]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(term)),
    );
  }, [creators, search]);

  // Trocar de passo tem que levar a leitura pro topo da coluna — no mobile o
  // passo novo começaria no meio da tela, parecendo que nada aconteceu.
  useEffect(() => {
    if (firstRenderRef.current) {
      firstRenderRef.current = false;
      return;
    }
    stepsRef.current?.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      block: "start",
    });
  }, [step, reduce]);

  function setQuantity(slug: string, value: number) {
    const qty = Math.max(0, Math.min(MAX_QTY, value));
    setQuantities((prev) => {
      const next = { ...prev };
      if (qty === 0) delete next[slug];
      else next[slug] = qty;
      return next;
    });
  }

  function toggleService(slug: string) {
    setQuantity(slug, (quantities[slug] ?? 0) > 0 ? 0 : 1);
  }

  function toggleCreator(id: string) {
    setCreatorIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  function validate(): boolean {
    const next: ContactErrors = {};

    if (contactName.trim().length < 2) {
      next.contactName = "Escreve seu nome pra gente saber com quem falar.";
    }
    if (!EMAIL_RE.test(email.trim())) {
      next.email = "Confere o e-mail — é por ele que a proposta chega.";
    }
    const digits = whatsapp.replace(/\D/g, "");
    if (digits && (digits.length < 10 || digits.length > 13)) {
      next.whatsapp = "WhatsApp com DDD, por favor.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (selectedServiceCount === 0) {
      setFormError("Volta no passo 01 e escolhe pelo menos um serviço.");
      setStep(0);
      return;
    }
    if (!validate()) return;

    startTransition(async () => {
      const result = await solicitarOrcamento({
        contactName: contactName.trim(),
        company: company.trim(),
        email: email.trim(),
        whatsapp,
        briefing: briefing.trim(),
        payload,
      });

      if (result.error || !result.success || !result.id) {
        setFormError(result.error ?? "Não deu pra enviar. Tenta de novo.");
        return;
      }

      setSent({ id: result.id, min: result.min ?? 0, max: result.max ?? 0 });
    });
  }

  function reset() {
    setSent(null);
    setStep(0);
    setQuantities({});
    setCreatorIds(preselectedCreatorId ? [preselectedCreatorId] : []);
    setUrgency("padrao");
    setUsage("organico");
    setExclusivity(false);
    setSearch("");
    setContactName("");
    setCompany("");
    setEmail("");
    setWhatsapp("");
    setBriefing("");
    setErrors({});
    setFormError(null);
  }

  /* ---- tela de sucesso -------------------------------------------- */

  if (sent) {
    return (
      <Reveal className="mx-auto max-w-2xl">
        <div className="pp-glass-lit relative overflow-hidden rounded-3xl p-8 text-center sm:p-12">
          <span
            aria-hidden="true"
            className="pp-heat -top-24 left-1/2 h-56 w-56 -translate-x-1/2"
          />
          <p className="pp-label pp-label-hot relative">Pedido registrado</p>
          <h2 className="relative mt-4 text-[clamp(2rem,5vw,3.25rem)]">
            <span className="pp-hot-text">Tá na mesa</span>
          </h2>
          <p className="relative mx-auto mt-5 max-w-md text-[var(--pp-mute)]">
            Nosso time olha o briefing, confirma a agenda do casting e volta com
            a proposta fechada em até 1 dia útil.
          </p>

          <dl className="relative mx-auto mt-8 grid max-w-md gap-px overflow-hidden rounded-2xl border border-[var(--pp-glass-brd)] bg-[var(--pp-glass-brd)] sm:grid-cols-2">
            <div className="bg-[var(--pp-graphite)] px-5 py-4">
              <dt className="pp-label text-[0.58rem]">Protocolo</dt>
              <dd className="mt-1 font-[family-name:var(--pp-font-mono)] text-lg text-[var(--pp-chalk)]">
                #{sent.id.slice(0, 8).toUpperCase()}
              </dd>
            </div>
            <div className="bg-[var(--pp-graphite)] px-5 py-4">
              <dt className="pp-label text-[0.58rem]">Faixa enviada</dt>
              <dd className="mt-1 font-[family-name:var(--pp-font-display)] text-lg font-black leading-tight text-[var(--pp-ember)]">
                {brl(sent.min)} – {brl(sent.max)}
              </dd>
            </div>
          </dl>

          <div className="relative mt-8 flex flex-wrap justify-center gap-3">
            <button type="button" onClick={reset} className="pp-btn-ghost">
              Fazer outro orçamento
            </button>
          </div>
        </div>
      </Reveal>
    );
  }

  /* ---- passos ------------------------------------------------------ */

  const isLastStep = step === STEPS.length - 1;
  const stepDone = [
    selectedServiceCount > 0,
    creatorIds.length > 0,
    true,
    contactName.trim().length > 1 && EMAIL_RE.test(email.trim()),
  ];

  return (
    <div className="grid gap-10 pb-32 lg:grid-cols-12 lg:gap-12 lg:pb-0">
      <div ref={stepsRef} className="scroll-mt-28 lg:col-span-7">
        {/* Progresso */}
        <nav aria-label="Etapas do orçamento" className="mb-10">
          <ol className="grid grid-cols-4 gap-2 sm:gap-3">
            {STEPS.map((item, index) => {
              const active = index === step;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setStep(index)}
                    aria-current={active ? "step" : undefined}
                    className="group w-full text-left"
                  >
                    <span
                      aria-hidden="true"
                      className={`block h-[3px] w-full rounded-full transition-colors duration-300 ${
                        index <= step
                          ? "bg-gradient-to-r from-[var(--pp-amber)] to-[var(--pp-pepper)]"
                          : "bg-[var(--pp-steel)] group-hover:bg-[var(--pp-fog)]"
                      }`}
                    />
                    <span
                      className={`pp-label mt-2.5 block text-[0.58rem] transition-colors duration-150 ${
                        active ? "pp-label-hot" : ""
                      }`}
                    >
                      {item.index}
                      {stepDone[index] && index !== step && (
                        <span className="ml-1 text-[var(--pp-ember)]">✓</span>
                      )}
                    </span>
                    <span
                      className={`mt-0.5 block truncate font-[family-name:var(--pp-font-display)] text-sm font-black uppercase leading-tight tracking-[-0.02em] transition-colors duration-150 sm:text-base ${
                        active
                          ? "text-[var(--pp-chalk)]"
                          : "text-[var(--pp-faint)] group-hover:text-[var(--pp-mute)]"
                      }`}
                    >
                      {item.label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        {/* ---------------- Passo 01 · Serviços ---------------- */}
        {step === 0 && (
          <section aria-labelledby="pp-passo-servicos">
            <h2
              id="pp-passo-servicos"
              className="text-[clamp(1.75rem,4vw,2.5rem)]"
            >
              O que você <span className="pp-hot-text">precisa</span>
            </h2>
            <p className="mt-3 text-[var(--pp-mute)]">
              Escolhe os formatos e a quantidade. Dá pra misturar quantos
              quiser — o preço se ajusta na hora.
            </p>

            <RevealGroup className="mt-8 grid gap-3 sm:grid-cols-2">
              {services.map((service) => {
                const qty = quantities[service.slug] ?? 0;
                const selected = qty > 0;

                return (
                  <RevealItem key={service.id} className="h-full">
                    <div
                      className={`pp-panel flex h-full flex-col overflow-hidden rounded-2xl transition-colors duration-200 ${
                        selected
                          ? "border-[var(--pp-pepper)] bg-[color-mix(in_oklab,var(--pp-pepper)_9%,transparent)]"
                          : "hover:border-[var(--pp-fog)]"
                      }`}
                    >
                      <button
                        type="button"
                        aria-pressed={selected}
                        onClick={() => toggleService(service.slug)}
                        className="flex flex-1 cursor-pointer items-start gap-3.5 p-4 text-left"
                      >
                        <span
                          aria-hidden="true"
                          className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-lg transition-colors duration-200 ${
                            selected
                              ? "bg-gradient-to-br from-[var(--pp-flame)] to-[var(--pp-crimson)] text-white"
                              : "bg-[var(--pp-steel)] text-[var(--pp-mute)]"
                          }`}
                        >
                          {service.icon}
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="flex items-start justify-between gap-2">
                            <span className="font-[family-name:var(--pp-font-display)] text-lg font-black uppercase leading-none tracking-[-0.03em] text-[var(--pp-chalk)]">
                              {service.name}
                            </span>
                            <span
                              aria-hidden="true"
                              className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[0.6rem] transition-colors duration-200 ${
                                selected
                                  ? "border-[var(--pp-pepper)] bg-[var(--pp-pepper)] text-white"
                                  : "border-[var(--pp-fog)] text-transparent"
                              }`}
                            >
                              ✓
                            </span>
                          </span>

                          {service.description && (
                            <span className="mt-2 block text-sm leading-snug text-[var(--pp-mute)]">
                              {service.description}
                            </span>
                          )}

                          <span className="pp-label mt-3 block text-[0.6rem]">
                            {brl(service.base_price)} / {service.unit} ·{" "}
                            {service.lead_days} dias
                          </span>
                        </span>
                      </button>

                      {selected && (
                        <div className="border-t border-[var(--pp-steel)] px-4 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-1 rounded-full border border-[var(--pp-fog)] p-1">
                              <button
                                type="button"
                                onClick={() =>
                                  setQuantity(service.slug, qty - 1)
                                }
                                aria-label={`Diminuir quantidade de ${service.name}`}
                                className="grid h-7 w-7 cursor-pointer place-items-center rounded-full text-[var(--pp-chalk)] transition-colors duration-150 hover:bg-[var(--pp-steel)]"
                              >
                                −
                              </button>
                              <span
                                aria-hidden="true"
                                className="w-7 text-center font-[family-name:var(--pp-font-display)] text-base font-black text-[var(--pp-chalk)]"
                              >
                                {qty}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setQuantity(service.slug, qty + 1)
                                }
                                disabled={qty >= MAX_QTY}
                                aria-label={`Aumentar quantidade de ${service.name}`}
                                className="grid h-7 w-7 cursor-pointer place-items-center rounded-full text-[var(--pp-chalk)] transition-colors duration-150 hover:bg-[var(--pp-steel)] disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                +
                              </button>
                            </div>
                            <span className="pp-label text-[0.6rem]">
                              {qty}× {service.unit}
                            </span>
                          </div>

                          <input
                            type="range"
                            className="pp-range mt-3"
                            min={0}
                            max={MAX_QTY}
                            step={1}
                            value={qty}
                            onChange={(event) =>
                              setQuantity(
                                service.slug,
                                Number(event.target.value),
                              )
                            }
                            aria-label={`Quantidade de ${service.name} em ${service.unit}`}
                          />
                        </div>
                      )}
                    </div>
                  </RevealItem>
                );
              })}
            </RevealGroup>
          </section>
        )}

        {/* ---------------- Passo 02 · Casting ---------------- */}
        {step === 1 && (
          <section aria-labelledby="pp-passo-casting">
            <h2
              id="pp-passo-casting"
              className="text-[clamp(1.75rem,4vw,2.5rem)]"
            >
              Quem entra <span className="pp-hot-text">na jogada</span>
            </h2>
            <p className="mt-3 text-[var(--pp-mute)]">
              Marque quantos creators quiser — a partir do segundo o casting
              entra com desconto. Sem escolher ninguém, a gente monta a lista e
              a estimativa roda em cima de um perfil médio.
            </p>

            {creators.length > SEARCH_THRESHOLD && (
              <div className="mt-6">
                <label htmlFor="pp-busca-casting" className="sr-only">
                  Buscar creator por nome, cidade ou nicho
                </label>
                <input
                  id="pp-busca-casting"
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar por nome, cidade ou nicho…"
                  className="pp-field"
                />
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-2">
              <span className="pp-chip pp-chip-hot">
                {creatorIds.length} selecionado
                {creatorIds.length === 1 ? "" : "s"}
              </span>
              {breakdown.reach > 0 && (
                <span className="pp-chip">
                  {compactNumber(breakdown.reach)} de alcance somado
                </span>
              )}
              {creatorIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCreatorIds([])}
                  className="pp-chip pp-chip-btn cursor-pointer"
                >
                  limpar
                </button>
              )}
            </div>

            <RevealGroup className="mt-5 grid gap-2.5 sm:grid-cols-2">
              {visibleCreators.map((creator) => {
                const selected = creatorIds.includes(creator.id);
                const reach =
                  creator.followers_instagram + creator.followers_tiktok;

                return (
                  <RevealItem key={creator.id} className="h-full">
                    <button
                      type="button"
                      aria-pressed={selected}
                      onClick={() => toggleCreator(creator.id)}
                      className={`pp-panel flex h-full w-full cursor-pointer items-center gap-3.5 rounded-2xl p-3.5 text-left transition-colors duration-200 ${
                        selected
                          ? "border-[var(--pp-pepper)] bg-[color-mix(in_oklab,var(--pp-pepper)_9%,transparent)]"
                          : "hover:border-[var(--pp-fog)]"
                      }`}
                    >
                      <CreatorAvatar
                        name={creator.name}
                        slug={creator.slug}
                        src={creator.avatar_url}
                        size={48}
                      />

                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-[family-name:var(--pp-font-display)] text-base font-black uppercase leading-none tracking-[-0.03em] text-[var(--pp-chalk)]">
                          {creator.name}
                        </span>
                        <span className="pp-label mt-1.5 block truncate text-[0.56rem]">
                          {TIER_LABEL[creator.tier]}
                          {creator.city ? ` · ${creator.city}` : ""}
                        </span>
                        <span className="mt-2 flex flex-wrap items-baseline gap-x-3 text-xs text-[var(--pp-mute)]">
                          <span>{compactNumber(reach)} alcance</span>
                          <span className="text-[var(--pp-ember)]">
                            {creator.engagement_rate
                              .toFixed(1)
                              .replace(".", ",")}
                            % engaj.
                          </span>
                        </span>
                      </span>

                      <span
                        aria-hidden="true"
                        className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[0.6rem] transition-colors duration-200 ${
                          selected
                            ? "border-[var(--pp-pepper)] bg-[var(--pp-pepper)] text-white"
                            : "border-[var(--pp-fog)] text-transparent"
                        }`}
                      >
                        ✓
                      </span>
                    </button>
                  </RevealItem>
                );
              })}
            </RevealGroup>

            {visibleCreators.length === 0 && (
              <p className="mt-6 text-sm text-[var(--pp-mute)]">
                Ninguém com esse nome no casting. Tenta outro termo — ou segue
                sem escolher que a gente sugere os perfis.
              </p>
            )}
          </section>
        )}

        {/* ---------------- Passo 03 · Condições ---------------- */}
        {step === 2 && (
          <section aria-labelledby="pp-passo-condicoes">
            <h2
              id="pp-passo-condicoes"
              className="text-[clamp(1.75rem,4vw,2.5rem)]"
            >
              Prazo e <span className="pp-hot-text">direitos</span>
            </h2>
            <p className="mt-3 text-[var(--pp-mute)]">
              É aqui que o orçamento sobe ou desce de verdade. Cada opção
              explica o que muda.
            </p>

            <fieldset className="mt-8">
              <legend className="pp-label mb-3">Prazo de entrega</legend>
              <div className="grid gap-2.5 sm:grid-cols-3">
                {URGENCIES.map((key) => (
                  <label key={key} className="block cursor-pointer">
                    <input
                      type="radio"
                      name="pp-urgencia"
                      value={key}
                      checked={urgency === key}
                      onChange={() => setUrgency(key)}
                      className="peer sr-only"
                    />
                    <span className="pp-panel block h-full rounded-2xl p-4 transition-colors duration-200 hover:border-[var(--pp-fog)] peer-checked:border-[var(--pp-pepper)] peer-checked:bg-[color-mix(in_oklab,var(--pp-pepper)_9%,transparent)] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--pp-ember)]">
                      <span className="block font-[family-name:var(--pp-font-display)] text-base font-black uppercase leading-none tracking-[-0.03em] text-[var(--pp-chalk)]">
                        {URGENCY_LABEL[key]}
                      </span>
                      <span className="mt-2 block text-xs leading-snug text-[var(--pp-mute)]">
                        {URGENCY_HINT[key]}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="mt-8">
              <legend className="pp-label mb-3">Direitos de uso</legend>
              <div className="grid gap-2.5 sm:grid-cols-3">
                {USAGES.map((key) => (
                  <label key={key} className="block cursor-pointer">
                    <input
                      type="radio"
                      name="pp-uso"
                      value={key}
                      checked={usage === key}
                      onChange={() => setUsage(key)}
                      className="peer sr-only"
                    />
                    <span className="pp-panel block h-full rounded-2xl p-4 transition-colors duration-200 hover:border-[var(--pp-fog)] peer-checked:border-[var(--pp-pepper)] peer-checked:bg-[color-mix(in_oklab,var(--pp-pepper)_9%,transparent)] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--pp-ember)]">
                      <span className="block font-[family-name:var(--pp-font-display)] text-base font-black uppercase leading-none tracking-[-0.03em] text-[var(--pp-chalk)]">
                        {USAGE_LABEL[key]}
                      </span>
                      <span className="mt-2 block text-xs leading-snug text-[var(--pp-mute)]">
                        {USAGE_HINT[key]}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="mt-8">
              <p className="pp-label mb-3">Exclusividade</p>
              <button
                type="button"
                aria-pressed={exclusivity}
                onClick={() => setExclusivity((value) => !value)}
                className={`pp-panel flex w-full cursor-pointer items-center gap-4 rounded-2xl p-4 text-left transition-colors duration-200 ${
                  exclusivity
                    ? "border-[var(--pp-pepper)] bg-[color-mix(in_oklab,var(--pp-pepper)_9%,transparent)]"
                    : "hover:border-[var(--pp-fog)]"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`relative block h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${
                    exclusivity
                      ? "bg-[var(--pp-pepper)]"
                      : "bg-[var(--pp-steel)]"
                  }`}
                >
                  <span
                    className={`absolute top-1 block h-4 w-4 rounded-full bg-[var(--pp-chalk)] transition-transform duration-200 ${
                      exclusivity ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block font-[family-name:var(--pp-font-display)] text-base font-black uppercase leading-none tracking-[-0.03em] text-[var(--pp-chalk)]">
                    Exclusividade de categoria
                  </span>
                  <span className="mt-2 block text-xs leading-snug text-[var(--pp-mute)]">
                    Por 30 dias o creator não fecha com nenhum concorrente
                    direto seu.
                  </span>
                </span>

                <span className="pp-chip pp-chip-hot shrink-0">
                  +{Math.round((EXCLUSIVITY_FACTOR - 1) * 100)}%
                </span>
              </button>
            </div>
          </section>
        )}

        {/* ---------------- Passo 04 · Contato ---------------- */}
        {step === 3 && (
          <section aria-labelledby="pp-passo-contato">
            <h2
              id="pp-passo-contato"
              className="text-[clamp(1.75rem,4vw,2.5rem)]"
            >
              Pra onde <span className="pp-hot-text">mandamos</span>
            </h2>
            <p className="mt-3 text-[var(--pp-mute)]">
              A estimativa vai junto com o pedido. Nosso time responde com a
              proposta fechada em até 1 dia útil.
            </p>

            <form
              id={FORM_ID}
              onSubmit={handleSubmit}
              noValidate
              className="mt-8 grid gap-5 sm:grid-cols-2"
            >
              <div>
                <label
                  htmlFor="pp-nome"
                  className="pp-label mb-2 block text-[0.6rem]"
                >
                  Seu nome *
                </label>
                <input
                  id="pp-nome"
                  name="contactName"
                  type="text"
                  autoComplete="name"
                  value={contactName}
                  onChange={(event) => setContactName(event.target.value)}
                  aria-invalid={errors.contactName ? true : undefined}
                  aria-describedby={
                    errors.contactName ? "pp-erro-nome" : undefined
                  }
                  className="pp-field"
                  placeholder="Como te chamam"
                />
                {errors.contactName && (
                  <p
                    id="pp-erro-nome"
                    role="alert"
                    className="mt-2 text-xs text-[var(--pp-pepper-soft)]"
                  >
                    {errors.contactName}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="pp-empresa"
                  className="pp-label mb-2 block text-[0.6rem]"
                >
                  Empresa / marca
                </label>
                <input
                  id="pp-empresa"
                  name="company"
                  type="text"
                  autoComplete="organization"
                  value={company}
                  onChange={(event) => setCompany(event.target.value)}
                  className="pp-field"
                  placeholder="Opcional"
                />
              </div>

              <div>
                <label
                  htmlFor="pp-email"
                  className="pp-label mb-2 block text-[0.6rem]"
                >
                  E-mail *
                </label>
                <input
                  id="pp-email"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  aria-invalid={errors.email ? true : undefined}
                  aria-describedby={errors.email ? "pp-erro-email" : undefined}
                  className="pp-field"
                  placeholder="voce@marca.com.br"
                />
                {errors.email && (
                  <p
                    id="pp-erro-email"
                    role="alert"
                    className="mt-2 text-xs text-[var(--pp-pepper-soft)]"
                  >
                    {errors.email}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="pp-whatsapp"
                  className="pp-label mb-2 block text-[0.6rem]"
                >
                  WhatsApp
                </label>
                <input
                  id="pp-whatsapp"
                  name="whatsapp"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={whatsapp}
                  onChange={(event) => setWhatsapp(event.target.value)}
                  aria-invalid={errors.whatsapp ? true : undefined}
                  aria-describedby={
                    errors.whatsapp ? "pp-erro-whatsapp" : undefined
                  }
                  className="pp-field"
                  placeholder="(11) 90000-0000"
                />
                {errors.whatsapp && (
                  <p
                    id="pp-erro-whatsapp"
                    role="alert"
                    className="mt-2 text-xs text-[var(--pp-pepper-soft)]"
                  >
                    {errors.whatsapp}
                  </p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="pp-briefing"
                  className="pp-label mb-2 block text-[0.6rem]"
                >
                  Briefing
                </label>
                <textarea
                  id="pp-briefing"
                  name="briefing"
                  rows={5}
                  value={briefing}
                  onChange={(event) => setBriefing(event.target.value)}
                  maxLength={4000}
                  className="pp-field resize-y"
                  placeholder="Conta o que a marca quer, a data, a cidade e o que não pode faltar."
                />
              </div>
            </form>

            {formError && (
              <p
                role="alert"
                className="pp-glass mt-5 rounded-xl px-4 py-3 text-sm text-[var(--pp-pepper-soft)]"
              >
                {formError}
              </p>
            )}
          </section>
        )}

        {/* Navegação entre passos (desktop e tablet) */}
        <div className="mt-10 hidden items-center justify-between gap-3 border-t border-[var(--pp-glass-brd)] pt-6 lg:flex">
          <button
            type="button"
            onClick={() => setStep((value) => Math.max(0, value - 1))}
            disabled={step === 0}
            className="pp-btn-ghost"
          >
            Voltar
          </button>

          {isLastStep ? (
            <button
              type="submit"
              form={FORM_ID}
              disabled={pending}
              className="pp-btn"
            >
              {pending ? "Enviando…" : "Enviar pedido"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() =>
                setStep((value) => Math.min(STEPS.length - 1, value + 1))
              }
              className="pp-btn"
            >
              Avançar
            </button>
          )}
        </div>
      </div>

      {/* Resumo pegajoso — desktop */}
      <aside
        aria-label="Resumo do orçamento"
        className="hidden lg:col-span-5 lg:block"
      >
        <LiveSummary breakdown={breakdown} />
      </aside>

      {/* Barra fixa — mobile e tablet */}
      <div className="pp-glass-lit fixed inset-x-0 bottom-0 z-[64] rounded-t-2xl px-4 py-3 lg:hidden">
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="pp-label text-[0.55rem]">
              Estimativa ·{" "}
              {breakdown.leadDays > 0 ? `${breakdown.leadDays} dias` : "prazo a definir"}
            </p>
            <MoneyRange
              min={breakdown.min}
              max={breakdown.max}
              className="mt-0.5 block truncate font-[family-name:var(--pp-font-display)] text-lg font-black uppercase leading-none tracking-[-0.04em] text-[var(--pp-chalk)]"
            />
          </div>

          {isLastStep ? (
            <button
              type="submit"
              form={FORM_ID}
              disabled={pending}
              className="pp-btn shrink-0 !px-5 !py-2.5 !text-[0.72rem]"
            >
              {pending ? "Enviando…" : "Enviar"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() =>
                setStep((value) => Math.min(STEPS.length - 1, value + 1))
              }
              className="pp-btn shrink-0 !px-5 !py-2.5 !text-[0.72rem]"
            >
              Avançar
            </button>
          )}
        </div>
      </div>

      {/* O mesmo resumo, em bloco, pra quem está no mobile e quer o detalhe */}
      <aside aria-label="Resumo do orçamento" className="lg:hidden">
        <LiveSummary breakdown={breakdown} />
      </aside>
    </div>
  );
}
