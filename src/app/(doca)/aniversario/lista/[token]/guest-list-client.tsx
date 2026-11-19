"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";

import type { BirthdayLeadStatus } from "@/lib/database.types";

import {
  addBulkGuestsAction,
  addGuestAction,
  removeGuestAction,
  type PublicGuestItem,
} from "./actions";

export interface PublicBirthdayList {
  id: string;
  full_name: string;
  event_label: string;
  guest_tier: string;
  status: BirthdayLeadStatus;
  extra_checked_in: number;
  guests: PublicGuestItem[];
}

const DOCA_WHATSAPP = "5511972723334";

const VIP_LADDER = [
  {
    key: "tier_1",
    min: 1,
    shortLabel: "1+ nome",
    reward: "VIP Base + 1 Drink",
    detail: "VIP Aniversariante + 1 Acompanhante VIP + 1 Drink da Casa",
  },
  {
    key: "tier_5",
    min: 5,
    shortLabel: "5+ nomes",
    reward: "+1 Drink (2 Drinks no total)",
    detail: "2 Drinks da Casa + 2 VIPs no total",
  },
  {
    key: "tier_10",
    min: 10,
    shortLabel: "10+ nomes",
    reward: "1 Garrafa (Vodka ou Gin)",
    detail: "Garrafa liberada na pista com 10 pagantes",
  },
  {
    key: "tier_15",
    min: 15,
    shortLabel: "15+ nomes",
    reward: "1 Combo Completo (Vodka ou Gin)",
    detail: "Combo completo na pista com 15 pagantes",
  },
  {
    key: "tier_20",
    min: 20,
    shortLabel: "20+ nomes",
    reward: "1 Camarote + 1 Combo (Nível Raul Máximo)",
    detail: "Sujeito à disponibilidade da casa",
  },
] as const;

const STATUS_DISPLAY: Record<
  BirthdayLeadStatus,
  { label: string; className: string }
> = {
  new: {
    label: "Cadastro recebido",
    className: "border-neon-orange/60 bg-neon-orange/15 text-neon-orange",
  },
  contacted: {
    label: "Em atendimento",
    className: "border-neon-gold/60 bg-neon-gold/15 text-neon-gold",
  },
  confirmed: {
    label: "Lista confirmada",
    className: "border-gold-bright/70 bg-gold-bright/20 text-gold-bright",
  },
  attended: {
    label: "Na casa · Rolando",
    className: "border-gold-bright bg-gold-bright text-void",
  },
  cancelled: {
    label: "Lista cancelada",
    className: "border-neon-red/70 bg-neon-red/15 text-neon-red",
  },
};

const GOAL_TIER_LABELS: Record<string, string> = {
  ate_5: "VIP Base (até 4 pagantes)",
  "5_10": "5 a 10 Pagantes",
  "10_15": "10 a 15 Pagantes",
  "15_20": "15 a 20 Pagantes",
  "20_mais": "20+ Raul Máximo",
};

