"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";

import type { DocaEvent } from "@/lib/database.types";

import { submitBirthdayLead } from "./actions";

export type GuestTierId = "ate_5" | "5_10" | "10_15" | "15_20" | "20_mais";

interface TierOption {
  id: GuestTierId;
  step: number;
  shortLabel: string;
  title: string;
  reward: string;
  note?: string;
}

const DOCA_WHATSAPP = "5511972723334";

const BIRTHDAY_TIERS: readonly TierOption[] = [
  {
    id: "ate_5",
    step: 1,
    shortLabel: "Base VIP",
    title: "Lista VIP Base (até 4 pagantes)",
    reward: "VIP Aniversariante + 1 Acompanhante VIP + 1 Drink da Casa",
  },
  {
    id: "5_10",
    step: 2,
    shortLabel: "5 Pagantes",
    title: "5 Pagantes (5 a 9)",
    reward: "+1 Drink da Casa",
    note: "2 Drinks + 2 VIPs no total",
  },
  {
    id: "10_15",
    step: 3,
    shortLabel: "10 Pagantes",
    title: "10 Pagantes (10 a 14)",
    reward: "1 Garrafa (Vodka ou Gin)",
  },
  {
    id: "15_20",
    step: 4,
    shortLabel: "15 Pagantes",
    title: "15 Pagantes (15 a 19)",
    reward: "1 Combo Completo (Vodka ou Gin)",
  },
  {
    id: "20_mais",
    step: 5,
    shortLabel: "20+ Raul Máximo",
    title: "20+ Pagantes (Nível Raul Máximo)",
    reward: "1 Camarote + 1 Combo (Vodka ou Gin)",
    note: "sujeito à disponibilidade",
  },
];

const UNDERAGE_MESSAGE =
  "Proibido menores de 18 anos na Doca Bar — obrigatório documento original com foto.";

type UpcomingEventItem = Pick<DocaEvent, "id" | "title" | "date" | "slug">;

function getSaoPauloTodayParts(): {
  year: number;
  month: number;
  day: number;
  iso: string;
} {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  const iso = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  return { year, month, day, iso };
}

