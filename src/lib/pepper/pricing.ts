import type {
  PepperCreator,
  PepperQuoteBreakdown,
  PepperQuoteLine,
  PepperQuotePayload,
  PepperService,
  PepperUrgency,
  PepperUsage,
} from "./types";

/**
 * Motor de preço do configurador público.
 *
 * Roda igual no cliente (preview ao vivo enquanto o cliente mexe) e no
 * servidor (valor gravado junto do lead). É de propósito uma função pura,
 * sem I/O: o número que aparece na tela é o mesmo que entra no banco, e dá
 * pra auditar o cálculo lendo esta única função.
 */

export const URGENCY_LABEL: Record<PepperUrgency, string> = {
  flex: "Data flexível",
  padrao: "Prazo padrão",
  expresso: "Expresso",
};

export const URGENCY_FACTOR: Record<PepperUrgency, number> = {
  flex: 0.92,
  padrao: 1,
  expresso: 1.28,
};

export const URGENCY_HINT: Record<PepperUrgency, string> = {
  flex: "A gente encaixa na agenda — 9% off",
  padrao: "Entrega no prazo do serviço",
  expresso: "Fura a fila da produção — +28%",
};

export const USAGE_LABEL: Record<PepperUsage, string> = {
  organico: "Só orgânico",
  paid30: "Mídia paga · 30 dias",
  paid90: "Mídia paga · 90 dias",
};

export const USAGE_FACTOR: Record<PepperUsage, number> = {
  organico: 1,
  paid30: 1.25,
  paid90: 1.45,
};

export const USAGE_HINT: Record<PepperUsage, string> = {
  organico: "Publicação no perfil do creator",
  paid30: "Você pode impulsionar por 30 dias",
  paid90: "Whitelisting + impulsionamento por 90 dias",
};

/** Exclusividade de categoria por 30 dias. */
export const EXCLUSIVITY_FACTOR = 1.18;

/** Desconto por volume de casting: 6% por creator extra, teto de 18%. */
function castingDiscount(creatorCount: number): number {
  if (creatorCount <= 1) return 1;
  return 1 - Math.min(0.18, 0.06 * (creatorCount - 1));
}

/** Arredonda pra cima na dezena — orçamento não sai com centavos. */
function roundUp(value: number, step = 10): number {
  return Math.ceil(value / step) * step;
}

export const EMPTY_BREAKDOWN: PepperQuoteBreakdown = {
  lines: [],
  subtotal: 0,
  modifiers: [],
  total: 0,
  min: 0,
  max: 0,
  leadDays: 0,
  creatorCount: 0,
  reach: 0,
};

export function estimateQuote(
  payload: PepperQuotePayload,
  services: PepperService[],
  creators: PepperCreator[],
): PepperQuoteBreakdown {
  const chosenCreators = creators.filter((c) =>
    payload.creatorIds.includes(c.id),
  );

  // Sem creator escolhido o orçamento roda em cima de 1 perfil médio, senão
  // a tela mostraria R$ 0 e o cliente acha que o serviço é de graça.
  const castingWeight =
    chosenCreators.length > 0
      ? chosenCreators.reduce((sum, c) => sum + c.rate_multiplier, 0)
      : 1;

  const discount = castingDiscount(chosenCreators.length);
  const effectiveWeight = castingWeight * discount;

  const lines: PepperQuoteLine[] = [];
  let subtotal = 0;
  let leadDays = 0;

  for (const service of services) {
    const qty = payload.services[service.slug] ?? 0;
    if (qty <= 0) continue;

    const amount = service.base_price * qty * effectiveWeight;
    subtotal += amount;
    leadDays = Math.max(leadDays, service.lead_days);

    lines.push({
      label: service.name,
      detail:
        chosenCreators.length > 0
          ? `${qty}× ${service.unit} · ${chosenCreators.length} creator${
              chosenCreators.length > 1 ? "s" : ""
            }`
          : `${qty}× ${service.unit}`,
      amount,
    });
  }

  const modifiers: PepperQuoteLine[] = [];
  let total = subtotal;

  if (subtotal > 0) {
    const urgencyFactor = URGENCY_FACTOR[payload.urgency];
    if (urgencyFactor !== 1) {
      const delta = subtotal * (urgencyFactor - 1);
      modifiers.push({
        label: URGENCY_LABEL[payload.urgency],
        detail: `${urgencyFactor > 1 ? "+" : ""}${Math.round(
          (urgencyFactor - 1) * 100,
        )}%`,
        amount: delta,
      });
      total += delta;
    }

    const usageFactor = USAGE_FACTOR[payload.usage];
    if (usageFactor !== 1) {
      const delta = subtotal * (usageFactor - 1);
      modifiers.push({
        label: USAGE_LABEL[payload.usage],
        detail: `+${Math.round((usageFactor - 1) * 100)}%`,
        amount: delta,
      });
      total += delta;
    }

    if (payload.exclusivity) {
      const delta = subtotal * (EXCLUSIVITY_FACTOR - 1);
      modifiers.push({
        label: "Exclusividade de categoria",
        detail: "30 dias · +18%",
        amount: delta,
      });
      total += delta;
    }

    if (discount < 1) {
      modifiers.push({
        label: "Desconto de casting",
        detail: `${chosenCreators.length} creators · −${Math.round(
          (1 - discount) * 100,
        )}%`,
        // Já está embutido no subtotal; entra na lista só como explicação.
        amount: 0,
      });
    }
  }

  const rounded = subtotal > 0 ? roundUp(total) : 0;

  return {
    lines,
    subtotal,
    modifiers,
    total: rounded,
    min: rounded > 0 ? roundUp(rounded * 0.9) : 0,
    max: rounded > 0 ? roundUp(rounded * 1.15) : 0,
    leadDays: payload.urgency === "expresso" ? Math.max(2, Math.ceil(leadDays / 2)) : leadDays,
    creatorCount: chosenCreators.length,
    reach: chosenCreators.reduce(
      (sum, c) => sum + c.followers_instagram + c.followers_tiktok,
      0,
    ),
  };
}
