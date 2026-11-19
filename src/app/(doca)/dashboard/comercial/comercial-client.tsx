"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";

import type {
  BirthdayLead,
  BirthdayLeadStatus,
  DocaEvent,
} from "@/lib/database.types";

import { updateLeadCrm } from "./actions";

export type ComercialEventSummary = Pick<
  DocaEvent,
  "id" | "title" | "date" | "slug" | "is_published"
>;

export interface GuestStat {
  total: number;
  checkedIn: number;
}

const STATUS_OPTIONS: readonly {
  value: BirthdayLeadStatus;
  label: string;
  badgeClass: string;
}[] = [
  {
    value: "new",
    label: "Pendente",
    badgeClass: "border-neon-orange/70 bg-neon-orange/15 text-neon-orange",
  },
  {
    value: "contacted",
    label: "Em contato",
    badgeClass: "border-neon-gold/70 bg-neon-gold/15 text-neon-gold",
  },
  {
    value: "confirmed",
    label: "Confirmado",
    badgeClass: "border-gold-bright/80 bg-gold-bright/20 text-gold-bright",
  },
  {
    value: "attended",
    label: "Na casa / Atendido",
    badgeClass: "border-gold-bright bg-gold-bright text-void",
  },
  {
    value: "cancelled",
    label: "Cancelado",
    badgeClass: "border-neon-red/70 bg-neon-red/15 text-neon-red",
  },
];

const STATUS_META_MAP = new Map(
  STATUS_OPTIONS.map((item) => [item.value, item]),
);

const GUEST_TIER_BADGES: Record<string, string> = {
  ate_5: "VIP Base (até 4)",
  "5_10": "5 a 10 Pagantes",
  "10_15": "10 a 15 Pagantes",
  "15_20": "15 a 20 Pagantes",
  "20_mais": "20+ Raul Máximo",
};