function calculateAgeFromIso(
  birthIso: string,
  today: { year: number; month: number; day: number; iso: string },
): number | null {
  const match = birthIso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (year < 1900 || year > today.year || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const checkDate = new Date(Date.UTC(year, month - 1, day));
  if (
    checkDate.getUTCFullYear() !== year ||
    checkDate.getUTCMonth() !== month - 1 ||
    checkDate.getUTCDate() !== day
  ) {
    return null;
  }

  if (birthIso > today.iso) return -1;

  let age = today.year - year;
  if (today.month < month || (today.month === month && today.day < day)) {
    age -= 1;
  }
  return age;
}

function formatBrDate(isoDate: string): string {
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return isoDate;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

function formatWhatsappMask(rawValue: string): string {
  let digits = rawValue.replace(/\D/g, "");
  if (digits.length > 11 && digits.startsWith("55")) {
    digits = digits.slice(2);
  }
  digits = digits.slice(0, 11);

  if (digits.length === 0) return "";
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

function normalizeInstagram(rawValue: string): string {
  const cleaned = rawValue.trim().replace(/\s+/g, "").replace(/^@+/, "");
  return cleaned ? `@${cleaned}` : "";
}

interface SubmissionSuccessState {
  waUrl: string;
  savedToDb: boolean;
  dbNotice: string | null;
  popupBlocked: boolean;
  eventLabel: string;
  tierTitle: string;
  wantsCamarote: boolean;
  shareToken: string | null;
}

export function BirthdayClient({
  upcomingEvents,
}: {
  upcomingEvents: UpcomingEventItem[];
}) {
  const today = useMemo(() => getSaoPauloTodayParts(), []);

  const [guestTier, setGuestTier] = useState<GuestTierId>("ate_5");
  const [fullName, setFullName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [instagram, setInstagram] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [selectedEventKey, setSelectedEventKey] = useState<string>(
    upcomingEvents[0]?.id ?? "custom",
  );
  const [customDate, setCustomDate] = useState("");
  const [wantsCamarote, setWantsCamarote] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<SubmissionSuccessState | null>(
    null,
  );
  const [copiedListLink, setCopiedListLink] = useState(false);

  const selectedIndex = BIRTHDAY_TIERS.findIndex((t) => t.id === guestTier);
  const activeIndex = selectedIndex === -1 ? 0 : selectedIndex;
  const selectedTier = BIRTHDAY_TIERS[activeIndex];
  const unlockedTiers = BIRTHDAY_TIERS.slice(0, activeIndex + 1);

  const birthAge = useMemo(() => {
    if (!birthDate) return null;
    return calculateAgeFromIso(birthDate, today);
  }, [birthDate, today]);

  const isUnderage = birthAge !== null && birthAge >= 0 && birthAge < 18;
  const isFutureBirthDate = birthAge !== null && birthAge < 0;

  function handleSelectTier(tierId: GuestTierId) {
    setGuestTier(tierId);
    if (tierId === "20_mais") {
      setWantsCamarote(true);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const trimmedName = fullName.trim();
    const whatsappDigits = whatsapp.replace(/\D/g, "");
    const normalizedInstagram = normalizeInstagram(instagram);

    if (trimmedName.length < 2) {
      setFormError("Preencha seu nome completo para colocar na lista.");
      return;
    }

    if (whatsappDigits.length < 10 || whatsappDigits.length > 13) {
      setFormError("Informe um WhatsApp válido com DDD (ex: (11) 99999-9999).");
      return;
    }

    if (!normalizedInstagram) {
      setFormError("Informe seu @ do Instagram.");
      return;
    }

    const age = calculateAgeFromIso(birthDate, today);
    if (age === null || age < 0) {
      setFormError("Informe uma data de nascimento válida.");
      return;
    }

    if (age < 18) {
      setFormError(UNDERAGE_MESSAGE);
      return;
    }

    let eventId: string | null = null;
    let eventLabel = "";

    if (selectedEventKey === "custom") {
      if (!customDate) {
        setFormError("Escolha a data específica desejada para comemorar.");
        return;
      }
      eventLabel = `Data específica (${formatBrDate(customDate)})`;
    } else {
      const foundEvent = upcomingEvents.find((ev) => ev.id === selectedEventKey);
      if (!foundEvent) {
        setFormError("Selecione o evento ou escolha uma data específica.");
        return;
      }
      eventId = foundEvent.id;
      eventLabel = `${foundEvent.title} (${formatBrDate(foundEvent.date)})`;
    }

    setIsSubmitting(true);

    const result = await submitBirthdayLead({
      full_name: trimmedName,
      whatsapp: whatsappDigits,
      instagram: normalizedInstagram,
      birth_date: birthDate,
      event_id: eventId,
      event_label: eventLabel,
      guest_tier: selectedTier.id,
      wants_camarote: wantsCamarote,
    });

    setIsSubmitting(false);

    if (
      !result.ok &&
      result.error?.toLowerCase().includes("menores de 18")
    ) {
      setFormError(UNDERAGE_MESSAGE);
      return;
    }

    const shareToken = result.ok && result.shareToken ? result.shareToken : null;
    const guestListUrl = shareToken
      ? `${window.location.origin}/aniversario/lista/${shareToken}`
      : null;

    const benefitsLines = unlockedTiers
      .map(
        (tier) =>
          `• ${tier.shortLabel}: ${tier.reward}${tier.note ? ` (${tier.note})` : ""}`,
      )
      .join("\n");

    const whatsappMessage = [
      "🎂 *LISTA DE ANIVERSÁRIO VIP — DOCA BAR*",
      "",
      `*Nome:* ${trimmedName}`,
      `*WhatsApp:* ${whatsapp}`,
      `*Instagram:* ${normalizedInstagram}`,
      `*Data de Nascimento:* ${formatBrDate(birthDate)} (+18)`,
      `*Evento / Data:* ${eventLabel}`,
      `*Meta do Bonde:* ${selectedTier.title}`,
      "",
      "*Benefícios Desbloqueados:*",
      benefitsLines,
      "",
      `*Interesse em Camarote:* ${wantsCamarote ? "Sim, quero cotar reserva de Camarote!" : "Não por enquanto"}`,
      ...(guestListUrl ? ["", `*Link da Lista Nominal:* ${guestListUrl}`] : []),
    ].join("\n");

    const waUrl = `https://wa.me/${DOCA_WHATSAPP}?text=${encodeURIComponent(
      whatsappMessage,
    )}`;

    const openedWindow = window.open(waUrl, "_blank", "noopener,noreferrer");

    setCopiedListLink(false);
    setSubmitted({
      waUrl,
      savedToDb: result.ok,
      dbNotice: result.ok ? null : (result.error ?? null),
      popupBlocked: !openedWindow,
      eventLabel,
      tierTitle: selectedTier.title,
      wantsCamarote,
      shareToken,
    });
  }

  async function handleCopyListLink(shareToken: string) {
    const fullUrl = `${window.location.origin}/aniversario/lista/${shareToken}`;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopiedListLink(true);
      setTimeout(() => setCopiedListLink(false), 2500);
    } catch {
      setCopiedListLink(false);
    }
  }

  const progressPercentage = ((activeIndex + 1) / BIRTHDAY_TIERS.length) * 100;

  return (
    <div className="space-y-12">
      {/* ================= 01. ESCADINHA DE BENEFÍCIOS ================= */}
      <section id="escadinha" aria-labelledby="escadinha-heading" className="scroll-mt-24">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-concrete pb-4">
          <div>
            <p className="stamp text-neon-orange">01 · Toque no degrau do seu bonde</p>
            <h2
              id="escadinha-heading"
              className="mt-2 font-display text-4xl sm:text-5xl"
            >
              <span className="text-bone">ESCADINHA DE</span>{" "}
              <span className="gold-vip">BENEFÍCIOS</span>
            </h2>
          </div>

          <div className="glass-vip px-4 py-2 text-right">
            <p className="stamp text-[0.65rem] text-neon-gold">Nível selecionado</p>
            <p className="font-display text-2xl text-gold-bright">
              {selectedTier.step} / {BIRTHDAY_TIERS.length} · {selectedTier.shortLabel}
            </p>
          </div>
        </div>

        {/* Medidor visual da escalada */}
        <div className="mb-5">
          <div className="h-2 w-full overflow-hidden border border-concrete bg-void">
            <div
              className="h-full bg-gradient-to-r from-neon-orange via-neon-gold to-gold-bright transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <p className="stamp mt-2 text-[0.68rem] text-ash">
            Quanto mais amigos pagantes na sua lista, mais prêmios acendem na pista.
          </p>
        </div>

        {/* 5 degraus clicáveis */}
        <div className="grid gap-3">
          {BIRTHDAY_TIERS.map((tier, index) => {
            const isUnlocked = index <= activeIndex;
            const isSelected = index === activeIndex;

            return (
              <button
                key={tier.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => handleSelectTier(tier.id)}
                className={`group relative flex w-full cursor-pointer flex-col gap-3 border p-4 text-left transition-all duration-200 sm:flex-row sm:items-center sm:justify-between sm:p-5 ${
                  isSelected
                    ? "border-neon-gold bg-gradient-to-r from-neon-orange/25 via-neon-gold/15 to-smoke shadow-[0_0_30px_-8px_rgba(245,208,97,0.55)]"
                    : isUnlocked
                      ? "border-neon-orange/70 bg-gradient-to-r from-neon-orange/15 via-ink to-smoke shadow-[0_0_20px_-10px_rgba(255,77,0,0.5)]"
                      : "border-concrete bg-ink/85 opacity-70 hover:border-neon-orange/60 hover:opacity-100"
                }`}
              >
                <div className="flex items-start gap-3 sm:items-center sm:gap-4">
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center border font-display text-xl transition-colors sm:h-12 sm:w-12 sm:text-2xl ${
                      isSelected
                        ? "border-gold-bright bg-gradient-to-br from-gold-bright to-neon-gold text-void"
                        : isUnlocked
                          ? "border-neon-orange bg-neon-orange text-void"
                          : "border-concrete bg-void text-ash group-hover:border-neon-orange/70 group-hover:text-neon-orange"
                    }`}
                  >
                    0{tier.step}
                  </span>

                  <div className="min-w-0">
                    <p
                      className={`font-tech text-[0.7rem] font-bold uppercase tracking-[0.2em] ${
                        isSelected
                          ? "text-gold-bright"
                          : isUnlocked
                            ? "text-neon-orange"
                            : "text-ash"
                      }`}
                    >
                      {tier.title}
                    </p>
                    <p
                      className={`mt-1 font-display text-2xl leading-tight sm:text-3xl ${
                        isUnlocked ? "text-bone" : "text-bone/75"
                      }`}
                    >
                      {tier.reward}
                    </p>
                    {tier.note && (
                      <p
                        className={`mt-1 font-tech text-xs ${
                          isUnlocked ? "text-gold-bright" : "text-ash"
                        }`}
                      >
                        * {tier.note}
                      </p>
                    )}
                  </div>
                </div>

                <span
                  className={`inline-flex w-fit shrink-0 items-center border px-3 py-1 font-tech text-[0.65rem] font-bold uppercase tracking-[0.18em] ${
                    isSelected
                      ? "border-gold-bright/70 bg-gold-bright/20 text-gold-bright"
                      : isUnlocked
                        ? "border-neon-orange/60 bg-neon-orange/15 text-neon-orange"
                        : "border-concrete bg-void/80 text-ash group-hover:border-neon-orange/50 group-hover:text-bone"
                  }`}
                >
                  {isSelected
                    ? "Meta do bonde"
                    : isUnlocked
                      ? "Desbloqueado"
                      : "Tocar p/ liberar"}
                </span>
              </button>
            );
          })}
        </div>

        {/* Resumo vivo do que foi desbloqueado */}
        <div className="glass-vip mt-5 p-4 sm:p-5">
          <p className="stamp text-neon-gold">
            Benefícios acesos no nível {selectedTier.step} ({selectedTier.title}):
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {unlockedTiers.map((tier) => (
              <li
                key={tier.id}
                className="border border-neon-gold/40 bg-void/75 px-3 py-1.5 text-sm text-bone"
              >
                <span className="font-tech text-xs font-bold uppercase text-neon-orange">
                  {tier.shortLabel}:
                </span>{" "}
                <span>{tier.reward}</span>
                {tier.note && (
                  <span className="ml-1 text-xs text-gold-bright">
                    ({tier.note})
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ================= 02. FORMULÁRIO ULTRA-ENXUTO ================= */}
      <section
        id="lista-aniversario"
        aria-labelledby="form-heading"
        className="scroll-mt-24"
      >
        <div className="mb-6 border-b border-concrete pb-4">
          <p className="stamp text-neon-orange">02 · Cadastro prévio obrigatório</p>
          <h2 id="form-heading" className="mt-2 font-display text-4xl sm:text-5xl">
            <span className="text-bone">GARANTIR</span>{" "}
            <span className="neon neon-orange">MINHA LISTA</span>
          </h2>
        </div>

        {submitted ? (
          <div className="glass-vip tape p-6 sm:p-8">
            <p className="stamp text-gold-bright">
              {submitted.savedToDb
                ? "✓ Cadastro salvo na Doca Bar"
                : "✓ Dados prontos para envio"}
            </p>
            <h3 className="mt-2 font-display text-4xl text-bone sm:text-5xl">
              <span className="gold-vip">LISTA PRONTA</span> NO WHATSAPP
            </h3>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-bone/85">
              {submitted.popupBlocked
                ? "Seu navegador bloqueou a abertura automática do WhatsApp. Toque no botão dourado abaixo para enviar sua lista diretamente para a nossa equipe:"
                : "Abrimos o WhatsApp com os dados do seu aniversário preenchidos. Caso não tenha aberto na nova aba, use o botão abaixo:"}
            </p>

            {submitted.dbNotice && (
              <p className="mt-3 border border-neon-orange/50 bg-neon-orange/10 px-3 py-2 font-tech text-xs text-neon-orange">
                {submitted.dbNotice}
              </p>
            )}

            <dl className="mt-6 grid gap-3 border-y border-concrete/80 py-4 text-sm sm:grid-cols-3">
              <div>
                <dt className="stamp text-[0.65rem]">Evento / Data</dt>
                <dd className="mt-1 font-medium text-bone">
                  {submitted.eventLabel}
                </dd>
              </div>
              <div>
                <dt className="stamp text-[0.65rem]">Meta do Bonde</dt>
                <dd className="mt-1 font-medium text-gold-bright">
                  {submitted.tierTitle}
                </dd>
              </div>
              <div>
                <dt className="stamp text-[0.65rem]">Camarote</dt>
                <dd className="mt-1 font-medium text-bone">
                  {submitted.wantsCamarote
                    ? "Sim, cotação solicitada"
                    : "Não selecionado"}
                </dd>
              </div>
            </dl>

            {submitted.shareToken && (
              <div className="mt-6 border border-neon-gold/60 bg-void/80 p-4 sm:p-5">
                <p className="stamp text-neon-gold">
                  Próximo passo · Monte a lista nominal dos seus convidados
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-bone/85">
                  Já geramos o link exclusivo da sua lista para a portaria da Doca Bar.
                  Cadastre agora os nomes dos seus amigos (um por um ou colando a lista
                  toda de uma vez):
                </p>
                <p className="mt-2 truncate border border-concrete bg-ink px-3 py-2 font-tech text-xs text-gold-bright">
                  /aniversario/lista/{submitted.shareToken}
                </p>

                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    href={`/aniversario/lista/${submitted.shareToken}`}
                    className="btn-gold w-full text-center sm:w-auto"
                  >
                    Cadastrar Nomes da Minha Lista VIP →
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleCopyListLink(submitted.shareToken!)}
                    className="btn-ghost neon-gold w-full sm:w-auto"
                  >
                    {copiedListLink ? "Link copiado ✓" : "Copiar link da lista"}
                  </button>
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href={submitted.waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={
                  submitted.shareToken
                    ? "btn-street neon-orange w-full text-center sm:w-auto"
                    : "btn-gold w-full text-center sm:w-auto"
                }
              >
                Abrir WhatsApp da Doca →
              </a>
              <button
                type="button"
                onClick={() => setSubmitted(null)}
                className="btn-ghost neon-orange w-full sm:w-auto"
              >
                Editar / Novo cadastro
              </button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            noValidate
            className="glass-vip tape space-y-5 p-5 sm:p-8"
          >
            {/* LINHA 1: Nome completo + WhatsApp com DDD */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="bday-full-name" className="stamp mb-2 block text-bone">
                  Nome completo *
                </label>
                <input
                  id="bday-full-name"
                  name="full_name"
                  type="text"
                  required
                  autoComplete="name"
                  placeholder="Seu nome completo"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="field"
                />
              </div>

              <div>
                <label htmlFor="bday-whatsapp" className="stamp mb-2 block text-bone">
                  WhatsApp com DDD *
                </label>
                <input
                  id="bday-whatsapp"
                  name="whatsapp"
                  type="tel"
                  inputMode="tel"
                  required
                  autoComplete="tel"
                  placeholder="(11) 99999-9999"
                  value={whatsapp}
                  onChange={(e) =>
                    setWhatsapp(formatWhatsappMask(e.target.value))
                  }
                  className="field"
                />
              </div>
            </div>

            {/* LINHA 2: Instagram @ + Data de nascimento (+18 real-time) */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="bday-instagram" className="stamp mb-2 block text-bone">
                  Instagram @ *
                </label>
                <input
                  id="bday-instagram"
                  name="instagram"
                  type="text"
                  required
                  placeholder="@seuperfil"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  onBlur={() => {
                    if (instagram.trim()) {
                      setInstagram(normalizeInstagram(instagram));
                    }
                  }}
                  className="field"
                />
              </div>

              <div>
                <label htmlFor="bday-birth-date" className="stamp mb-2 block text-bone">
                  Data de nascimento * (+18)
                </label>
                <input
                  id="bday-birth-date"
                  name="birth_date"
                  type="date"
                  required
                  max={today.iso}
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  aria-invalid={isUnderage || isFutureBirthDate}
                  className={`field ${
                    isUnderage || isFutureBirthDate
                      ? "!border-neon-red focus:!shadow-[0_0_0_1px_#ff2a3d,0_0_20px_rgba(255,42,61,0.3)]"
                      : ""
                  }`}
                />
                {isUnderage && (
                  <p
                    role="alert"
                    className="mt-2 font-tech text-xs font-bold text-neon-red"
                  >
                    {UNDERAGE_MESSAGE}
                  </p>
                )}
                {isFutureBirthDate && (
                  <p
                    role="alert"
                    className="mt-2 font-tech text-xs font-bold text-neon-red"
                  >
                    Data de nascimento no futuro não é válida.
                  </p>
                )}
              </div>
            </div>

            {/* LINHA 3: Evento / Data escolhida + Toggle Camarote */}
            <div className="space-y-4">
              <div
                className={`grid gap-4 ${
                  selectedEventKey === "custom" ? "sm:grid-cols-2" : ""
                }`}
              >
                <div>
                  <label htmlFor="bday-event" className="stamp mb-2 block text-bone">
                    Evento / Data escolhida *
                  </label>
                  <select
                    id="bday-event"
                    name="event_id"
                    required
                    value={selectedEventKey}
                    onChange={(e) => setSelectedEventKey(e.target.value)}
                    className="field"
                  >
                    {upcomingEvents.map((ev) => (
                      <option key={ev.id} value={ev.id} className="bg-void text-bone">
                        {ev.title} — {formatBrDate(ev.date)}
                      </option>
                    ))}
                    <option value="custom" className="bg-void text-gold-bright">
                      Outra data / Escolher data específica
                    </option>
                  </select>
                </div>

                {selectedEventKey === "custom" && (
                  <div>
                    <label
                      htmlFor="bday-custom-date"
                      className="stamp mb-2 block text-bone"
                    >
                      Data específica *
                    </label>
                    <input
                      id="bday-custom-date"
                      name="custom_date"
                      type="date"
                      required
                      min={today.iso}
                      value={customDate}
                      onChange={(e) => setCustomDate(e.target.value)}
                      className="field"
                    />
                  </div>
                )}
              </div>

              <label className="flex cursor-pointer items-center gap-3 border border-neon-gold/35 bg-void/70 px-4 py-3 transition-colors hover:border-neon-gold">
                <input
                  type="checkbox"
                  name="wants_camarote"
                  checked={wantsCamarote}
                  onChange={(e) => setWantsCamarote(e.target.checked)}
                  className="h-4 w-4 shrink-0 accent-neon-gold"
                />
                <span className="text-sm leading-snug text-bone">
                  Quero cotar reserva de Camarote para o meu bonde
                </span>
                {guestTier === "20_mais" && (
                  <span className="ml-auto shrink-0 border border-neon-gold/50 bg-neon-gold/15 px-2 py-0.5 font-tech text-[0.65rem] font-bold uppercase tracking-wider text-gold-bright">
                    20+ VIP
                  </span>
                )}
              </label>
            </div>

            {formError && (
              <p
                role="alert"
                className="border border-neon-red bg-neon-red/12 px-4 py-3 font-tech text-sm font-semibold text-neon-red"
              >
                {formError}
              </p>
            )}

            <div className="pt-1">
              <button
                type="submit"
                disabled={isSubmitting || isUnderage || isFutureBirthDate}
                className="btn-gold w-full py-4 text-center text-base disabled:cursor-not-allowed disabled:opacity-45 sm:text-lg"
              >
                {isSubmitting
                  ? "Registrando sua lista VIP…"
                  : "Garantir Lista VIP e Ir para o WhatsApp →"}
              </button>
              <p className="stamp mt-3 text-center text-[0.65rem] text-ash">
                Envio gratuito · A confirmação final do bonde rola direto no WhatsApp da Doca
              </p>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
