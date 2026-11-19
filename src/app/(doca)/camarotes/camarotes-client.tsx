"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

import type {
  PublicEventSpaceStatus,
  SpaceAvailabilityStatus,
  SpaceCode,
} from "@/lib/database.types";

export interface UpcomingEventOption {
  id: string;
  title: string;
  slug: string;
  date: string;
}

type CamaroteCode = "C1" | "C2" | "C3" | "C4" | "C5" | "C6";

interface CamaroteSpec {
  id: string;
  code: CamaroteCode;
  name: string;
  sector: "Térreo" | "Mezanino";
  sectorBadge: string;
  capacity: string;
  position: string;
  amenities: readonly string[];
  description: string;
  highlightTag?: string;
}

type BistroCode = "B1" | "B2" | "B3" | "B4" | "B5" | "B6" | "B7";
type BistroSelection = "any" | BistroCode;
type MapTab = "ambos" | "terreo" | "mezanino" | "poster";

const SPACE_STATUS_META: Record<
  SpaceAvailabilityStatus,
  {
    label: string;
    badgeClass: string;
  }
> = {
  available: {
    label: "● DISPONÍVEL NESTA NOITE",
    badgeClass: "border-neon-gold/60 bg-emerald-500/15 text-emerald-300",
  },
  negotiating: {
    label: "◐ EM NEGOCIAÇÃO / ÚLTIMA CHAMADA",
    badgeClass: "border-neon-orange/70 bg-neon-orange/15 text-neon-orange",
  },
  reserved: {
    label: "✕ RESERVADO NESTA NOITE",
    badgeClass: "border-neon-red/70 bg-neon-red/15 text-neon-red",
  },
};

interface BistroZoneGroup {
  range: string;
  label: string;
  detail: string;
  units: readonly BistroCode[];
}

const DOCA_WHATSAPP_NUMBER = "5511972723334";
const TOUR_3D_URL = "https://doca-tour-3d.vercel.app";

const CAMAROTES_TERREO: readonly CamaroteSpec[] = [
  {
    id: "c1",
    code: "C1",
    name: "Camarote C1 (Térreo)",
    sector: "Térreo",
    sectorBadge: "TÉRREO • LATERAL BAR",
    capacity: "Até 10 pessoas",
    position: "Próximo ao bar e banheiros",
    amenities: ["Banco estofado", "Mesinha de apoio", "Correntinha VIP"],
    description:
      "Posição prática no térreo para o bonde ficar colado no balcão e nos acessos de apoio sem perder o pulso da pista.",
  },
  {
    id: "c2",
    code: "C2",
    name: "Camarote C2 (Térreo Central)",
    sector: "Térreo",
    sectorBadge: "TÉRREO • CENTRAL",
    capacity: "Até 10 pessoas",
    position: "Posição central de frente para a pista",
    amenities: ["Banco estofado", "Mesinha de apoio", "Correntinha VIP"],
    description:
      "Visão frontal direta para o centro da pista e do palco, equilibrando conforto reservado e energia da galera.",
  },
  {
    id: "c3",
    code: "C3",
    name: "Camarote C3 (Térreo Ampliado)",
    sector: "Térreo",
    sectorBadge: "TÉRREO • AMPLIADO",
    capacity: "Até 10 pessoas",
    position: "Espaço extra ampliado sob a escada, próximo ao palco",
    amenities: ["Banco estofado", "Mesinha de apoio", "Correntinha VIP"],
    description:
      "Nosso maior espaço reservável no térreo: planta ampliada sob a escada do mezanino e a poucos passos do palco.",
    highlightTag: "Espaço Ampliado",
  },
];

const CAMAROTES_MEZANINO: readonly CamaroteSpec[] = [
  {
    id: "c4",
    code: "C4",
    name: "Camarote C4 (Mezanino)",
    sector: "Mezanino",
    sectorBadge: "MEZANINO • PISO SUPERIOR",
    capacity: "Até 10 pessoas",
    position: "Vista superior elevada da pista e do DJ",
    amenities: [
      "Banco estofado",
      "Mesinha de apoio",
      "Acesso reservado por correntinha VIP",
    ],
    description:
      "Camarote elevado no mezanino com leitura ampla do movimento da pista e contato visual direto com o comando do som.",
  },
  {
    id: "c5",
    code: "C5",
    name: "Camarote C5 (Mezanino Central)",
    sector: "Mezanino",
    sectorBadge: "MEZANINO • CENTRAL",
    capacity: "Até 10 pessoas",
    position: "Vista panorâmica central no piso superior",
    amenities: ["Banco estofado", "Mesinha de apoio", "Correntinha VIP"],
    description:
      "O eixo central do andar de cima: visão panorâmica da pista inteira, da cabine do DJ ao bar.",
    highlightTag: "Vista Panorâmica",
  },
  {
    id: "c6",
    code: "C6",
    name: "Camarote C6 (Mezanino)",
    sector: "Mezanino",
    sectorBadge: "MEZANINO • RESERVADO",
    capacity: "Até 10 pessoas",
    position: "Privacidade e visão privilegiada da pista",
    amenities: ["Banco estofado", "Mesinha de apoio", "Correntinha VIP"],
    description:
      "Combinação de privacidade no piso superior com ângulo privilegiado para curtir a noite no ritmo do seu grupo.",
  },
];

const BISTRO_ZONES: readonly BistroZoneGroup[] = [
  {
    range: "B2 · B5",
    label: "Ala Esquerda • Colados no Bar",
    detail: "Mesas iluminadas rentes ao balcão do bar na lateral esquerda da pista.",
    units: ["B2", "B5"],
  },
  {
    range: "B1 · B4 · B7",
    label: "Eixo Central da Pista",
    detail:
      "B1 na frente dos Camarotes C1/C2, B4 no centro absoluto da pista e B7 próximo à entrada e caixa.",
    units: ["B1", "B4", "B7"],
  },
  {
    range: "B3 · B6",
    label: "Ala Direita • Frente Palco / DJ",
    detail: "Posição privilegiada na lateral direita de frente para o Palco / DJ.",
    units: ["B3", "B6"],
  },
];