function formatBrDate(dateStr: string): string {
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return dateStr;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

function formatCreatedAt(isoStr: string): string {
  const date = new Date(isoStr);
  if (Number.isNaN(date.getTime())) return isoStr;
  return date.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatInstagram(handle: string): string {
  const cleaned = handle.trim().replace(/^@+/, "");
  return cleaned ? `@${cleaned}` : "-";
}

function formatPhoneDisplay(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.length >= 12 && digits.startsWith("55")) {
    digits = digits.slice(2);
  }
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return raw;
}

function buildLeadWhatsappUrl(lead: BirthdayLead, origin: string): string {
  const digits = lead.whatsapp.replace(/\D/g, "");
  const phoneWithCountry =
    digits.startsWith("55") && digits.length >= 12 ? digits : `55${digits}`;
  const listPath = `/aniversario/lista/${lead.share_token}`;
  const fullListUrl = origin ? `${origin}${listPath}` : listPath;

  const lines = [
    `Salve ${lead.full_name}! Aqui é da equipe da Doca Bar 🍻`,
    `Recebemos seu cadastro de Aniversário VIP (${lead.event_label}).`,
    `Para garantir sua entrada e destravar os prêmios da Escadinha VIP, preencha os nomes da sua lista nominal aqui:`,
    fullListUrl,
  ];

  return `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(
    lines.join("\n"),
  )}`;
}

function LeadCrmCard({
  lead,
  stat,
  origin,
  onLeadUpdated,
}: {
  lead: BirthdayLead;
  stat: GuestStat;
  origin: string;
  onLeadUpdated: (
    leadId: string,
    status: BirthdayLeadStatus,
    notes: string | null,
  ) => void;
}) {
  const [status, setStatus] = useState<BirthdayLeadStatus>(lead.status);
  const [notes, setNotes] = useState<string>(lead.notes ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<{
    type: "ok" | "error";
    text: string;
  } | null>(null);

  const statusMeta = STATUS_META_MAP.get(status) ?? STATUS_OPTIONS[0];
  const tierLabel = GUEST_TIER_BADGES[lead.guest_tier] ?? lead.guest_tier;
  const presentCount = stat.checkedIn + Math.max(0, lead.extra_checked_in);
  const listPath = `/aniversario/lista/${lead.share_token}`;
  const hasUnsavedNotes = (notes.trim() || null) !== (lead.notes?.trim() || null);

  async function persistCrm(
    nextStatus: BirthdayLeadStatus,
    nextNotes: string,
  ) {
    setIsSaving(true);
    setSaveFeedback(null);

    const res = await updateLeadCrm({
      leadId: lead.id,
      status: nextStatus,
      notes: nextNotes,
    });

    setIsSaving(false);

    if (!res.ok) {
      setStatus(lead.status);
      setSaveFeedback({
        type: "error",
        text: res.error ?? "Erro ao salvar.",
      });
      return;
    }

    onLeadUpdated(lead.id, nextStatus, res.notes ?? null);
    setSaveFeedback({ type: "ok", text: "Salvo ✓" });
    setTimeout(() => {
      setSaveFeedback((curr) => (curr?.type === "ok" ? null : curr));
    }, 2400);
  }

  async function handleCopyListLink() {
    const url = origin ? `${origin}${listPath}` : listPath;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  }

  return (
    <article className="glass-vip p-5 transition-colors hover:border-neon-gold/60 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-concrete/80 pb-4">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-3xl leading-none text-bone">
              {lead.full_name}
            </h3>

            <span
              className={`border px-2.5 py-0.5 font-tech text-[0.65rem] font-bold uppercase tracking-wider ${statusMeta.badgeClass}`}
            >
              {statusMeta.label}
            </span>

            <span className="border border-neon-orange/60 bg-neon-orange/15 px-2.5 py-0.5 font-tech text-[0.65rem] font-bold uppercase tracking-wider text-neon-orange">
              {tierLabel}
            </span>

            {lead.wants_camarote && (
              <span className="border border-neon-gold/80 bg-neon-gold/20 px-2.5 py-0.5 font-tech text-[0.65rem] font-bold uppercase tracking-wider text-gold-bright">
                Quer Camarote
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-tech text-xs text-bone/90">
            <span className="text-neon-gold">
              {formatInstagram(lead.instagram)}
            </span>
            <span className="text-ash">·</span>
            <span>{formatPhoneDisplay(lead.whatsapp)}</span>
            <span className="text-ash">·</span>
            <span>Nasc.: {formatBrDate(lead.birth_date)}</span>
            <span className="text-ash">·</span>
            <span className="text-ash">
              Cadastro: {formatCreatedAt(lead.created_at)}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <p className="stamp text-[0.68rem] text-ash">
              Noite: <span className="text-bone">{lead.event_label}</span>
            </p>
            <span className="border border-concrete bg-void/80 px-2.5 py-1 font-tech text-xs text-gold-bright">
              {stat.total} {stat.total === 1 ? "convidado" : "convidados"} na lista ·{" "}
              {presentCount} {presentCount === 1 ? "presente" : "presentes"}
            </span>
          </div>
        </div>

        <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
          <a
            href={buildLeadWhatsappUrl(lead, origin)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-gold flex-1 !px-4 !py-2 !text-xs sm:flex-initial"
          >
            Chamar no WhatsApp
          </a>
          <Link
            href={listPath}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost neon-orange flex-1 !px-3.5 !py-2 !text-xs sm:flex-initial"
          >
            Abrir lista ↗
          </Link>
          <button
            type="button"
            onClick={handleCopyListLink}
            className="btn-ghost neon-gold flex-1 !px-3.5 !py-2 !text-xs sm:flex-initial"
          >
            {copied ? "Link copiado ✓" : "Copiar link"}
          </button>
        </div>
      </div>

      {/* Controles de Status e Observações Internas */}
      <div className="mt-4 grid gap-4 md:grid-cols-[220px_1fr_auto] md:items-end">
        <div>
          <label
            htmlFor={`status-${lead.id}`}
            className="stamp mb-1.5 block text-[0.65rem] text-ash"
          >
            Status CRM
          </label>
          <select
            id={`status-${lead.id}`}
            value={status}
            disabled={isSaving}
            onChange={(e) => {
              const nextStatus = e.target.value as BirthdayLeadStatus;
              setStatus(nextStatus);
              void persistCrm(nextStatus, notes);
            }}
            className="field !py-2.5 !text-sm"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-void text-bone">
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor={`notes-${lead.id}`}
            className="stamp mb-1.5 block text-[0.65rem] text-ash"
          >
            Observações internas (equipe)
          </label>
          <input
            id={`notes-${lead.id}`}
            type="text"
            placeholder="Ex.: Quer C4, vai pagar antecipado, amigo do DJ…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="field !py-2.5 !text-sm"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={isSaving}
            onClick={() => void persistCrm(status, notes)}
            className={`btn-street !px-4 !py-2.5 !text-xs ${
              hasUnsavedNotes ? "neon-gold" : "neon-orange"
            }`}
          >
            {isSaving ? "Salvando…" : hasUnsavedNotes ? "Salvar notas" : "Salvar CRM"}
          </button>

          {saveFeedback && (
            <span
              className={`font-tech text-xs font-bold ${
                saveFeedback.type === "error"
                  ? "text-neon-red"
                  : "text-gold-bright"
              }`}
            >
              {saveFeedback.text}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

const emptySubscribe = () => () => {};
const getClientOrigin = () => window.location.origin;
const getServerOrigin = () => "";

export function ComercialClient({
  initialLeads,
  guestStats,
  events,
  canOpenPortaria,
}: {
  initialLeads: BirthdayLead[];
  guestStats: Record<string, GuestStat>;
  events: ComercialEventSummary[];
  canOpenPortaria: boolean;
}) {
  const [leads, setLeads] = useState<BirthdayLead[]>(initialLeads);
  const [selectedEvent, setSelectedEvent] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [search, setSearch] = useState<string>("");
  const origin = useSyncExternalStore(
    emptySubscribe,
    getClientOrigin,
    getServerOrigin,
  );

  const metrics = useMemo(() => {
    let pending = 0;
    let confirmed = 0;
    let attended = 0;
    let wantsCamarote = 0;

    for (const lead of leads) {
      if (lead.status === "new") pending += 1;
      if (lead.status === "confirmed") confirmed += 1;
      if (lead.status === "attended") attended += 1;
      if (lead.wants_camarote) wantsCamarote += 1;
    }

    return {
      total: leads.length,
      pending,
      confirmed,
      attended,
      wantsCamarote,
    };
  }, [leads]);

  const hasCustomDateLeads = useMemo(
    () => leads.some((lead) => !lead.event_id),
    [leads],
  );

  const filteredLeads = useMemo(() => {
    const query = search.trim().toLowerCase();
    const digitsQuery = search.replace(/\D/g, "");

    return leads.filter((lead) => {
      if (selectedStatus !== "all" && lead.status !== selectedStatus) {
        return false;
      }

      if (selectedEvent === "custom") {
        if (lead.event_id !== null) return false;
      } else if (selectedEvent !== "all") {
        if (lead.event_id !== selectedEvent) return false;
      }

      if (query) {
        const nameMatch = lead.full_name.toLowerCase().includes(query);
        const igMatch = lead.instagram.toLowerCase().includes(query);
        const phoneMatch =
          digitsQuery.length > 0 &&
          lead.whatsapp.replace(/\D/g, "").includes(digitsQuery);
        const rawPhoneMatch = lead.whatsapp.toLowerCase().includes(query);

        if (!nameMatch && !igMatch && !phoneMatch && !rawPhoneMatch) {
          return false;
        }
      }

      return true;
    });
  }, [leads, selectedEvent, selectedStatus, search]);

  function handleLeadUpdated(
    leadId: string,
    status: BirthdayLeadStatus,
    notes: string | null,
  ) {
    setLeads((prev) =>
      prev.map((item) =>
        item.id === leadId ? { ...item, status, notes } : item,
      ),
    );
  }

  return (
    <div className="space-y-8">
      {/* Navegação rápida */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard" className="btn-ghost neon-gold !px-3.5 !py-1.5 !text-xs">
            ← Painel QG
          </Link>
          {canOpenPortaria && (
            <Link
              href="/dashboard/portaria"
              className="btn-ghost neon-orange !px-3.5 !py-1.5 !text-xs"
            >
              Ir para Portaria Mobile →
            </Link>
          )}
        </div>

        <Link
          href="/aniversario"
          target="_blank"
          rel="noopener noreferrer"
          className="stamp text-neon-gold hover:text-gold-bright"
        >
          Ver página pública de Aniversário ↗
        </Link>
      </div>

      {/* Métricas no topo */}
      <dl className="grid grid-cols-2 gap-3 border-y border-concrete py-5 sm:grid-cols-3 lg:grid-cols-5">
        <div className="border border-concrete bg-ink/80 p-3.5">
          <dt className="stamp text-[0.65rem]">Total de Aniversários</dt>
          <dd className="mt-1 font-display text-4xl text-bone">
            {String(metrics.total).padStart(2, "0")}
          </dd>
        </div>

        <div className="border border-neon-orange/40 bg-ink/80 p-3.5">
          <dt className="stamp text-[0.65rem] text-neon-orange">
            Pendentes de Contato
          </dt>
          <dd className="mt-1 font-display text-4xl text-neon-orange">
            {String(metrics.pending).padStart(2, "0")}
          </dd>
        </div>

        <div className="border border-neon-gold/40 bg-ink/80 p-3.5">
          <dt className="stamp text-[0.65rem] text-neon-gold">Confirmados</dt>
          <dd className="mt-1 font-display text-4xl text-gold-bright">
            {String(metrics.confirmed).padStart(2, "0")}
          </dd>
        </div>

        <div className="border border-gold-bright/50 bg-ink/80 p-3.5">
          <dt className="stamp text-[0.65rem] text-gold-bright">
            Na Casa / Atendidos
          </dt>
          <dd className="gold-vip mt-1 font-display text-4xl">
            {String(metrics.attended).padStart(2, "0")}
          </dd>
        </div>

        <div className="col-span-2 border border-neon-gold/40 bg-ink/80 p-3.5 sm:col-span-1">
          <dt className="stamp text-[0.65rem] text-gold-bright">
            Querem Camarote
          </dt>
          <dd className="mt-1 font-display text-4xl text-neon-gold">
            {String(metrics.wantsCamarote).padStart(2, "0")}
          </dd>
        </div>
      </dl>

      {/* Barra de Filtros */}
      <section className="glass-vip p-4 sm:p-5">
        <div className="grid gap-3 md:grid-cols-[1fr_220px_260px]">
          <div>
            <label
              htmlFor="comercial-search"
              className="stamp mb-1.5 block text-[0.65rem]"
            >
              Buscar por nome, @instagram ou telefone
            </label>
            <input
              id="comercial-search"
              type="search"
              placeholder="Ex.: Ana, @anavip, 1199999…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="field !py-2.5 !text-sm"
            />
          </div>

          <div>
            <label
              htmlFor="comercial-status-filter"
              className="stamp mb-1.5 block text-[0.65rem]"
            >
              Status
            </label>
            <select
              id="comercial-status-filter"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="field !py-2.5 !text-sm"
            >
              <option value="all" className="bg-void text-bone">
                Todos os status
              </option>
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-void text-bone">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="comercial-event-filter"
              className="stamp mb-1.5 block text-[0.65rem]"
            >
              Evento / Noite
            </label>
            <select
              id="comercial-event-filter"
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value)}
              className="field !py-2.5 !text-sm"
            >
              <option value="all" className="bg-void text-bone">
                Todas as noites
              </option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id} className="bg-void text-bone">
                  {ev.title} — {formatBrDate(ev.date)}
                </option>
              ))}
              {hasCustomDateLeads && (
                <option value="custom" className="bg-void text-gold-bright">
                  Data específica (sem evento vinculado)
                </option>
              )}
            </select>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-ash">
          <p className="font-tech">
            Exibindo <span className="text-bone">{filteredLeads.length}</span> de{" "}
            <span className="text-bone">{leads.length}</span> aniversários
          </p>

          {(search || selectedStatus !== "all" || selectedEvent !== "all") && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setSelectedStatus("all");
                setSelectedEvent("all");
              }}
              className="font-tech text-xs uppercase tracking-wider text-neon-orange hover:underline"
            >
              Limpar filtros
            </button>
          )}
        </div>
      </section>

      {/* Lista de Leads */}
      {filteredLeads.length === 0 ? (
        <div className="glass-vip p-10 text-center">
          <p className="font-display text-3xl text-bone">
            NENHUM ANIVERSARIANTE ENCONTRADO
          </p>
          <p className="mt-2 text-sm text-ash">
            Tente ajustar a busca ou os filtros de evento e status acima.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredLeads.map((lead) => (
            <LeadCrmCard
              key={lead.id}
              lead={lead}
              stat={guestStats[lead.id] ?? { total: 0, checkedIn: 0 }}
              origin={origin}
              onLeadUpdated={handleLeadUpdated}
            />
          ))}
        </div>
      )}
    </div>
  );
}
