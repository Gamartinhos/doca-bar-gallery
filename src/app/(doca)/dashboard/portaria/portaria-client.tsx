"use client";

import Link from "next/link";
import { useMemo, useRef, useState, type FormEvent } from "react";

import type {
  BirthdayGuest,
  BirthdayLead,
  BirthdayLeadStatus,
  DocaEvent,
} from "@/lib/database.types";

import {
  addDoorGuestAction,
  toggleClaimedTierAction,
  toggleGuestCheckinAction,
  updateExtraCheckedInAction,
} from "./actions";

export interface PortariaLeadWithGuests extends BirthdayLead {
  guests: BirthdayGuest[];
}

export type PortariaEventSummary = Pick<
  DocaEvent,
  "id" | "title" | "date" | "slug" | "is_published"
>;

const DOOR_REWARDS = [
  {
    key: "tier_1",
    min: 1,
    title: "VIP Base + 1 Drink",
  },
  {
    key: "tier_5",
    min: 5,
    title: "+1 Drink (2 Drinks no total)",
  },
  {
    key: "tier_10",
    min: 10,
    title: "1 Garrafa (Vodka ou Gin)",
  },
  {
    key: "tier_15",
    min: 15,
    title: "1 Combo Completo (Vodka ou Gin)",
  },
  {
    key: "tier_20",
    min: 20,
    title: "1 Camarote + 1 Combo (Nível Raul Máximo)",
  },
] as const;

const STATUS_BADGE: Record<
  BirthdayLeadStatus,
  { label: string; className: string }
> = {
  new: {
    label: "Novo",
    className: "border-neon-orange/70 bg-neon-orange/15 text-neon-orange",
  },
  contacted: {
    label: "Em contato",
    className: "border-neon-gold/70 bg-neon-gold/15 text-neon-gold",
  },
  confirmed: {
    label: "Confirmado",
    className: "border-gold-bright/80 bg-gold-bright/20 text-gold-bright",
  },
  attended: {
    label: "Na casa",
    className: "border-gold-bright bg-gold-bright text-void",
  },
  cancelled: {
    label: "Cancelado",
    className: "border-neon-red/80 bg-neon-red/15 text-neon-red",
  },
};