const BISTRO_OPTIONS: readonly { code: BistroCode; zone: string }[] = [
  { code: "B1", zone: "Topo da Pista • Frente Camarotes C1/C2" },
  { code: "B2", zone: "Ala Esquerda • Colado no Bar" },
  { code: "B3", zone: "Ala Direita • De frente para o Palco / DJ" },
  { code: "B4", zone: "Centro Absoluto da Pista" },
  { code: "B5", zone: "Ala Esquerda • Colado no Bar" },
  { code: "B6", zone: "Ala Direita • De frente para o Palco / DJ" },
  { code: "B7", zone: "Base da Pista • Próximo à Entrada e Caixa" },
];

const CHEFE_HIGHLIGHTS = [
  {
    title: "Mezanino Exclusivo • Até 10 Pessoas",
    detail: "Área nobre no piso superior reservada com controle rigoroso de entrada.",
    icon: "users" as const,
  },
  {
    title: "Lustre de Cristal",
    detail: "Ponto focal exclusivo com iluminação cênica própria no alto da casa.",
    icon: "sparkle" as const,
  },
  {
    title: "Sofá Preto + 2 Poltronas Vermelhas",
    detail: "Ambientação única que não se repete em nenhum outro camarote da Doca.",
    icon: "lounge" as const,
  },
  {
    title: "Grade Frontal Livre",
    detail: "A visão mais privilegiada e desobstruída de toda a pista e do palco.",
    icon: "eye" as const,
  },
] as const;