export function GuestListClient({
  token,
  initialList,
}: {
  token: string;
  initialList: PublicBirthdayList;
}) {
  const router = useRouter();

  const [guests, setGuests] = useState<PublicGuestItem[]>(initialList.guests);

  const [mode, setMode] = useState<"single" | "bulk">("single");
  const [guestName, setGuestName] = useState("");
  const [documentHint, setDocumentHint] = useState("");
  const [bulkText, setBulkText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const totalGuests = guests.length;
  const checkedInCount = useMemo(
    () => guests.filter((g) => g.checked_in).length,
    [guests],
  );
  const presentCount = checkedInCount + Math.max(0, initialList.extra_checked_in);

  const nextStep = VIP_LADDER.find((tier) => totalGuests < tier.min) ?? null;
  const progressPct = Math.min(100, Math.round((totalGuests / 20) * 100));

  const detectedBulkLines = useMemo(() => {
    return bulkText
      .split(/\r?\n/)
      .map((line) =>
        line
          .replace(/^\s*(?:[-*•]+|\d+[.)\-])\s+/, "")
          .replace(/\s+/g, " ")
          .trim(),
      )
      .filter((line) => line.length >= 2).length;
  }, [bulkText]);

  const filteredGuests = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return guests;
    return guests.filter(
      (g) =>
        g.guest_name.toLowerCase().includes(q) ||
        (g.document_hint?.toLowerCase().includes(q) ?? false),
    );
  }, [guests, searchQuery]);

  const statusMeta = STATUS_DISPLAY[initialList.status] ?? STATUS_DISPLAY.new;
  const goalLabel =
    GOAL_TIER_LABELS[initialList.guest_tier] ?? initialList.guest_tier;

  function getShareUrl(): string {
    if (typeof window === "undefined") return `/aniversario/lista/${token}`;
    return `${window.location.origin}/aniversario/lista/${token}`;
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(getShareUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  function handleShareWhatsApp() {
    const url = getShareUrl();
    const message = [
      `🎉 *Bora pro meu aniversário na Doca Bar!*`,
      `Aniversariante: *${initialList.full_name}*`,
      `Evento: *${initialList.event_label}*`,
      "",
      `Lista VIP nominal: ${url}`,
    ].join("\n");
    window.open(
      `https://wa.me/?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  function handleSendToDocaWhatsApp() {
    const url = getShareUrl();
    const message = [
      `🎂 *LISTA NOMINAL ATUALIZADA — DOCA BAR*`,
      `*Aniversariante:* ${initialList.full_name}`,
      `*Evento:* ${initialList.event_label}`,
      `*Nomes na lista:* ${totalGuests}`,
      `*Link da lista:* ${url}`,
    ].join("\n");
    window.open(
      `https://wa.me/${DOCA_WHATSAPP}?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  async function handleAddSingle(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFeedback(null);

    const trimmed = guestName.trim();
    if (trimmed.length < 2) {
      setFeedback({
        type: "error",
        text: "Informe o nome completo do convidado (mínimo 2 letras).",
      });
      return;
    }

    setIsSubmitting(true);
    const res = await addGuestAction({
      token,
      guestName: trimmed,
      documentHint: documentHint.trim() || undefined,
    });
    setIsSubmitting(false);

    if (!res.ok || !res.guest) {
      setFeedback({
        type: "error",
        text: res.error ?? "Não foi possível adicionar o convidado.",
      });
      return;
    }

    setGuests((prev) => [...prev, res.guest!]);
    setGuestName("");
    setDocumentHint("");
    setFeedback({
      type: "success",
      text: `${res.guest.guest_name} adicionado(a) à lista VIP!`,
    });
    router.refresh();
  }

  async function handleAddBulk(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFeedback(null);

    if (detectedBulkLines === 0) {
      setFeedback({
        type: "error",
        text: "Cole pelo menos um nome válido (um nome por linha).",
      });
      return;
    }

    setIsSubmitting(true);
    const res = await addBulkGuestsAction({
      token,
      rawText: bulkText,
    });
    setIsSubmitting(false);

    if (!res.ok) {
      setFeedback({
        type: "error",
        text: res.error ?? "Não foi possível adicionar os nomes.",
      });
      return;
    }

    setGuests((prev) => [...prev, ...res.guests]);
    setBulkText("");
    setFeedback({
      type: "success",
      text: `${res.addedCount} ${res.addedCount === 1 ? "nome adicionado" : "nomes adicionados"} à lista!${
        res.skippedCount > 0
          ? ` (${res.skippedCount} linha(s) ignorada(s) por estarem inválidas).`
          : ""
      }`,
    });
    router.refresh();
  }

  async function handleRemoveGuest(guest: PublicGuestItem) {
    if (guest.checked_in) return;
    setFeedback(null);
    setRemovingId(guest.id);

    const res = await removeGuestAction({ token, guestId: guest.id });
    setRemovingId(null);

    if (!res.ok) {
      setFeedback({
        type: "error",
        text: res.error ?? "Não foi possível remover o convidado.",
      });
      return;
    }

    setGuests((prev) => prev.filter((item) => item.id !== guest.id));
    setFeedback({
      type: "success",
      text: `${guest.guest_name} removido(a) da lista.`,
    });
    router.refresh();
  }

  return (
    <div className="space-y-8">
      {/* ================= RESUMO DO ANIVERSARIANTE ================= */}
      <section className="glass-vip tape p-5 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-concrete pb-5">
          <div className="min-w-0">
            <p className="stamp text-neon-orange">Lista Nominal VIP · Portaria Doca</p>
            <h1 className="mt-2 font-display text-4xl leading-none text-bone sm:text-6xl">
              {initialList.full_name}
            </h1>
            <p className="mt-3 font-tech text-sm tracking-wide text-bone/90">
              Evento: <span className="text-gold-bright">{initialList.event_label}</span>
            </p>
            <p className="stamp mt-1 text-[0.65rem] text-ash">
              Meta declarada: {goalLabel}
            </p>
          </div>

          <div className="flex flex-col items-start gap-2 sm:items-end">
            <span
              className={`border px-3 py-1 font-tech text-xs font-bold uppercase tracking-[0.18em] ${statusMeta.className}`}
            >
              {statusMeta.label}
            </span>

            <div className="border border-neon-gold/40 bg-void/75 px-4 py-2.5 text-left sm:text-right">
              <p className="stamp text-[0.62rem] text-neon-gold">Total na lista</p>
              <p className="font-display text-4xl leading-none text-gold-bright">
                {totalGuests}{" "}
                <span className="font-tech text-xs uppercase tracking-widest text-ash">
                  {totalGuests === 1 ? "nome" : "nomes"}
                </span>
              </p>
              {presentCount > 0 && (
                <p className="mt-1 font-tech text-[0.7rem] font-bold uppercase text-neon-orange">
                  {presentCount} presente(s) na portaria
                </p>
              )}
            </div>
          </div>
        </div>

        {initialList.status === "cancelled" && (
          <div
            role="alert"
            className="mt-5 border border-neon-red bg-neon-red/12 px-4 py-3 font-tech text-sm text-neon-red"
          >
            Esta lista está marcada como cancelada no momento. Caso queira reativar,
            chame a equipe da Doca no WhatsApp.
          </div>
        )}

        {/* Compartilhamento */}
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleCopyLink}
            className="btn-gold w-full sm:w-auto"
          >
            {copied ? "Link copiado ✓" : "Copiar link da lista"}
          </button>
          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="btn-street neon-orange w-full sm:w-auto"
          >
            Compartilhar no WhatsApp →
          </button>
          <button
            type="button"
            onClick={handleSendToDocaWhatsApp}
            className="btn-ghost neon-gold w-full sm:w-auto"
          >
            Avisar a Doca no WhatsApp
          </button>
        </div>
      </section>

      {/* ================= BARRA DE PROGRESSO ESCADINHA VIP ================= */}
      <section className="glass-vip p-5 sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="stamp text-neon-gold">Escadinha VIP da Lista Nominal</p>
            <h2 className="mt-1.5 font-display text-3xl text-bone sm:text-4xl">
              {nextStep ? (
                <>
                  FALTAM{" "}
                  <span className="text-neon-orange">
                    {nextStep.min - totalGuests}
                  </span>{" "}
                  PARA {nextStep.reward.toUpperCase()}
                </>
              ) : (
                <span className="gold-vip">NÍVEL RAUL MÁXIMO ALCANÇADO (20+)</span>
              )}
            </h2>
          </div>

          <p className="font-tech text-xs uppercase tracking-widest text-gold-bright">
            {totalGuests} / 20+ nomes
          </p>
        </div>

        <div className="mt-4">
          <div className="h-3 w-full overflow-hidden border border-concrete bg-void">
            <div
              className="h-full bg-gradient-to-r from-neon-orange via-neon-gold to-gold-bright transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="mt-2 font-tech text-[0.7rem] text-ash">
            Os prêmios acendem ao vivo na portaria conforme a entrada dos seus convidados
            pagantes (+18 com documento original com foto). Envie os nomes até 18h no dia do rolê.
          </p>
        </div>

        <div className="mt-5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
          {VIP_LADDER.map((tier) => {
            const reached = totalGuests >= tier.min;
            return (
              <div
                key={tier.key}
                className={`border p-3 transition-colors ${
                  reached
                    ? "border-neon-gold/80 bg-gradient-to-br from-neon-orange/15 via-neon-gold/10 to-void shadow-[0_0_20px_-10px_rgba(245,208,97,0.6)]"
                    : "border-concrete bg-ink/80 opacity-65"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`font-tech text-[0.65rem] font-bold uppercase tracking-[0.18em] ${
                      reached ? "text-gold-bright" : "text-ash"
                    }`}
                  >
                    {tier.shortLabel}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 font-tech text-[0.6rem] font-bold uppercase ${
                      reached
                        ? "bg-neon-gold text-void"
                        : "border border-concrete text-ash"
                    }`}
                  >
                    {reached ? "Na lista ✓" : `Min ${tier.min}`}
                  </span>
                </div>
                <p
                  className={`mt-2 font-display text-xl leading-tight ${
                    reached ? "text-bone" : "text-bone/70"
                  }`}
                >
                  {tier.reward}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ================= ADICIONAR CONVIDADOS ================= */}
      <section className="glass-vip p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-concrete pb-4">
          <div>
            <p className="stamp text-neon-orange">Cadastro de Convidados</p>
            <h2 className="mt-1 font-display text-3xl text-bone sm:text-4xl">
              ADICIONAR NA <span className="gold-vip">LISTA VIP</span>
            </h2>
          </div>

          <div className="flex w-full gap-2 sm:w-auto">
            <button
              type="button"
              onClick={() => {
                setMode("single");
                setFeedback(null);
              }}
              className={`flex-1 border px-4 py-2 font-tech text-xs font-bold uppercase tracking-wider transition-colors sm:flex-initial ${
                mode === "single"
                  ? "border-neon-gold bg-neon-gold text-void"
                  : "border-concrete bg-void text-ash hover:border-neon-gold/60 hover:text-bone"
              }`}
            >
              + 1 Convidado
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("bulk");
                setFeedback(null);
              }}
              className={`flex-1 border px-4 py-2 font-tech text-xs font-bold uppercase tracking-wider transition-colors sm:flex-initial ${
                mode === "bulk"
                  ? "border-neon-orange bg-neon-orange text-void"
                  : "border-concrete bg-void text-ash hover:border-neon-orange/60 hover:text-bone"
              }`}
            >
              Colar vários nomes
            </button>
          </div>
        </div>

        {mode === "single" ? (
          <form onSubmit={handleAddSingle} className="mt-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-[1fr_280px]">
              <div>
                <label
                  htmlFor="guest-name-input"
                  className="stamp mb-2 block text-bone"
                >
                  Nome completo *
                </label>
                <input
                  id="guest-name-input"
                  type="text"
                  required
                  placeholder="Ex.: Mariana Oliveira"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="field"
                />
              </div>

              <div>
                <label
                  htmlFor="guest-doc-input"
                  className="stamp mb-2 block text-bone"
                >
                  Documento / dica opcional
                </label>
                <input
                  id="guest-doc-input"
                  type="text"
                  placeholder="Ex.: últimos 4 dígitos RG/CPF"
                  value={documentHint}
                  onChange={(e) => setDocumentHint(e.target.value)}
                  className="field"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-gold w-full sm:w-auto"
            >
              {isSubmitting ? "Adicionando…" : "Adicionar Convidado →"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleAddBulk} className="mt-5 space-y-4">
            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <label htmlFor="bulk-guests-input" className="stamp text-bone">
                  Cole vários nomes (um por linha) *
                </label>
                <span className="font-tech text-xs font-bold uppercase text-gold-bright">
                  {detectedBulkLines}{" "}
                  {detectedBulkLines === 1 ? "nome detectado" : "nomes detectados"}
                </span>
              </div>
              <textarea
                id="bulk-guests-input"
                rows={7}
                placeholder={"Ana Paula Silva\nBruno Costa\nCamila Ferreira\nLucas Almeida"}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                className="field min-h-[170px] resize-y"
              />
              <p className="mt-2 font-tech text-[0.7rem] text-ash">
                Dica: cole direto do WhatsApp ou bloco de notas, um nome completo por linha.
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || detectedBulkLines === 0}
              className="btn-gold w-full sm:w-auto"
            >
              {isSubmitting
                ? "Importando nomes…"
                : `Importar ${detectedBulkLines || ""} Nome${detectedBulkLines === 1 ? "" : "s"} para a Lista →`}
            </button>
          </form>
        )}

        {feedback && (
          <p
            role={feedback.type === "error" ? "alert" : "status"}
            className={`mt-4 border px-4 py-3 font-tech text-sm font-semibold ${
              feedback.type === "error"
                ? "border-neon-red bg-neon-red/12 text-neon-red"
                : "border-neon-gold/60 bg-neon-gold/15 text-gold-bright"
            }`}
          >
            {feedback.text}
          </p>
        )}
      </section>

      {/* ================= LISTA DE CONVIDADOS CADASTRADOS ================= */}
      <section className="glass-vip p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-concrete pb-4">
          <div>
            <p className="stamp text-neon-gold">Convidados Confirmados na Lista</p>
            <h2 className="mt-1 font-display text-3xl text-bone sm:text-4xl">
              NOMES NA PORTARIA ({totalGuests})
            </h2>
          </div>

          {guests.length >= 6 && (
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar nome na lista…"
              aria-label="Buscar nome na lista"
              className="field w-full sm:w-64"
            />
          )}
        </div>

        {guests.length === 0 ? (
          <div className="py-10 text-center">
            <p className="font-display text-2xl text-bone/80">
              NENHUM NOME NA LISTA AINDA
            </p>
            <p className="mt-2 text-sm text-ash">
              Use o formulário acima para cadastrar o primeiro convidado ou colar sua
              lista completa.
            </p>
          </div>
        ) : filteredGuests.length === 0 ? (
          <p className="stamp py-8 text-center">
            Nenhum convidado encontrado para &ldquo;{searchQuery}&rdquo;.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-concrete/80 border border-concrete bg-void/65">
            {filteredGuests.map((guest, index) => (
              <li
                key={guest.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="font-tech text-xs font-bold text-ash">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-display text-xl tracking-wide text-bone sm:text-2xl">
                      {guest.guest_name}
                    </p>
                    {guest.document_hint && (
                      <p className="font-tech text-xs text-ash">
                        Doc/dica: {guest.document_hint}
                      </p>
                    )}
                  </div>
                </div>

                {guest.checked_in ? (
                  <span className="shrink-0 border border-gold-bright bg-gold-bright/20 px-3 py-1 font-tech text-xs font-bold uppercase tracking-wider text-gold-bright">
                    Entrou ✓
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={removingId === guest.id}
                    onClick={() => handleRemoveGuest(guest)}
                    className="btn-ghost neon-red shrink-0 !px-3 !py-1.5 !text-xs disabled:opacity-50"
                  >
                    {removingId === guest.id ? "Removendo…" : "Remover"}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