function formatBrDate(dateStr: string): string {
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return dateStr;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

function formatInstagram(handle: string): string {
  const cleaned = handle.trim().replace(/^@+/, "");
  return cleaned ? `@${cleaned}` : "-";
}

function DoorBirthdayCard({
  lead,
  searchQuery,
  defaultExpanded,
  onPatchLead,
}: {
  lead: PortariaLeadWithGuests;
  searchQuery: string;
  defaultExpanded: boolean;
  onPatchLead: (
    leadId: string,
    updater: (curr: PortariaLeadWithGuests) => PortariaLeadWithGuests,
  ) => void;
}) {
  const [manualExpanded, setManualExpanded] = useState<boolean | null>(null);
  const [newGuestName, setNewGuestName] = useState("");
  const [newGuestHint, setNewGuestHint] = useState("");
  const [isAddingGuest, setIsAddingGuest] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const [busyGuestIds, setBusyGuestIds] = useState<Record<string, boolean>>({});
  const [busyTiers, setBusyTiers] = useState<Record<string, boolean>>({});

  // Sequência para evitar que respostas antigas de cliques rápidos em -1/+1 sobrescrevam o valor mais recente
  const extraSeqRef = useRef(0);

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const matchingGuestIds = useMemo(() => {
    if (!normalizedQuery) return new Set<string>();
    const ids = new Set<string>();
    for (const guest of lead.guests) {
      if (guest.guest_name.toLowerCase().includes(normalizedQuery)) {
        ids.add(guest.id);
      }
    }
    return ids;
  }, [lead.guests, normalizedQuery]);

  const hasGuestSearchMatch = matchingGuestIds.size > 0;
  const isExpanded =
    hasGuestSearchMatch || (manualExpanded ?? defaultExpanded);

  const checkedInGuestsCount = useMemo(
    () => lead.guests.filter((g) => g.checked_in).length,
    [lead.guests],
  );
  const extraCount = Math.max(0, lead.extra_checked_in);
  const presentCount = checkedInGuestsCount + extraCount;
  const claimedSet = useMemo(
    () => new Set(lead.claimed_tiers ?? []),
    [lead.claimed_tiers],
  );

  const statusMeta = STATUS_BADGE[lead.status] ?? STATUS_BADGE.new;

  // Quando há busca por convidado, coloca os nomes compatíveis no topo para toque imediato
  const orderedGuests = useMemo(() => {
    if (!hasGuestSearchMatch) return lead.guests;
    return [...lead.guests].sort((a, b) => {
      const aMatch = matchingGuestIds.has(a.id) ? 0 : 1;
      const bMatch = matchingGuestIds.has(b.id) ? 0 : 1;
      return aMatch - bMatch;
    });
  }, [lead.guests, hasGuestSearchMatch, matchingGuestIds]);

  async function handleToggleGuest(guest: BirthdayGuest) {
    if (busyGuestIds[guest.id]) return;

    const prevCheckedIn = guest.checked_in;
    const prevCheckedInAt = guest.checked_in_at;
    const nextCheckedIn = !prevCheckedIn;
    const optimisticTimestamp = nextCheckedIn ? new Date().toISOString() : null;

    setCardError(null);
    setBusyGuestIds((prev) => ({ ...prev, [guest.id]: true }));

    onPatchLead(lead.id, (curr) => ({
      ...curr,
      guests: curr.guests.map((item) =>
        item.id === guest.id
          ? {
              ...item,
              checked_in: nextCheckedIn,
              checked_in_at: optimisticTimestamp,
            }
          : item,
      ),
    }));

    const res = await toggleGuestCheckinAction({
      guestId: guest.id,
      checkedIn: nextCheckedIn,
    });

    setBusyGuestIds((prev) => {
      const copy = { ...prev };
      delete copy[guest.id];
      return copy;
    });

    if (!res.ok) {
      onPatchLead(lead.id, (curr) => ({
        ...curr,
        guests: curr.guests.map((item) =>
          item.id === guest.id
            ? {
                ...item,
                checked_in: prevCheckedIn,
                checked_in_at: prevCheckedInAt,
              }
            : item,
        ),
      }));
      setCardError(res.error ?? "Erro ao atualizar check-in.");
    }
  }

  async function handleAdjustExtra(delta: -1 | 1) {
    const prevExtra = extraCount;
    const nextExtra = Math.max(0, prevExtra + delta);
    if (nextExtra === prevExtra) return;

    const requestSeq = extraSeqRef.current + 1;
    extraSeqRef.current = requestSeq;
    setCardError(null);

    onPatchLead(lead.id, (curr) => ({
      ...curr,
      extra_checked_in: nextExtra,
    }));

    const res = await updateExtraCheckedInAction({
      leadId: lead.id,
      extraCheckedIn: nextExtra,
    });

    if (extraSeqRef.current !== requestSeq) return;

    if (!res.ok) {
      onPatchLead(lead.id, (curr) => ({
        ...curr,
        extra_checked_in: prevExtra,
      }));
      setCardError(res.error ?? "Erro ao ajustar avulsos.");
    }
  }

  async function handleToggleTierClaim(tierKey: string) {
    if (busyTiers[tierKey]) return;

    const prevClaimedTiers = lead.claimed_tiers ?? [];
    const willClaim = !claimedSet.has(tierKey);
    const optimisticTiers = willClaim
      ? Array.from(new Set([...prevClaimedTiers, tierKey]))
      : prevClaimedTiers.filter((t) => t !== tierKey);

    setCardError(null);
    setBusyTiers((prev) => ({ ...prev, [tierKey]: true }));

    onPatchLead(lead.id, (curr) => ({
      ...curr,
      claimed_tiers: optimisticTiers,
    }));

    const res = await toggleClaimedTierAction({
      leadId: lead.id,
      tierKey,
      claimed: willClaim,
    });

    setBusyTiers((prev) => {
      const copy = { ...prev };
      delete copy[tierKey];
      return copy;
    });

    if (!res.ok || !res.claimedTiers) {
      onPatchLead(lead.id, (curr) => ({
        ...curr,
        claimed_tiers: prevClaimedTiers,
      }));
      setCardError(res.error ?? "Erro ao salvar entrega do prêmio.");
      return;
    }

    onPatchLead(lead.id, (curr) => ({
      ...curr,
      claimed_tiers: res.claimedTiers!,
    }));
  }

  async function handleAddDoorGuest(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCardError(null);

    const trimmedName = newGuestName.trim();
    if (trimmedName.length < 2) {
      setCardError("Digite o nome do convidado (mínimo 2 letras).");
      return;
    }

    setIsAddingGuest(true);
    const res = await addDoorGuestAction({
      leadId: lead.id,
      guestName: trimmedName,
      documentHint: newGuestHint.trim() || undefined,
      checkedIn: true,
    });
    setIsAddingGuest(false);

    if (!res.ok || !res.guest) {
      setCardError(res.error ?? "Erro ao adicionar convidado na porta.");
      return;
    }

    onPatchLead(lead.id, (curr) => ({
      ...curr,
      guests: [...curr.guests, res.guest!],
    }));
    setNewGuestName("");
    setNewGuestHint("");
  }

  return (
    <article
      className={`glass-vip p-4 sm:p-6 ${
        lead.status === "cancelled" ? "border-neon-red/50 opacity-80" : ""
      }`}
    >
      {/* CABEÇALHO + DESTAQUE GIGANTE PRESENTES PAGANTES */}
      <div className="flex flex-col gap-4 border-b border-concrete pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-3xl leading-none text-bone sm:text-4xl">
              {lead.full_name}
            </h2>
            <span
              className={`border px-2.5 py-0.5 font-tech text-[0.65rem] font-bold uppercase tracking-wider ${statusMeta.className}`}
            >
              {statusMeta.label}
            </span>
            {lead.wants_camarote && (
              <span className="border border-neon-gold/70 bg-neon-gold/20 px-2 py-0.5 font-tech text-[0.62rem] font-bold uppercase tracking-wider text-gold-bright">
                Camarote
              </span>
            )}
          </div>

          <p className="font-tech text-xs text-neon-gold sm:text-sm">
            {formatInstagram(lead.instagram)}
          </p>

          <p className="stamp text-[0.68rem] text-ash">
            Evento: <span className="text-bone">{lead.event_label}</span>
          </p>

          {lead.notes && (
            <p className="border-l-2 border-neon-orange bg-void/65 px-3 py-1.5 font-tech text-xs text-bone/90">
              Obs.: {lead.notes}
            </p>
          )}
        </div>

        {/* DESTAQUE GIGANTE: PRESENTES PAGANTES */}
        <div className="flex shrink-0 items-center justify-between gap-4 border border-neon-gold/60 bg-void/90 px-4 py-3 sm:min-w-[205px] sm:flex-col sm:items-end sm:justify-center sm:text-right">
          <div>
            <p className="stamp text-[0.62rem] font-bold text-neon-gold">
              Presentes Pagantes
            </p>
            <p className="mt-1 font-tech text-[0.68rem] text-ash">
              {checkedInGuestsCount} na lista + {extraCount} avulso
              {extraCount === 1 ? "" : "s"}
            </p>
          </div>
          <p className="gold-vip font-display text-5xl leading-none sm:text-6xl">
            {presentCount}
          </p>
        </div>
      </div>

      {/* CONTADOR RÁPIDO -1 / +1 CONVIDADO AVULSO */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border border-concrete bg-void/75 p-3 sm:px-4">
        <div>
          <p className="font-tech text-xs font-bold uppercase tracking-wider text-bone">
            Convidados Avulsos (sem nome na lista)
          </p>
          <p className="font-tech text-[0.7rem] text-ash">
            Soma direto nos Presentes Pagantes
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            disabled={extraCount <= 0}
            onClick={() => void handleAdjustExtra(-1)}
            aria-label={`Remover 1 convidado avulso de ${lead.full_name}`}
            className="flex min-h-[48px] min-w-[54px] cursor-pointer items-center justify-center border border-concrete bg-ink font-display text-2xl text-bone transition-colors hover:border-neon-red hover:text-neon-red active:scale-95 disabled:cursor-not-allowed disabled:opacity-35"
          >
            -1
          </button>

          <span className="min-w-[44px] text-center font-display text-3xl text-gold-bright">
            {extraCount}
          </span>

          <button
            type="button"
            onClick={() => void handleAdjustExtra(1)}
            aria-label={`Adicionar 1 convidado avulso para ${lead.full_name}`}
            className="flex min-h-[48px] min-w-[54px] cursor-pointer items-center justify-center border border-neon-gold/70 bg-neon-gold/15 font-display text-2xl text-gold-bright transition-colors hover:bg-neon-gold hover:text-void active:scale-95"
          >
            +1
          </button>
        </div>
      </div>

      {/* ESCADINHA DE PRÊMIOS DESBLOQUEADOS AUTOMATICAMENTE */}
      <div className="mt-4">
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <p className="stamp text-[0.65rem] text-neon-orange">
            Escadinha de Prêmios (ao vivo)
          </p>
          <p className="font-tech text-[0.68rem] text-ash">
            Toque para marcar entrega no bar/porta
          </p>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
          {DOOR_REWARDS.map((reward) => {
            const unlocked = presentCount >= reward.min;
            const claimed = claimedSet.has(reward.key);
            const isBusy = Boolean(busyTiers[reward.key]);
            const canToggle = unlocked || claimed;

            return (
              <div
                key={reward.key}
                className={`flex flex-col justify-between gap-2.5 border p-3 transition-all ${
                  claimed
                    ? "border-gold-bright bg-gradient-to-br from-gold-bright/20 via-neon-gold/15 to-void"
                    : unlocked
                      ? "border-neon-orange/80 bg-gradient-to-br from-neon-orange/15 via-ink to-void shadow-[0_0_18px_-8px_rgba(255,77,0,0.6)]"
                      : "border-concrete bg-ink/70 opacity-50"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1.5">
                    <span
                      className={`font-tech text-[0.65rem] font-bold uppercase tracking-wider ${
                        unlocked ? "text-gold-bright" : "text-ash"
                      }`}
                    >
                      {reward.min}+ pagantes
                    </span>
                    <span
                      className={`px-1.5 py-0.5 font-tech text-[0.58rem] font-bold uppercase ${
                        claimed
                          ? "bg-gold-bright text-void"
                          : unlocked
                            ? "bg-neon-orange text-void"
                            : "border border-concrete text-ash"
                      }`}
                    >
                      {claimed
                        ? "Entregue"
                        : unlocked
                          ? "Liberado!"
                          : `Faltam ${reward.min - presentCount}`}
                    </span>
                  </div>

                  <p className="mt-1.5 font-display text-lg leading-tight text-bone">
                    {reward.title}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={!canToggle || isBusy}
                  onClick={() => void handleToggleTierClaim(reward.key)}
                  className={`min-h-[44px] w-full cursor-pointer border px-3 py-2 font-tech text-xs font-bold uppercase tracking-wider transition-colors active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 ${
                    claimed
                      ? "border-gold-bright bg-gold-bright text-void hover:brightness-105"
                      : unlocked
                        ? "border-neon-gold bg-void text-gold-bright hover:bg-neon-gold hover:text-void"
                        : "border-concrete bg-void/70 text-ash"
                  }`}
                >
                  {isBusy
                    ? "Salvando…"
                    : claimed
                      ? "Entregue ✓"
                      : unlocked
                        ? "Marcar entregue"
                        : "Bloqueado"}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {cardError && (
        <p
          role="alert"
          className="mt-4 border border-neon-red bg-neon-red/12 px-3 py-2.5 font-tech text-xs font-semibold text-neon-red"
        >
          {cardError}
        </p>
      )}

      {/* BOTÃO EXPANDIR / RECOLHER LISTA NOMINAL */}
      <div className="mt-4 border-t border-concrete/80 pt-4">
        <button
          type="button"
          onClick={() => setManualExpanded(!isExpanded)}
          className="flex min-h-[48px] w-full cursor-pointer items-center justify-between gap-3 border border-concrete bg-ink px-4 py-3 text-left transition-colors hover:border-neon-gold/60"
        >
          <span className="font-tech text-xs font-bold uppercase tracking-wider text-bone sm:text-sm">
            Lista Nominal ({lead.guests.length}{" "}
            {lead.guests.length === 1 ? "nome" : "nomes"} · {checkedInGuestsCount}{" "}
            entrou)
            {hasGuestSearchMatch && (
              <span className="ml-2 text-neon-orange">
                · {matchingGuestIds.size} compatível(is) com a busca
              </span>
            )}
          </span>
          <span className="font-tech text-xs font-bold uppercase text-neon-gold">
            {isExpanded ? "Ocultar ▲" : "Abrir lista ▼"}
          </span>
        </button>

        {isExpanded && (
          <div className="mt-3 space-y-3">
            {/* LISTA DE CONVIDADOS TOUCH-FRIENDLY */}
            {orderedGuests.length === 0 ? (
              <p className="border border-dashed border-concrete bg-void/50 px-4 py-5 text-center font-tech text-xs text-ash">
                Nenhum convidado pré-cadastrado nesta lista. Use o formulário
                abaixo para registrar quem chegou na porta.
              </p>
            ) : (
              <ul className="space-y-2">
                {orderedGuests.map((guest) => {
                  const isMatch = matchingGuestIds.has(guest.id);
                  const isBusy = Boolean(busyGuestIds[guest.id]);

                  return (
                    <li key={guest.id}>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void handleToggleGuest(guest)}
                        className={`flex min-h-[54px] w-full cursor-pointer items-center justify-between gap-3 border px-4 py-3 text-left transition-all active:scale-[0.99] ${
                          guest.checked_in
                            ? "border-gold-bright/80 bg-gold-bright/15"
                            : isMatch
                              ? "border-neon-orange bg-neon-orange/15"
                              : "border-concrete bg-void/80 hover:border-neon-gold/50"
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="truncate font-display text-xl tracking-wide text-bone sm:text-2xl">
                            {guest.guest_name}
                          </p>
                          {guest.document_hint && (
                            <p className="font-tech text-[0.7rem] text-ash">
                              Doc/dica: {guest.document_hint}
                            </p>
                          )}
                        </div>

                        <span
                          className={`shrink-0 px-3.5 py-2 font-tech text-xs font-bold uppercase tracking-wider ${
                            guest.checked_in
                              ? "bg-gold-bright text-void"
                              : "border border-concrete bg-ink text-ash"
                          }`}
                        >
                          {isBusy
                            ? "…"
                            : guest.checked_in
                              ? "Entrou ✓"
                              : "Aguardando"}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {/* ADICIONAR CONVIDADO NA HORA (PORTA) */}
            <form
              onSubmit={handleAddDoorGuest}
              className="border border-concrete bg-void/70 p-3 sm:p-4"
            >
              <p className="stamp mb-2.5 text-[0.65rem] text-neon-gold">
                + Registrar convidado que chegou na hora (já marca Entrou ✓)
              </p>
              <div className="flex flex-col gap-2.5 sm:flex-row">
                <input
                  type="text"
                  placeholder="Nome completo do convidado *"
                  value={newGuestName}
                  onChange={(e) => setNewGuestName(e.target.value)}
                  className="field min-h-[48px] flex-1 !py-2.5 !text-sm"
                />
                <input
                  type="text"
                  placeholder="Doc / dica (opcional)"
                  value={newGuestHint}
                  onChange={(e) => setNewGuestHint(e.target.value)}
                  className="field min-h-[48px] sm:w-44 !py-2.5 !text-sm"
                />
                <button
                  type="submit"
                  disabled={isAddingGuest}
                  className="btn-gold min-h-[48px] shrink-0 !px-5 !py-2.5 !text-xs"
                >
                  {isAddingGuest ? "Registrando…" : "+ Registrar Entrada"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </article>
  );
}

export function PortariaClient({
  initialLeads,
  events,
  canOpenComercial,
}: {
  initialLeads: PortariaLeadWithGuests[];
  events: PortariaEventSummary[];
  canOpenComercial: boolean;
}) {
  const [leads, setLeads] = useState<PortariaLeadWithGuests[]>(initialLeads);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<string>("all");
  const [hideCancelled, setHideCancelled] = useState<boolean>(true);

  const hasCustomLeads = useMemo(
    () => leads.some((lead) => !lead.event_id),
    [leads],
  );

  // Só mostra na barra rápida de eventos aqueles que possuem leads ou os próximos 6 eventos
  const eventFilterOptions = useMemo(() => {
    const leadEventIds = new Set(
      leads.map((l) => l.event_id).filter((id): id is string => Boolean(id)),
    );
    return events.filter((ev) => leadEventIds.has(ev.id)).slice(0, 8);
  }, [events, leads]);

  const filteredLeads = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return leads.filter((lead) => {
      if (hideCancelled && lead.status === "cancelled" && !q) {
        return false;
      }

      if (selectedEvent === "custom") {
        if (lead.event_id !== null) return false;
      } else if (selectedEvent !== "all") {
        if (lead.event_id !== selectedEvent) return false;
      }

      if (!q) return true;

      if (lead.full_name.toLowerCase().includes(q)) return true;
      if (lead.instagram.toLowerCase().includes(q)) return true;

      return lead.guests.some((g) => g.guest_name.toLowerCase().includes(q));
    });
  }, [leads, searchQuery, selectedEvent, hideCancelled]);

  const totalPresentHouse = useMemo(() => {
    return filteredLeads.reduce((acc, lead) => {
      const checkedIn = lead.guests.filter((g) => g.checked_in).length;
      return acc + checkedIn + Math.max(0, lead.extra_checked_in);
    }, 0);
  }, [filteredLeads]);

  function handlePatchLead(
    leadId: string,
    updater: (curr: PortariaLeadWithGuests) => PortariaLeadWithGuests,
  ) {
    setLeads((prev) =>
      prev.map((item) => (item.id === leadId ? updater(item) : item)),
    );
  }

  return (
    <div className="space-y-6">
      {/* Atalhos de navegação */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard" className="btn-ghost neon-gold !px-3.5 !py-2 !text-xs">
            ← Painel QG
          </Link>
          {canOpenComercial && (
            <Link
              href="/dashboard/comercial"
              className="btn-ghost neon-orange !px-3.5 !py-2 !text-xs"
            >
              CRM Comercial →
            </Link>
          )}
        </div>

        <div className="flex items-center gap-3 border border-neon-gold/40 bg-void/80 px-3.5 py-2">
          <span className="stamp text-[0.62rem] text-ash">Pagantes no filtro:</span>
          <span className="font-display text-2xl leading-none text-gold-bright">
            {totalPresentHouse}
          </span>
        </div>
      </div>

      {/* BARRA DE BUSCA INSTANTÂNEA + FILTRO POR NOITE */}
      <section className="glass-vip space-y-3 p-4">
        <div className="flex gap-2">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar aniversariante, @insta ou convidado…"
            aria-label="Buscar aniversariante, @instagram ou convidado"
            className="field min-h-[50px] flex-1 text-base"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="btn-ghost neon-orange min-h-[50px] shrink-0 !px-4 !text-xs"
            >
              Limpar
            </button>
          )}
        </div>

        {/* Pills rápidas de evento/noite */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setSelectedEvent("all")}
            className={`min-h-[40px] shrink-0 cursor-pointer border px-3.5 py-1.5 font-tech text-xs font-bold uppercase tracking-wider transition-colors ${
              selectedEvent === "all"
                ? "border-neon-gold bg-neon-gold text-void"
                : "border-concrete bg-void text-ash hover:border-neon-gold/60 hover:text-bone"
            }`}
          >
            Todas as noites
          </button>

          {eventFilterOptions.map((ev) => (
            <button
              key={ev.id}
              type="button"
              onClick={() => setSelectedEvent(ev.id)}
              className={`min-h-[40px] shrink-0 cursor-pointer border px-3.5 py-1.5 font-tech text-xs font-bold uppercase tracking-wider transition-colors ${
                selectedEvent === ev.id
                  ? "border-neon-orange bg-neon-orange text-void"
                  : "border-concrete bg-void text-ash hover:border-neon-orange/60 hover:text-bone"
              }`}
            >
              {ev.title} ({formatBrDate(ev.date)})
            </button>
          ))}

          {hasCustomLeads && (
            <button
              type="button"
              onClick={() => setSelectedEvent("custom")}
              className={`min-h-[40px] shrink-0 cursor-pointer border px-3.5 py-1.5 font-tech text-xs font-bold uppercase tracking-wider transition-colors ${
                selectedEvent === "custom"
                  ? "border-neon-gold bg-neon-gold text-void"
                  : "border-concrete bg-void text-ash hover:border-neon-gold/60 hover:text-bone"
              }`}
            >
              Datas específicas
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-concrete/70 pt-2.5 text-xs">
          <p className="font-tech text-ash">
            Mostrando <span className="text-bone">{filteredLeads.length}</span>{" "}
            {filteredLeads.length === 1 ? "lista" : "listas"}
          </p>

          <label className="flex cursor-pointer items-center gap-2 font-tech text-xs text-ash">
            <input
              type="checkbox"
              checked={!hideCancelled}
              onChange={(e) => setHideCancelled(!e.target.checked)}
              className="h-4 w-4 accent-neon-orange"
            />
            Mostrar listas canceladas
          </label>
        </div>
      </section>

      {/* CARDS DE ANIVERSARIANTES */}
      {filteredLeads.length === 0 ? (
        <div className="glass-vip p-8 text-center">
          <p className="font-display text-3xl text-bone">
            NENHUMA LISTA ENCONTRADA
          </p>
          <p className="mt-2 text-sm text-ash">
            {searchQuery
              ? `Nenhum aniversariante, @instagram ou convidado corresponde a "${searchQuery}".`
              : "Nenhuma lista VIP cadastrada para este filtro."}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {filteredLeads.map((lead, idx) => (
            <DoorBirthdayCard
              key={lead.id}
              lead={lead}
              searchQuery={searchQuery}
              defaultExpanded={filteredLeads.length <= 2 || idx === 0}
              onPatchLead={handlePatchLead}
            />
          ))}
        </div>
      )}
    </div>
  );
}