function formatDateShort(dateStr: string): string {
  if (!dateStr) return "";
  const parsed = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return dateStr;
  return parsed.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateBadge(dateStr: string): string {
  if (!dateStr) return "";
  const parsed = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return dateStr;
  return parsed.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

function buildWhatsAppHref(
  spaceLabel: string,
  nightContext: string,
  isReserved = false,
): string {
  const message = isReserved
    ? `Salve Doca! Vi que ${spaceLabel} consta como reservado (${nightContext}). Quero consultar lista de espera ou outro setor disponível.`
    : `Salve Doca! Quero consultar disponibilidade e condições para ${spaceLabel} (${nightContext}).`;
  return `https://wa.me/${DOCA_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

function CrownIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="m3 18 1.5-10 4.5 4 3-6 3 6 4.5-4L21 18H3Z" />
      <path d="M4 21h16" />
    </svg>
  );
}

function WhatsAppIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M21 11.5a8.5 8.5 0 0 1-12.5 7.5L3 20.5l1.6-5.2A8.5 8.5 0 1 1 21 11.5Z" />
      <path d="M9.5 9.2c.2-.4.5-.5.8-.5h.5c.2 0 .4.1.5.4l.7 1.6c.1.2.1.5-.1.7l-.5.6c.6 1 1.4 1.8 2.4 2.4l.6-.5c.2-.2.5-.2.7-.1l1.6.7c.3.1.4.3.4.5v.5c0 .3-.1.6-.5.8-.6.4-1.5.4-2.8-.1-1.9-.7-3.9-2.7-4.6-4.6-.5-1.3-.5-2.2-.1-2.8Z" />
    </svg>
  );
}

function Cube3DIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="m12 2 8.5 4.9v9.8L12 22l-8.5-5.3V6.9L12 2Z" />
      <path d="m12 22V12" />
      <path d="m20.5 6.9-8.5 5.1-8.5-5.1" />
    </svg>
  );
}

function FeatureGlyph({
  kind,
  className = "h-5 w-5",
}: {
  kind: "users" | "sparkle" | "lounge" | "eye";
  className?: string;
}) {
  if (kind === "users") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
      >
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    );
  }
  if (kind === "sparkle") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
      >
        <path d="M12 3v3" />
        <path d="M7 6h10l2 5H5l2-5Z" />
        <path d="M7 11v3" />
        <path d="M12 11v5" />
        <path d="M17 11v3" />
        <circle cx="12" cy="19" r="1.5" />
      </svg>
    );
  }
  if (kind === "lounge") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
      >
        <path d="M5 10V7a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v3" />
        <path d="M3 11a2 2 0 0 1 2-2h2v5h10V9h2a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5Z" />
        <path d="M5 18v2" />
        <path d="M19 18v2" />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function CamaroteCard({
  camarote,
  nightContext,
  liveStatus,
}: {
  camarote: CamaroteSpec;
  nightContext: string;
  liveStatus?: SpaceAvailabilityStatus;
}) {
  const isMezanino = camarote.sector === "Mezanino";
  const isReserved = liveStatus === "reserved";
  const accentBorder = isReserved
    ? "border-neon-red/55 hover:border-neon-red"
    : isMezanino
      ? "border-neon-gold/45 hover:border-gold-bright"
      : "border-concrete hover:border-neon-orange";
  const codeColor = isMezanino ? "gold-vip" : "text-neon-orange";
  const badgeStyle = isMezanino
    ? "border-neon-gold/40 bg-neon-gold/10 text-gold-bright"
    : "border-neon-orange/40 bg-neon-orange/10 text-neon-orange";
  const statusMeta = liveStatus ? SPACE_STATUS_META[liveStatus] : null;

  return (
    <article
      className={`concrete group relative flex flex-col justify-between overflow-hidden border bg-ink p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_18px_46px_-22px_rgba(212,175,55,0.45)] ${accentBorder}`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-25 blur-2xl transition-opacity duration-300 group-hover:opacity-45"
        style={{
          background: isMezanino
            ? "var(--color-neon-gold)"
            : "var(--color-neon-orange)",
        }}
      />

      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span
            className={`border px-2.5 py-1 font-tech text-[0.65rem] font-bold uppercase tracking-[0.2em] ${badgeStyle}`}
          >
            {camarote.sectorBadge}
          </span>
          <span className="stamp text-bone/80">{camarote.capacity}</span>
        </div>

        {statusMeta && (
          <div className="mt-3">
            <span
              className={`inline-block border px-2.5 py-1 font-tech text-[0.62rem] font-bold uppercase tracking-[0.16em] ${statusMeta.badgeClass}`}
            >
              {statusMeta.label}
            </span>
          </div>
        )}

        <div className="mt-5 flex items-baseline gap-3">
          <span
            className={`font-display text-5xl leading-none tracking-tight ${codeColor}`}
          >
            {camarote.code}
          </span>
          <div className="min-w-0">
            <h3 className="font-display text-2xl leading-tight text-bone">
              {camarote.name}
            </h3>
            {camarote.highlightTag && (
              <span className="mt-1 inline-block font-tech text-[0.65rem] uppercase tracking-[0.18em] text-gold-bright">
                ✦ {camarote.highlightTag}
              </span>
            )}
          </div>
        </div>

        <p className="mt-4 border-l-2 border-neon-gold/60 pl-3 text-base font-medium text-gold-bright/95">
          {camarote.position}
        </p>

        <p className="mt-3 text-sm leading-relaxed text-ash">
          {camarote.description}
        </p>

        <ul className="mt-5 flex flex-wrap gap-2">
          {camarote.amenities.map((item) => (
            <li
              key={item}
              className="border border-concrete bg-void/75 px-2.5 py-1 font-tech text-[0.66rem] uppercase tracking-[0.12em] text-bone/85"
            >
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="relative mt-6 border-t border-concrete/80 pt-5">
        <p className="mb-3 font-tech text-[0.65rem] uppercase tracking-[0.16em] text-ash">
          Condições e consumação variam conforme o evento
        </p>
        <div className="flex flex-col gap-2.5">
          <a
            href={buildWhatsAppHref(
              `o ${camarote.name}`,
              nightContext,
              isReserved,
            )}
            target="_blank"
            rel="noopener noreferrer"
            className={
              isReserved
                ? "btn-ghost neon-red w-full !px-4 !py-3 text-center !text-xs sm:!text-sm"
                : "btn-gold w-full !px-4 !py-3 text-center !text-sm"
            }
          >
            <WhatsAppIcon className="h-4 w-4 shrink-0" />
            <span>
              {isReserved
                ? "Reservado — Consultar Lista de Espera / Outro Setor"
                : "Consultar Condições no WhatsApp"}
            </span>
          </a>
          <a
            href={TOUR_3D_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost neon-gold w-full !px-4 !py-2.5 text-center text-xs"
          >
            <Cube3DIcon className="h-3.5 w-3.5 shrink-0" />
            <span>Ver no Tour 3D ↗</span>
          </a>
        </div>
      </div>
    </article>
  );
}

export function CamarotesClient({
  upcomingEvents,
  spaceStatuses = [],
}: {
  upcomingEvents: UpcomingEventOption[];
  spaceStatuses?: PublicEventSpaceStatus[];
}) {
  const [selectedNightKey, setSelectedNightKey] = useState<string>(() =>
    upcomingEvents.length > 0 ? upcomingEvents[0].id : "custom",
  );
  const [customDate, setCustomDate] = useState<string>("");
  const [selectedBistro, setSelectedBistro] = useState<BistroSelection>("any");
  const [activeMapTab, setActiveMapTab] = useState<MapTab>("ambos");

  const selectedEvent = useMemo(
    () => upcomingEvents.find((event) => event.id === selectedNightKey) ?? null,
    [upcomingEvents, selectedNightKey],
  );
  const selectedEventId = selectedEvent?.id ?? null;

  const statusBySpace = useMemo(() => {
    const map = new Map<SpaceCode, SpaceAvailabilityStatus>();
    if (!selectedEventId) return map;
    for (const row of spaceStatuses) {
      if (row.event_id === selectedEventId) {
        map.set(row.space_code, row.status);
      }
    }
    return map;
  }, [selectedEventId, spaceStatuses]);

  const getSpaceStatus = (code: SpaceCode): SpaceAvailabilityStatus =>
    statusBySpace.get(code) ?? "available";

  const selectedBistroStatus: SpaceAvailabilityStatus | undefined = useMemo(() => {
    if (!selectedEventId) return undefined;
    if (selectedBistro !== "any") {
      return statusBySpace.get(selectedBistro) ?? "available";
    }
    const allReserved = BISTRO_OPTIONS.every(
      (b) => (statusBySpace.get(b.code) ?? "available") === "reserved",
    );
    return allReserved ? "reserved" : undefined;
  }, [selectedEventId, selectedBistro, statusBySpace]);

  const nightSummary = useMemo(() => {
    if (selectedEvent) {
      return `${selectedEvent.title} • ${formatDateBadge(selectedEvent.date)}`;
    }
    if (customDate) {
      return `Data específica • ${formatDateShort(customDate)}`;
    }
    return "Outra data (a confirmar no atendimento)";
  }, [selectedEvent, customDate]);

  const nightWhatsAppContext = useMemo(() => {
    if (selectedEvent) {
      return `noite ${selectedEvent.title} em ${formatDateShort(selectedEvent.date)}`;
    }
    if (customDate) {
      return `data ${formatDateShort(customDate)}`;
    }
    return "outra data a confirmar";
  }, [selectedEvent, customDate]);

  const selectedBistroDetails = useMemo(() => {
    if (selectedBistro === "any") {
      return {
        display: "Qualquer bistrô disponível (B1 a B7)",
        whatsappLabel: "um Bistrô de Pista (qualquer unidade disponível B1 a B7)",
      };
    }
    const found = BISTRO_OPTIONS.find((item) => item.code === selectedBistro);
    return {
      display: `Bistrô ${selectedBistro} — ${found?.zone ?? "Pista"}`,
      whatsappLabel: `o Bistrô de Pista ${selectedBistro} (${found?.zone ?? "Pista"})`,
    };
  }, [selectedBistro]);

  return (
    <>
      {/* ================= HERO VIP OSTENTAÇÃO ================= */}
      <section className="concrete relative overflow-hidden border-b border-concrete">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 65% 55% at 14% 12%, rgba(255, 77, 0, 0.22), transparent 68%), radial-gradient(ellipse 58% 55% at 86% 18%, rgba(212, 175, 55, 0.22), transparent 70%), radial-gradient(ellipse 75% 45% at 50% 100%, rgba(255, 42, 61, 0.12), transparent 72%)",
          }}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -left-6 bottom-8 select-none font-tag text-6xl text-neon-orange/10 sm:text-8xl"
        >
          ouro &amp; pista
        </span>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-6 top-8 select-none font-tag text-5xl text-neon-gold/10 sm:text-7xl"
        >
          área vip
        </span>

        <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
          <div className="grid items-center gap-10 lg:grid-cols-[1.25fr_0.75fr]">
            <div>
              <p className="stamp animate-rise text-gold-bright">
                ▸ Área VIP · Doca Bar · Lapa SP
              </p>

              <h1 className="animate-rise mt-4 font-display text-[clamp(3.3rem,11vw,7.4rem)] leading-[0.82] tracking-tighter">
                <span className="chromatic block">CAMAROTES</span>
                <span className="gold-vip block">&amp; BISTRÔS VIP</span>
              </h1>

              <p className="animate-rise mt-6 max-w-xl text-lg leading-relaxed text-bone/80">
                Pista fervendo embaixo ou domínio completo lá de cima. Escolha
                entre os camarotes do Térreo, do Mezanino ou os bistrôs
                iluminados na pista e consulte as condições direto com a casa.
              </p>

              <div className="animate-rise mt-6 inline-flex items-start gap-3 border border-neon-gold/45 bg-void/75 px-4 py-3 backdrop-blur-sm">
                <span
                  aria-hidden="true"
                  className="mt-1.5 inline-block h-2 w-2 shrink-0 animate-flicker rounded-full bg-gold-bright"
                />
                <p className="text-sm leading-snug text-bone/90">
                  <strong className="font-tech uppercase tracking-wider text-gold-bright">
                    Condições dinâmicas:
                  </strong>{" "}
                  valores e consumação variam conforme o evento, atração e
                  horário da noite. Consulte diretamente no WhatsApp para a data
                  desejada.
                </p>
              </div>

              <dl className="mt-10 grid grid-cols-3 gap-4 border-t border-concrete pt-6 sm:gap-8">
                <div>
                  <dt className="stamp">Exclusivo</dt>
                  <dd className="gold-vip font-display text-4xl sm:text-5xl">
                    01
                  </dd>
                  <dd className="mt-1 text-xs text-ash">Camarote do Chefe</dd>
                </div>
                <div>
                  <dt className="stamp">Camarotes</dt>
                  <dd className="font-display text-4xl text-neon-orange sm:text-5xl">
                    06
                  </dd>
                  <dd className="mt-1 text-xs text-ash">C1–C3 Térreo · C4–C6</dd>
                </div>
                <div>
                  <dt className="stamp">Bistrôs</dt>
                  <dd className="font-display text-4xl text-gold-bright sm:text-5xl">
                    07
                  </dd>
                  <dd className="mt-1 text-xs text-ash">Pista B1 a B7</dd>
                </div>
              </dl>
            </div>

            <div className="mx-auto w-full max-w-[290px] sm:max-w-[330px]">
              <div className="glass-vip tape relative overflow-hidden p-3">
                <div className="relative aspect-[3/4] overflow-hidden border border-neon-gold/35 bg-void">
                  <Image
                    src="/id-visual/capa-camarotes.jfif"
                    alt="Selo VIP Camarotes Doca Bar com coroa e espumante dourado"
                    width={1536}
                    height={2752}
                    unoptimized
                    priority
                    className="h-full w-full object-cover object-center"
                  />
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-gradient-to-t from-void via-transparent to-void/30"
                  />
                  <div className="absolute inset-x-0 top-0 flex items-center justify-between px-3 py-2.5">
                    <span className="stamp text-[0.6rem] text-gold-bright">
                      DOCA VIP
                    </span>
                    <span className="stamp text-[0.6rem] text-neon-orange">
                      LAPA • SP
                    </span>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 p-4 text-center">
                    <p className="font-display text-xl tracking-wide text-bone">
                      MESAS &amp; CAMAROTES
                    </p>
                    <a
                      href={TOUR_3D_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1.5 font-tech text-[0.68rem] uppercase tracking-[0.2em] text-gold-bright transition-colors hover:text-neon-orange"
                    >
                      Explorar espaço em 3D ↗
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="hazard h-1 opacity-75" aria-hidden="true" />
      </section>

      {/* ================= SELETOR RÁPIDO DE NOITE ================= */}
      <section
        id="seletor-noite"
        className="border-b border-concrete bg-ink/85 py-6 backdrop-blur-md"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="glass-vip p-5 sm:p-6">
            <div className="grid gap-5 lg:grid-cols-[1.3fr_0.9fr] lg:items-end">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label
                    htmlFor="night-selector"
                    className="font-display text-2xl tracking-wide text-bone sm:text-3xl"
                  >
                    Para qual noite você quer consultar?
                  </label>
                  <span className="border border-neon-gold/40 bg-void/80 px-3 py-1 font-tech text-[0.66rem] uppercase tracking-[0.16em] text-gold-bright">
                    Ativo: {nightSummary}
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                  <select
                    id="night-selector"
                    value={selectedNightKey}
                    onChange={(e) => setSelectedNightKey(e.target.value)}
                    className="field bg-void/90 text-bone"
                  >
                    {upcomingEvents.map((event) => (
                      <option
                        key={event.id}
                        value={event.id}
                        className="bg-ink text-bone"
                      >
                        {formatDateShort(event.date)} — {event.title}
                      </option>
                    ))}
                    <option value="custom" className="bg-ink text-bone">
                      Outra data / Escolher data específica
                    </option>
                  </select>

                  {selectedNightKey === "custom" && (
                    <div className="sm:w-56">
                      <label htmlFor="custom-date-input" className="sr-only">
                        Escolher data específica
                      </label>
                      <input
                        id="custom-date-input"
                        type="date"
                        value={customDate}
                        onChange={(e) => setCustomDate(e.target.value)}
                        className="field bg-void/90 text-bone [color-scheme:dark]"
                      />
                    </div>
                  )}
                </div>

                {selectedNightKey === "custom" && !customDate && (
                  <p className="font-tech text-[0.68rem] uppercase tracking-[0.14em] text-neon-orange">
                    Selecione a data específica acima para já preencher o dia no
                    WhatsApp.
                  </p>
                )}
              </div>

              <div className="flex flex-col justify-between gap-3 border-t border-concrete/80 pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                <div>
                  <p className="stamp text-neon-orange">
                    ▸ Comemoração na Doca
                  </p>
                  <p className="mt-1 text-sm text-bone/80">
                    Tá fechando bonde de aniversário? Confira benefícios e
                    vantagens especiais para aniversariantes.
                  </p>
                </div>
                <Link
                  href="/aniversario"
                  className="btn-ghost neon-orange w-full !px-4 !py-2.5 text-center text-sm sm:w-auto sm:self-start"
                >
                  Atalho Aniversário →
                </Link>
              </div>
            </div>

            <nav
              aria-label="Atalhos das áreas VIP"
              className="mt-5 flex flex-wrap gap-2 border-t border-concrete/70 pt-4"
            >
              <a
                href="#chefe"
                className="stamp border border-neon-gold/45 bg-void/70 px-3 py-1.5 text-gold-bright transition-colors hover:border-gold-bright hover:bg-neon-gold/10"
              >
                Camarote do Chefe
              </a>
              <a
                href="#terreo"
                className="stamp border border-concrete bg-void/70 px-3 py-1.5 transition-colors hover:border-neon-orange hover:text-neon-orange"
              >
                Térreo (C1–C3)
              </a>
              <a
                href="#mezanino"
                className="stamp border border-concrete bg-void/70 px-3 py-1.5 transition-colors hover:border-neon-gold hover:text-gold-bright"
              >
                Mezanino (C4–C6)
              </a>
              <a
                href="#bistros"
                className="stamp border border-concrete bg-void/70 px-3 py-1.5 transition-colors hover:border-neon-orange hover:text-neon-orange"
              >
                Bistrôs (B1–B7)
              </a>
              <a
                href="#planta-tour"
                className="stamp border border-concrete bg-void/70 px-3 py-1.5 transition-colors hover:border-gold-bright hover:text-gold-bright"
              >
                Mapas 3D &amp; Tour 3D
              </a>
            </nav>
          </div>
        </div>
      </section>

      {/* ================= DESTAQUE TOPO: CAMAROTE DO CHEFE ================= */}
      <section id="chefe" className="mx-auto max-w-7xl scroll-mt-24 px-4 pt-14 sm:px-6">
        <div className="glass-vip fence relative overflow-hidden border-2 border-gold-bright/75 p-6 shadow-[0_0_55px_-18px_rgba(245,208,97,0.4)] sm:p-10">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-25 blur-3xl"
            style={{
              background:
                "radial-gradient(circle, var(--color-gold-bright), transparent 70%)",
            }}
          />

          <div className="relative">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 border border-gold-bright bg-void/90 px-3.5 py-1.5 font-tech text-xs font-bold uppercase tracking-[0.2em] text-gold-bright">
                <CrownIcon className="h-4 w-4 text-gold-bright" />
                ACESSO RESTRITO • CONVIDADOS &amp; SELEÇÃO DA CASA
              </span>
              <span className="stamp text-neon-red">
                Sem reserva aberta comum
              </span>
            </div>

            <div className="mt-6 grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
              <div>
                <h2 className="gold-vip font-display text-5xl leading-[0.86] sm:text-7xl">
                  CAMAROTE DO CHEFE
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-relaxed text-bone/85 sm:text-lg">
                  O ponto máximo de ostentação da DOCA BAR. Fica no mezanino
                  com estética própria e visão absoluta da casa — e justamente
                  por isso{" "}
                  <strong className="text-gold-bright">
                    não é reservado para qualquer pessoa e não possui formulário
                    ou reserva comum aberta
                  </strong>
                  . O acesso acontece exclusivamente por convite, seleção da
                  direção ou ações especiais da casa.
                </p>
              </div>

              <div className="flex flex-col items-start gap-3 border border-neon-gold/35 bg-void/80 p-5 lg:items-end lg:text-right">
                <p className="font-tech text-[0.7rem] uppercase tracking-[0.18em] text-ash">
                  Curioso para ver a vista de perto?
                </p>
                <a
                  href={TOUR_3D_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-gold w-full justify-center !px-6 !py-3.5 sm:w-auto"
                >
                  <Cube3DIcon className="h-4 w-4 shrink-0" />
                  <span>Conhecer no Tour 3D ↗</span>
                </a>
              </div>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {CHEFE_HIGHLIGHTS.map((item) => (
                <div
                  key={item.title}
                  className="border border-neon-gold/35 bg-void/85 p-4 backdrop-blur-sm"
                >
                  <div className="flex items-center gap-2.5 text-gold-bright">
                    <FeatureGlyph kind={item.icon} className="h-5 w-5 shrink-0" />
                    <h3 className="font-display text-lg leading-tight text-bone">
                      {item.title}
                    </h3>
                  </div>
                  <p className="mt-2 text-sm leading-snug text-ash">
                    {item.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ================= CAMAROTES TÉRREO (C1, C2, C3 AMPLIADO) ================= */}
      <section
        id="terreo"
        className="mx-auto max-w-7xl scroll-mt-24 px-4 pt-16 sm:px-6 sm:pt-20"
      >
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-concrete pb-5">
          <div>
            <p className="stamp text-neon-orange">
              ▸ Piso Térreo · Próximo à Pista e ao Bar
            </p>
            <h2 className="mt-2 font-display text-4xl sm:text-6xl">
              <span className="text-bone">CAMAROTES</span>{" "}
              <span className="neon neon-orange">TÉRREO</span>
            </h2>
          </div>
          <p className="stamp text-bone/75">
            C1, C2 e C3 Ampliado · Até 10 pessoas cada
          </p>
        </header>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {CAMAROTES_TERREO.map((camarote) => (
            <CamaroteCard
              key={camarote.id}
              camarote={camarote}
              nightContext={nightWhatsAppContext}
              liveStatus={
                selectedEventId ? getSpaceStatus(camarote.code) : undefined
              }
            />
          ))}
        </div>
      </section>

      {/* ================= CAMAROTES MEZANINO (C4, C5, C6) ================= */}
      <section
        id="mezanino"
        className="mx-auto max-w-7xl scroll-mt-24 px-4 pt-16 sm:px-6 sm:pt-20"
      >
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-concrete pb-5">
          <div>
            <p className="stamp text-gold-bright">
              ▸ Piso Superior · Visão Elevada
            </p>
            <h2 className="mt-2 font-display text-4xl sm:text-6xl">
              <span className="text-bone">CAMAROTES</span>{" "}
              <span className="gold-vip">MEZANINO</span>
            </h2>
          </div>
          <p className="stamp text-bone/75">
            C4, C5 e C6 · Até 10 pessoas cada
          </p>
        </header>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {CAMAROTES_MEZANINO.map((camarote) => (
            <CamaroteCard
              key={camarote.id}
              camarote={camarote}
              nightContext={nightWhatsAppContext}
              liveStatus={
                selectedEventId ? getSpaceStatus(camarote.code) : undefined
              }
            />
          ))}
        </div>
      </section>

      {/* ================= BISTRÔS DE PISTA (B1 A B7) ================= */}
      <section
        id="bistros"
        className="mx-auto max-w-7xl scroll-mt-24 px-4 pt-16 sm:px-6 sm:pt-20"
      >
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-concrete pb-5">
          <div>
            <p className="stamp text-neon-orange">
              ▸ No Coração da Pista · Iluminação Dedicada
            </p>
            <h2 className="mt-2 font-display text-4xl sm:text-6xl">
              <span className="text-bone">BISTRÔS</span>{" "}
              <span className="neon neon-orange">DE PISTA</span>{" "}
              <span className="gold-vip">(B1–B7)</span>
            </h2>
          </div>
          <p className="stamp text-bone/75">
            Mesas iluminadas coladas no bar e no DJ
          </p>
        </header>

        <div className="glass-vip concrete relative overflow-hidden border border-neon-orange/45 p-6 sm:p-8">
          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
            <div>
              <p className="text-base leading-relaxed text-bone/85 sm:text-lg">
                Mesas bistrô iluminadas posicionadas dentro da pista para quem
                quer apoio para copos e combos sem sair da energia do bar, do
                som e do DJ. Escolha a região ou unidade abaixo antes de chamar
                no atendimento.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {BISTRO_ZONES.map((zone) => {
                  const isZoneActive =
                    selectedBistro !== "any" &&
                    zone.units.includes(selectedBistro);
                  return (
                    <button
                      key={zone.range}
                      type="button"
                      onClick={() => setSelectedBistro(zone.units[0])}
                      className={`border p-4 text-left transition-colors ${
                        isZoneActive
                          ? "border-gold-bright bg-neon-gold/10"
                          : "border-concrete bg-void/75 hover:border-neon-orange/70"
                      }`}
                    >
                      <p className="font-display text-2xl text-gold-bright">
                        {zone.range}
                      </p>
                      <p className="mt-1 font-tech text-[0.7rem] uppercase tracking-[0.14em] text-neon-orange">
                        {zone.label}
                      </p>
                      <p className="mt-2 text-xs leading-relaxed text-ash">
                        {zone.detail}
                      </p>
                    </button>
                  );
                })}
              </div>

              <div className="mt-6">
                <p className="stamp mb-3 text-bone/80">
                  Escolha o bistrô desejado:
                </p>
                <div
                  role="group"
                  aria-label="Selecionar bistrô de pista"
                  className="space-y-2.5"
                >
                  <button
                    type="button"
                    aria-pressed={selectedBistro === "any"}
                    onClick={() => setSelectedBistro("any")}
                    className={`w-full border px-3.5 py-2.5 text-left font-tech text-xs uppercase tracking-[0.14em] transition-colors sm:w-auto ${
                      selectedBistro === "any"
                        ? "border-gold-bright bg-gold-bright font-bold text-void"
                        : "border-concrete bg-void/80 text-bone/80 hover:border-neon-gold hover:text-gold-bright"
                    }`}
                  >
                    Qualquer bistrô disponível
                  </button>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {BISTRO_OPTIONS.map((bistro) => {
                      const active = selectedBistro === bistro.code;
                      const bistroStatus = selectedEventId
                        ? getSpaceStatus(bistro.code)
                        : undefined;
                      const bistroMeta = bistroStatus
                        ? SPACE_STATUS_META[bistroStatus]
                        : null;
                      return (
                        <button
                          key={bistro.code}
                          type="button"
                          aria-pressed={active}
                          onClick={() => setSelectedBistro(bistro.code)}
                          className={`flex flex-wrap items-center justify-between gap-2 border px-3.5 py-2.5 text-left transition-colors ${
                            active
                              ? bistroStatus === "reserved"
                                ? "border-neon-red bg-neon-red/20 text-bone"
                                : "border-neon-orange bg-neon-orange text-void"
                              : bistroStatus === "reserved"
                                ? "border-neon-red/45 bg-void/80 text-bone/80 hover:border-neon-red"
                                : "border-concrete bg-void/80 text-bone hover:border-neon-orange hover:text-neon-orange"
                          }`}
                        >
                          <span className="font-display text-lg leading-none tracking-wider">
                            {bistro.code}
                          </span>
                          {bistroMeta && (
                            <span
                              className={`border px-2 py-0.5 font-tech text-[0.58rem] font-bold uppercase tracking-[0.12em] ${
                                active && bistroStatus !== "reserved"
                                  ? "border-void/35 bg-void/85 text-bone"
                                  : bistroMeta.badgeClass
                              }`}
                            >
                              {bistroMeta.label}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-between gap-5 border border-neon-gold/40 bg-void/85 p-5 sm:p-6">
              <div>
                <p className="stamp text-gold-bright">Resumo da consulta</p>
                <p className="mt-2 font-display text-3xl leading-tight text-bone">
                  {selectedBistroDetails.display}
                </p>
                {selectedBistroStatus && (
                  <div className="mt-3">
                    <span
                      className={`inline-block border px-2.5 py-1 font-tech text-[0.62rem] font-bold uppercase tracking-[0.16em] ${SPACE_STATUS_META[selectedBistroStatus].badgeClass}`}
                    >
                      {SPACE_STATUS_META[selectedBistroStatus].label}
                    </span>
                  </div>
                )}
                <p className="mt-2 text-sm text-ash">
                  Noite selecionada:{" "}
                  <span className="text-bone/90">{nightSummary}</span>
                </p>
                <p className="mt-3 border-t border-concrete/80 pt-3 font-tech text-[0.66rem] uppercase tracking-[0.15em] text-ash">
                  Sem preço fixo — valores e consumação variam conforme o
                  evento.
                </p>
              </div>

              <div className="flex flex-col gap-2.5">
                <a
                  href={buildWhatsAppHref(
                    selectedBistroDetails.whatsappLabel,
                    nightWhatsAppContext,
                    selectedBistroStatus === "reserved",
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={
                    selectedBistroStatus === "reserved"
                      ? "btn-ghost neon-red w-full !px-4 !py-3.5 text-center !text-xs sm:!text-sm"
                      : "btn-gold w-full !px-4 !py-3.5 text-center !text-sm"
                  }
                >
                  <WhatsAppIcon className="h-4 w-4 shrink-0" />
                  <span>
                    {selectedBistroStatus === "reserved"
                      ? "Reservado — Consultar Lista de Espera / Outro Setor"
                      : "Consultar Condições no WhatsApp"}
                  </span>
                </a>
                <a
                  href={TOUR_3D_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ghost neon-gold w-full !px-4 !py-2.5 text-center text-xs"
                >
                  <Cube3DIcon className="h-3.5 w-3.5 shrink-0" />
                  <span>Ver no Tour 3D ↗</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= MAPA OFICIAL 3D & TOUR 3D ================= */}
      <section
        id="planta-tour"
        className="mx-auto max-w-7xl scroll-mt-24 px-4 pt-16 sm:px-6 sm:pt-20"
      >
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-concrete pb-5">
          <div>
            <p className="stamp text-gold-bright">
              ▸ Orientação Espacial · Mapas Oficiais &amp; Visão Imersiva
            </p>
            <h2 className="mt-2 font-display text-4xl sm:text-6xl">
              <span className="text-bone">MAPA &amp;</span>{" "}
              <span className="gold-vip">TOUR 3D</span>
            </h2>
          </div>
          <p className="stamp text-bone/75">
            Localize cada setor antes de reservar
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-[1.35fr_0.65fr] lg:items-start">
          {/* Moldura técnica dos mapas 3D oficiais */}
          <div className="concrete border border-concrete p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <span className="stamp text-neon-orange">
                DOCA BAR // MAPAS OFICIAIS
              </span>
              <span className="border border-neon-gold/60 bg-neon-gold/10 px-3 py-1 font-tech text-[0.65rem] font-bold uppercase tracking-[0.14em] text-gold-bright">
                MAPA OFICIAL 3D DA CASA • TÉRREO &amp; MEZANINO
              </span>
            </div>

            {/* Seletor de visualização dos mapas */}
            <div
              role="tablist"
              aria-label="Visualização do Mapa Oficial 3D"
              className="mb-4 flex flex-wrap gap-2"
            >
              {(
                [
                  { id: "ambos", label: "Visão Dupla (Térreo + Mezanino)" },
                  { id: "terreo", label: "Térreo (Pista, C1–C3 & Bistrôs B1–B7)" },
                  { id: "mezanino", label: "Mezanino (Camarote do Chefe & C4–C6)" },
                  { id: "poster", label: "Poster Completo (9:16)" },
                ] as const
              ).map((tab) => {
                const isActive = activeMapTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveMapTab(tab.id)}
                    className={`border px-3 py-2 font-tech text-[0.68rem] uppercase tracking-[0.14em] transition-colors ${
                      isActive
                        ? "border-gold-bright bg-gold-bright font-bold text-void"
                        : "border-concrete bg-void/80 text-bone/85 hover:border-neon-gold hover:text-gold-bright"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="overflow-hidden border border-concrete bg-void p-2 sm:p-3">
              {activeMapTab === "ambos" && (
                <div className="space-y-4">
                  <div className="border border-neon-gold/35 bg-ink/70 p-2 sm:p-3">
                    <div className="mb-2 flex items-center justify-between gap-2 px-1">
                      <span className="font-tech text-[0.66rem] font-bold uppercase tracking-[0.16em] text-gold-bright">
                        ANDAR SUPERIOR • MEZANINO
                      </span>
                      <span className="font-tech text-[0.62rem] uppercase tracking-[0.14em] text-ash">
                        Chefe + C4, C5 e C6
                      </span>
                    </div>
                    <Image
                      src="/id-visual/mapa-mezanino.png"
                      alt="Mapa 3D oficial do Mezanino da Doca Bar exibindo Camarote do Chefe, Camarotes C4, C5 e C6, banheiros e escada"
                      width={2640}
                      height={1120}
                      unoptimized
                      className="h-auto w-full object-contain"
                    />
                  </div>

                  <div className="border border-neon-orange/35 bg-ink/70 p-2 sm:p-3">
                    <div className="mb-2 flex items-center justify-between gap-2 px-1">
                      <span className="font-tech text-[0.66rem] font-bold uppercase tracking-[0.16em] text-neon-orange">
                        ANDAR TÉRREO • PISTA &amp; PALCO
                      </span>
                      <span className="font-tech text-[0.62rem] uppercase tracking-[0.14em] text-ash">
                        C1, C2 e C3 + Bistrôs B1–B7
                      </span>
                    </div>
                    <Image
                      src="/id-visual/mapa-terreo.png"
                      alt="Mapa 3D oficial do Térreo da Doca Bar exibindo Camarotes C1, C2 e C3, Bistrôs B1 a B7, Bar, Palco DJ, Caixa e Entrada"
                      width={2400}
                      height={2560}
                      unoptimized
                      className="h-auto w-full object-contain"
                    />
                  </div>
                </div>
              )}

              {activeMapTab === "terreo" && (
                <div className="bg-ink/60 p-2">
                  <Image
                    src="/id-visual/mapa-terreo.png"
                    alt="Mapa 3D oficial do Térreo da Doca Bar exibindo Camarotes C1, C2 e C3, Bistrôs B1 a B7, Bar, Palco DJ, Caixa e Entrada"
                    width={2400}
                    height={2560}
                    unoptimized
                    className="h-auto w-full object-contain"
                  />
                </div>
              )}

              {activeMapTab === "mezanino" && (
                <div className="bg-ink/60 p-2">
                  <Image
                    src="/id-visual/mapa-mezanino.png"
                    alt="Mapa 3D oficial do Mezanino da Doca Bar exibindo Camarote do Chefe, Camarotes C4, C5 e C6, banheiros e escada"
                    width={2640}
                    height={1120}
                    unoptimized
                    className="h-auto w-full object-contain"
                  />
                </div>
              )}

              {activeMapTab === "poster" && (
                <div className="mx-auto max-w-lg bg-ink/60 p-2">
                  <Image
                    src="/id-visual/mapa-completo.png"
                    alt="Poster oficial completo Mapa da Casa Doca Bar (Mezanino e Térreo, Camarotes e Bistrôs)"
                    width={2160}
                    height={3840}
                    unoptimized
                    className="h-auto w-full object-contain"
                  />
                </div>
              )}
            </div>

            <div className="mt-4 grid gap-3 border-t border-concrete pt-4 sm:grid-cols-3">
              <div className="border border-concrete/80 bg-void/70 p-3">
                <p className="flex items-center gap-2 font-tech text-xs font-bold uppercase tracking-[0.14em] text-neon-orange">
                  <span className="inline-block h-2.5 w-2.5 bg-neon-orange" />
                  Térreo C1–C3
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-ash">
                  Camarotes 1, 2 e 3 (ampliado sob a escada ↑), ao lado dos
                  banheiros, bar à esquerda e palco/DJ à direita.
                </p>
              </div>

              <div className="border border-concrete/80 bg-void/70 p-3">
                <p className="flex items-center gap-2 font-tech text-xs font-bold uppercase tracking-[0.14em] text-gold-bright">
                  <span className="inline-block h-2.5 w-2.5 bg-gold-bright" />
                  Mezanino C4–C6 + Chefe
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-ash">
                  Andar superior pela escada à direita: Camarotes 4, 5 e 6 mais
                  o Camarote do Chefe com vista frontal para pista e palco.
                </p>
              </div>

              <div className="border border-concrete/80 bg-void/70 p-3">
                <p className="flex items-center gap-2 font-tech text-xs font-bold uppercase tracking-[0.14em] text-bone">
                  <span className="inline-block h-2.5 w-2.5 bg-bone" />
                  Bistrôs B1–B7
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-ash">
                  B1 frente C1/C2, B2 e B5 colados no Bar, B4 no centro da
                  pista, B3 e B6 frente Palco/DJ e B7 junto à Entrada/Caixa.
                </p>
              </div>
            </div>
          </div>

          {/* Card lateral Tour Interativo 3D */}
          <aside className="glass-vip flex flex-col justify-between gap-6 border border-neon-gold/50 p-6 sm:p-8">
            <div>
              <p className="stamp text-gold-bright">▸ Experiência Imersiva</p>
              <h3 className="gold-vip mt-3 font-display text-4xl leading-[0.88] sm:text-5xl">
                TOUR INTERATIVO 3D
              </h3>
              <p className="mt-4 text-base leading-relaxed text-bone/80">
                Quer conferir o ângulo real antes de fechar? Navegue pela Doca
                em 3D, suba para o Mezanino, compare a distância dos Bistrôs até
                o bar e veja onde fica o Camarote do Chefe.
              </p>

              <ul className="mt-5 space-y-2.5 border-t border-concrete/80 pt-5 text-sm text-bone/85">
                <li className="flex items-center gap-2.5">
                  <span className="h-1.5 w-1.5 shrink-0 bg-gold-bright" />
                  <span>Visão completa do Térreo e do Mezanino</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="h-1.5 w-1.5 shrink-0 bg-neon-orange" />
                  <span>Ângulos de pista, palco, bar e camarotes</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="h-1.5 w-1.5 shrink-0 bg-gold-bright" />
                  <span>Experiência externa dedicada sem pesar o site</span>
                </li>
              </ul>
            </div>

            <div className="space-y-3 border-t border-concrete/80 pt-5">
              <a
                href={TOUR_3D_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-gold w-full justify-center !px-5 !py-3.5 text-center"
              >
                <Cube3DIcon className="h-4 w-4 shrink-0" />
                <span>Abrir Tour Interativo 3D ↗</span>
              </a>
              <p className="text-center font-tech text-[0.64rem] uppercase tracking-[0.16em] text-ash">
                Abre em nova aba (doca-tour-3d.vercel.app)
              </p>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
