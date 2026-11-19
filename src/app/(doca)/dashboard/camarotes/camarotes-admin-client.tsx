"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import type {
  DocaEvent,
  EventSpaceStatus,
  SpaceAvailabilityStatus,
  SpaceCode,
} from "@/lib/database.types";

import { upsertSpaceStatus } from "./actions";

export type AdminSpaceEvent = Pick<
  DocaEvent,
  "id" | "title" | "slug" | "date" | "is_published"
>;

interface SpaceMeta {
  code: SpaceCode;
  title: string;
  subtitle: string;
}

const TERREO_SPACES: readonly SpaceMeta[] = [
  { code: "C1", title: "Camarote C1", subtitle: "Térreo • Lateral Bar / Banheiros" },
  { code: "C2", title: "Camarote C2", subtitle: "Térreo • Central Pista" },
  { code: "C3", title: "Camarote C3", subtitle: "Térreo • Ampliado Sob Escada" },
];

const MEZANINO_SPACES: readonly SpaceMeta[] = [
  { code: "C4", title: "Camarote C4", subtitle: "Mezanino • Piso Superior" },
  { code: "C5", title: "Camarote C5", subtitle: "Mezanino • Central Panorâmico" },
  { code: "C6", title: "Camarote C6", subtitle: "Mezanino • Reservado Superior" },
];

const BISTRO_SPACES: readonly SpaceMeta[] = [
  { code: "B1", title: "Bistrô B1", subtitle: "Topo da Pista • Frente C1/C2" },
  { code: "B2", title: "Bistrô B2", subtitle: "Ala Esquerda • Colado no Bar" },
  { code: "B3", title: "Bistrô B3", subtitle: "Ala Direita • Frente Palco / DJ" },
  { code: "B4", title: "Bistrô B4", subtitle: "Centro Absoluto da Pista" },
  { code: "B5", title: "Bistrô B5", subtitle: "Ala Esquerda • Colado no Bar" },
  { code: "B6", title: "Bistrô B6", subtitle: "Ala Direita • Frente Palco / DJ" },
  { code: "B7", title: "Bistrô B7", subtitle: "Base da Pista • Entrada / Caixa" },
];

const ALL_SPACES: readonly SpaceMeta[] = [
  ...TERREO_SPACES,
  ...MEZANINO_SPACES,
  ...BISTRO_SPACES,
];

const STATUS_BUTTONS: readonly {
  value: SpaceAvailabilityStatus;
  label: string;
  badgeLabel: string;
  activeClass: string;
  badgeClass: string;
  borderClass: string;
}[] = [
  {
    value: "available",
    label: "Disponível",
    badgeLabel: "● Disponível",
    activeClass: "border-emerald-400 bg-emerald-500 text-void font-bold",
    badgeClass: "border-emerald-400/55 bg-emerald-500/15 text-emerald-300",
    borderClass: "border-concrete",
  },
  {
    value: "negotiating",
    label: "Em Negociação",
    badgeLabel: "◐ Em Negociação",
    activeClass: "border-neon-orange bg-neon-orange text-void font-bold",
    badgeClass: "border-neon-orange/70 bg-neon-orange/15 text-neon-orange",
    borderClass: "border-neon-orange/55",
  },
  {
    value: "reserved",
    label: "Reservado / Esgotado",
    badgeLabel: "✕ Reservado",
    activeClass: "border-neon-red bg-neon-red text-void font-bold",
    badgeClass: "border-neon-red/70 bg-neon-red/15 text-neon-red",
    borderClass: "border-neon-red/60",
  },
];

function getStatusMeta(status: SpaceAvailabilityStatus) {
  return (
    STATUS_BUTTONS.find((item) => item.value === status) ?? STATUS_BUTTONS[0]
  );
}

function formatDateBr(dateStr: string): string {
  const parsed = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return dateStr;
  return parsed.toLocaleDateString("pt-BR");
}

function toWhatsAppLink(raw: string, spaceCode: SpaceCode, eventTitle: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10) return null;
  const full = digits.startsWith("55") && digits.length >= 12 ? digits : `55${digits}`;
  const msg = `Salve! Sobre a reserva do espaço ${spaceCode} na Doca Bar (${eventTitle}):`;
  return `https://wa.me/${full}?text=${encodeURIComponent(msg)}`;
}

