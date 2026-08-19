"use server";

import { getPepperCreators, getPepperServices } from "@/lib/pepper/data";
import { estimateQuote } from "@/lib/pepper/pricing";
import type {
  PepperQuotePayload,
  PepperUrgency,
  PepperUsage,
} from "@/lib/pepper/types";
import { createClient } from "@/utils/supabase/server";

/**
 * Recebe o lead do configurador público (`/pepper/orcamento`).
 *
 * Uma Server Action é um POST aberto contra a rota: qualquer um manda o
 * corpo que quiser, sem passar pela tela. Então nada do que chega aqui é
 * confiável — nem o formato, nem os valores, e muito menos o preço.
 */

export type QuoteRequestInput = {
  contactName: string;
  company: string;
  email: string;
  whatsapp: string;
  briefing: string;
  payload: PepperQuotePayload;
};

export type QuoteResult = {
  error?: string;
  success?: boolean;
  id?: string;
  min?: number;
  max?: number;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

const URGENCIES: readonly PepperUrgency[] = ["flex", "padrao", "expresso"];
const USAGES: readonly PepperUsage[] = ["organico", "paid30", "paid90"];

/** Teto por serviço — igual ao do slider da tela. */
const MAX_QTY = 12;

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function solicitarOrcamento(
  input: QuoteRequestInput,
): Promise<QuoteResult> {
  const raw: Partial<QuoteRequestInput> = input ?? {};
  const rawPayload: Partial<PepperQuotePayload> = raw.payload ?? {};

  /* ---- contato ------------------------------------------------------ */

  const contactName = text(raw.contactName, 120);
  if (contactName.length < 2) {
    return { error: "Escreve seu nome pra gente saber com quem falar." };
  }

  const email = text(raw.email, 160).toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return { error: "Esse e-mail não parece válido." };
  }

  const company = text(raw.company, 120);
  const briefing = text(raw.briefing, 4000);

  // Guardamos só os dígitos: o cliente digita com máscara, traço, parêntese
  // e isso vira ruído na hora de discar.
  const whatsapp = text(raw.whatsapp, 32).replace(/\D/g, "");
  if (whatsapp && (whatsapp.length < 10 || whatsapp.length > 13)) {
    return { error: "WhatsApp inválido — inclui o DDD." };
  }

  /* ---- seleção ------------------------------------------------------ */

  const [{ data: services }, { data: creators }] = await Promise.all([
    getPepperServices(),
    getPepperCreators(),
  ]);

  // Só slugs que existem na tabela entram, com quantidade inteira e no teto.
  const selectedServices: Record<string, number> = {};
  const rawServices = rawPayload.services;
  if (rawServices && typeof rawServices === "object") {
    const bag = rawServices as Record<string, unknown>;
    for (const service of services) {
      const value = bag[service.slug];
      if (typeof value !== "number" || !Number.isFinite(value)) continue;
      const qty = Math.min(MAX_QTY, Math.floor(value));
      if (qty > 0) selectedServices[service.slug] = qty;
    }
  }

  if (Object.keys(selectedServices).length === 0) {
    return { error: "Escolhe pelo menos um serviço pra gente orçar." };
  }

  const rawCreatorIds = Array.isArray(rawPayload.creatorIds)
    ? rawPayload.creatorIds
    : [];
  const creatorIds = creators
    .filter((creator) => rawCreatorIds.includes(creator.id))
    .map((creator) => creator.id);

  const urgency: PepperUrgency = URGENCIES.includes(
    rawPayload.urgency as PepperUrgency,
  )
    ? (rawPayload.urgency as PepperUrgency)
    : "padrao";

  const usage: PepperUsage = USAGES.includes(rawPayload.usage as PepperUsage)
    ? (rawPayload.usage as PepperUsage)
    : "organico";

  const payload: PepperQuotePayload = {
    services: selectedServices,
    creatorIds,
    urgency,
    usage,
    exclusivity: rawPayload.exclusivity === true,
  };

  /* ---- preço -------------------------------------------------------- */

  /**
   * O preço é recalculado aqui, sempre, e nunca lido do formulário.
   *
   * `estimate_min` / `estimate_max` viram a base da negociação com o
   * cliente — se viessem no corpo do POST, bastaria um curl para registrar
   * um lead de R$ 1 e cobrar a Pepper por ele depois. Rodando
   * `estimateQuote` com a tabela de serviços e o casting lidos do banco, o
   * que entra em `pepper_quotes` é auditável pela mesma função pura que
   * desenhou o número na tela — e um serviço que mudou de preço no meio do
   * preenchimento é gravado pelo valor de agora, não pelo da aba aberta há
   * duas horas.
   */
  const breakdown = estimateQuote(payload, services, creators);

  /* ---- gravação ----------------------------------------------------- */

  // O id é gerado aqui em vez de vir do `returning` do insert: a RLS de
  // `pepper_quotes` libera INSERT para o público mas SELECT só para admin,
  // então pedir a linha de volta falharia justamente para o visitante.
  const id = crypto.randomUUID();

  const supabase = await createClient();
  const { error } = await supabase.from("pepper_quotes").insert({
    id,
    company: company || null,
    contact_name: contactName,
    email,
    whatsapp: whatsapp || null,
    briefing: briefing || null,
    estimate_min: breakdown.min,
    estimate_max: breakdown.max,
    payload,
  });

  if (error) {
    // 42P01 = relação não existe: a migration 0006 ainda não rodou neste
    // projeto Supabase. Vale avisar direito em vez de mandar "tenta de novo".
    if (error.code === "42P01") {
      return {
        error:
          "A área de orçamentos ainda está em modo vitrine por aqui. Chama a Pepper no direct que a gente monta na mão.",
      };
    }
    return { error: "Não deu pra registrar agora. Tenta de novo em instantes." };
  }

  return { success: true, id, min: breakdown.min, max: breakdown.max };
}