function SpaceControlCard({
  eventId,
  eventTitle,
  space,
  initialRecord,
  onSaved,
}: {
  eventId: string;
  eventTitle: string;
  space: SpaceMeta;
  initialRecord?: EventSpaceStatus;
  onSaved: (record: EventSpaceStatus) => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [status, setStatus] = useState<SpaceAvailabilityStatus>(
    initialRecord?.status ?? "available",
  );
  const [clientName, setClientName] = useState(initialRecord?.client_name ?? "");
  const [clientWhatsapp, setClientWhatsapp] = useState(
    initialRecord?.client_whatsapp ?? "",
  );
  const [notes, setNotes] = useState(initialRecord?.notes ?? "");
  const [feedback, setFeedback] = useState<{
    type: "ok" | "error";
    text: string;
  } | null>(null);

  const meta = getStatusMeta(status);
  const waHref = toWhatsAppLink(clientWhatsapp, space.code, eventTitle);

  function persist(
    nextStatus: SpaceAvailabilityStatus,
    nextName = clientName,
    nextWhatsapp = clientWhatsapp,
    nextNotes = notes,
    savedText = "Atualizado",
  ) {
    const previousStatus = status;
    setStatus(nextStatus);
    setFeedback(null);

    startTransition(async () => {
      const res = await upsertSpaceStatus({
        eventId,
        spaceCode: space.code,
        status: nextStatus,
        clientName: nextName,
        clientWhatsapp: nextWhatsapp,
        notes: nextNotes,
      });

      if (!res.ok || !res.record) {
        setStatus(previousStatus);
        setFeedback({
          type: "error",
          text: res.error ?? "Erro ao atualizar espaço.",
        });
        return;
      }

      onSaved(res.record);
      setFeedback({ type: "ok", text: savedText });
      router.refresh();
    });
  }

  function handleSaveDetails(e: React.FormEvent) {
    e.preventDefault();
    persist(status, clientName, clientWhatsapp, notes, "Dados salvos");
  }

  function handleClearSpace() {
    if (!confirm(`Limpar cliente e voltar ${space.code} para Disponível?`)) {
      return;
    }
    setClientName("");
    setClientWhatsapp("");
    setNotes("");
    persist("available", "", "", "", "Espaço liberado");
  }

  return (
    <article
      className={`concrete flex flex-col justify-between border bg-ink p-4 transition-colors ${meta.borderClass}`}
    >
      <div>
        <div className="flex items-start justify-between gap-3 border-b border-concrete/80 pb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <span className="font-display text-3xl leading-none text-gold-bright">
                {space.code}
              </span>
              <h3 className="truncate font-display text-xl text-bone">
                {space.title}
              </h3>
            </div>
            <p className="stamp mt-1 text-[0.62rem] text-ash">
              {space.subtitle}
            </p>
          </div>

          <span
            className={`shrink-0 border px-2 py-1 font-tech text-[0.6rem] font-bold uppercase tracking-[0.14em] ${meta.badgeClass}`}
          >
            {meta.badgeLabel}
          </span>
        </div>

        {/* Botões 1-clique de status */}
        <div className="mt-3">
          <p className="stamp mb-2 text-[0.6rem] text-ash">
            Status em 1 clique
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {STATUS_BUTTONS.map((btn) => {
              const active = status === btn.value;
              return (
                <button
                  key={btn.value}
                  type="button"
                  disabled={isPending}
                  aria-pressed={active}
                  onClick={() =>
                    persist(
                      btn.value,
                      clientName,
                      clientWhatsapp,
                      notes,
                      `Status: ${btn.label}`,
                    )
                  }
                  className={`border px-2 py-2 text-center font-tech text-[0.6rem] uppercase tracking-[0.1em] transition-colors disabled:opacity-50 ${
                    active
                      ? btn.activeClass
                      : "border-concrete bg-void/80 text-bone/80 hover:border-neon-gold hover:text-gold-bright"
                  }`}
                >
                  {btn.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dados do cliente & observações */}
        <form onSubmit={handleSaveDetails} className="mt-4 space-y-2.5">
          <div>
            <label
              htmlFor={`client-name-${eventId}-${space.code}`}
              className="stamp mb-1 block text-[0.6rem]"
            >
              Nome do Cliente
            </label>
            <input
              id={`client-name-${eventId}-${space.code}`}
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Quem reservou / negociando"
              className="field !py-2 !text-sm"
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between gap-2">
              <label
                htmlFor={`client-wa-${eventId}-${space.code}`}
                className="stamp text-[0.6rem]"
              >
                WhatsApp
              </label>
              {waHref && (
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-tech text-[0.6rem] uppercase tracking-wider text-gold-bright hover:text-neon-orange"
                >
                  Chamar ↗
                </a>
              )}
            </div>
            <input
              id={`client-wa-${eventId}-${space.code}`}
              type="tel"
              value={clientWhatsapp}
              onChange={(e) => setClientWhatsapp(e.target.value)}
              placeholder="(11) 99999-9999"
              className="field !py-2 !text-sm"
            />
          </div>

          <div>
            <label
              htmlFor={`notes-${eventId}-${space.code}`}
              className="stamp mb-1 block text-[0.6rem]"
            >
              Observações
            </label>
            <textarea
              id={`notes-${eventId}-${space.code}`}
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Consumação acordada, combo, horário de chegada…"
              className="field resize-y !py-2 !text-sm"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={isPending}
              className="btn-gold flex-1 !px-3 !py-2 !text-xs"
            >
              {isPending ? "Salvando…" : "Salvar Dados"}
            </button>

            {(status !== "available" ||
              clientName.trim() !== "" ||
              clientWhatsapp.trim() !== "" ||
              notes.trim() !== "") && (
              <button
                type="button"
                disabled={isPending}
                onClick={handleClearSpace}
                className="btn-ghost neon-red !px-3 !py-2 !text-[0.65rem]"
              >
                Limpar
              </button>
            )}
          </div>
        </form>
      </div>

      {feedback && (
        <p
          role={feedback.type === "error" ? "alert" : "status"}
          className={`mt-3 border px-2.5 py-1.5 font-tech text-[0.65rem] uppercase tracking-wider ${
            feedback.type === "error"
              ? "border-neon-red bg-neon-red/10 text-neon-red"
              : "border-emerald-400/50 bg-emerald-500/10 text-emerald-300"
          }`}
        >
          {feedback.text}
        </p>
      )}
    </article>
  );
}

function SpaceSection({
  title,
  accent,
  subtitle,
  spaces,
  selectedEvent,
  recordsByCode,
  onSaved,
  gridClass,
}: {
  title: string;
  accent: string;
  subtitle: string;
  spaces: readonly SpaceMeta[];
  selectedEvent: AdminSpaceEvent;
  recordsByCode: Map<SpaceCode, EventSpaceStatus>;
  onSaved: (record: EventSpaceStatus) => void;
  gridClass: string;
}) {
  return (
    <section>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-concrete pb-3">
        <div>
          <p className="stamp text-ash">{subtitle}</p>
          <h2 className="mt-1 font-display text-3xl sm:text-4xl">
            <span className="text-bone">{title}</span>{" "}
            <span className={accent}>({spaces.map((s) => s.code).join(" · ")})</span>
          </h2>
        </div>
      </header>

      <div className={gridClass}>
        {spaces.map((space) => (
          <SpaceControlCard
            key={`${selectedEvent.id}-${space.code}`}
            eventId={selectedEvent.id}
            eventTitle={selectedEvent.title}
            space={space}
            initialRecord={recordsByCode.get(space.code)}
            onSaved={onSaved}
          />
        ))}
      </div>
    </section>
  );
}

export function CamarotesAdminClient({
  events,
  initialStatuses,
  today,
}: {
  events: AdminSpaceEvent[];
  initialStatuses: EventSpaceStatus[];
  today: string;
}) {
  const defaultEventId = useMemo(() => {
    const upcoming = events
      .filter((e) => e.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date));
    return upcoming[0]?.id ?? events[0]?.id ?? "";
  }, [events, today]);

  const [selectedEventId, setSelectedEventId] = useState<string>(defaultEventId);
  const [statusRows, setStatusRows] =
    useState<EventSpaceStatus[]>(initialStatuses);

  const selectedEvent = useMemo(
    () => events.find((e) => e.id === selectedEventId) ?? null,
    [events, selectedEventId],
  );

  const recordsByCode = useMemo(() => {
    const map = new Map<SpaceCode, EventSpaceStatus>();
    if (!selectedEvent) return map;
    for (const row of statusRows) {
      if (row.event_id === selectedEvent.id) {
        map.set(row.space_code, row);
      }
    }
    return map;
  }, [selectedEvent, statusRows]);

  const summary = useMemo(() => {
    let available = 0;
    let negotiating = 0;
    let reserved = 0;
    for (const space of ALL_SPACES) {
      const current = recordsByCode.get(space.code)?.status ?? "available";
      if (current === "reserved") reserved += 1;
      else if (current === "negotiating") negotiating += 1;
      else available += 1;
    }
    return { available, negotiating, reserved };
  }, [recordsByCode]);

  function handleRecordSaved(record: EventSpaceStatus) {
    setStatusRows((prev) => {
      const idx = prev.findIndex(
        (r) =>
          r.event_id === record.event_id && r.space_code === record.space_code,
      );
      if (idx === -1) return [...prev, record];
      const next = [...prev];
      next[idx] = record;
      return next;
    });
  }

  if (events.length === 0 || !selectedEvent) {
    return (
      <div className="fence border border-concrete px-6 py-16 text-center">
        <p className="font-display text-4xl text-bone/80">
          Nenhum evento cadastrado
        </p>
        <p className="stamp mt-3 text-ash">
          Abra uma noite primeiro para gerenciar camarotes e bistrôs.
        </p>
        <Link href="/dashboard/eventos" className="btn-street neon-orange mt-6">
          Ir para Eventos
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Seletor de Evento + Resumo da Noite */}
      <div className="glass-vip concrete border border-neon-gold/45 p-5 sm:p-6">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div>
            <label
              htmlFor="admin-camarotes-event"
              className="stamp mb-2 block text-gold-bright"
            >
              ▸ Selecione o Evento / Noite
            </label>
            <select
              id="admin-camarotes-event"
              value={selectedEvent.id}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="field bg-void/90 text-bone"
            >
              {events.map((e) => (
                <option key={e.id} value={e.id} className="bg-ink text-bone">
                  {formatDateBr(e.date)} — {e.title}
                  {!e.is_published ? " [OCULTO]" : ""}
                </option>
              ))}
            </select>
          </div>

          <dl className="grid grid-cols-3 gap-3 border-t border-concrete pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
            <div>
              <dt className="stamp text-[0.6rem] text-emerald-300">
                Disponíveis
              </dt>
              <dd className="font-display text-3xl text-emerald-300">
                {String(summary.available).padStart(2, "0")}
              </dd>
            </div>
            <div>
              <dt className="stamp text-[0.6rem] text-neon-orange">
                Negociação
              </dt>
              <dd className="font-display text-3xl text-neon-orange">
                {String(summary.negotiating).padStart(2, "0")}
              </dd>
            </div>
            <div>
              <dt className="stamp text-[0.6rem] text-neon-red">Reservados</dt>
              <dd className="font-display text-3xl text-neon-red">
                {String(summary.reserved).padStart(2, "0")}
              </dd>
            </div>
          </dl>
        </div>

        <p className="stamp mt-4 border-t border-concrete/70 pt-3 text-[0.62rem] text-ash">
          Camarote do Chefe é restrito à direção da casa (não exibido para reserva
          comum). Qualquer alteração aqui reflete ao vivo em{" "}
          <Link href="/camarotes" className="text-gold-bright hover:underline">
            /camarotes
          </Link>
          .
        </p>
      </div>

      {/* Camarotes Térreo C1-C3 */}
      <SpaceSection
        title="CAMAROTES TÉRREO"
        accent="neon neon-orange"
        subtitle="▸ Piso Térreo · Próximo à Pista e ao Bar"
        spaces={TERREO_SPACES}
        selectedEvent={selectedEvent}
        recordsByCode={recordsByCode}
        onSaved={handleRecordSaved}
        gridClass="grid grid-cols-1 gap-4 md:grid-cols-3"
      />

      {/* Camarotes Mezanino C4-C6 */}
      <SpaceSection
        title="CAMAROTES MEZANINO"
        accent="gold-vip"
        subtitle="▸ Piso Superior · Visão Elevada"
        spaces={MEZANINO_SPACES}
        selectedEvent={selectedEvent}
        recordsByCode={recordsByCode}
        onSaved={handleRecordSaved}
        gridClass="grid grid-cols-1 gap-4 md:grid-cols-3"
      />

      {/* Bistrôs de Pista B1-B7 */}
      <SpaceSection
        title="BISTRÔS DE PISTA"
        accent="neon neon-orange"
        subtitle="▸ Mesas Iluminadas · Bar & Palco"
        spaces={BISTRO_SPACES}
        selectedEvent={selectedEvent}
        recordsByCode={recordsByCode}
        onSaved={handleRecordSaved}
        gridClass="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
      />
    </div>
  );
}
