/**
 * PEPPER — tipos do domínio da agência.
 *
 * Espelham `supabase/migrations/0006_pepper.sql`. As tabelas vivem no mesmo
 * schema `public` do Doca de propósito: base de usuários e mídia são as
 * mesmas, a Pepper é uma área do produto, não outro banco.
 */

/** Faixa do creator no casting — muda o peso dele no orçamento. */
export type PepperTier = "rising" | "core" | "headline";

export type PepperMediaType = "photo" | "video";
export type PepperMediaStatus = "pending" | "approved" | "rejected";

/**
 * De onde a peça veio:
 * - `portfolio`: material solto, só vive no portfólio da Pepper.
 * - `doca`: material vinculado a um evento/fotógrafo do Doca — aparece aqui
 *   e também na galeria principal, porque é a mesma linha em `public.media`.
 */
export type PepperMediaOrigin = "portfolio" | "doca";

export type PepperCreator = {
  id: string;
  /** Liga o creator ao login do ecossistema (`public.users`). */
  user_id: string | null;
  slug: string;
  name: string;
  /** @handle do Instagram, sem o arroba. */
  handle: string | null;
  tiktok_handle: string | null;
  bio: string | null;
  city: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  tags: string[];
  followers_instagram: number;
  followers_tiktok: number;
  avg_views: number;
  /** Percentual, ex.: 6.4 = 6,4%. */
  engagement_rate: number;
  /**
   * Peso do creator sobre o preço base do serviço. 1.0 = tabela cheia.
   * Um único número mantém a calculadora legível e auditável — tabela de
   * preço por creator × serviço vira matriz impossível de manter.
   */
  rate_multiplier: number;
  tier: PepperTier;
  is_published: boolean;
  sort_order: number;
  created_at: string;
};

export type PepperMedia = {
  id: string;
  creator_id: string;
  /** FK opcional para `public.media` — preenchida quando origin = 'doca'. */
  media_id: string | null;
  /** FK opcional para `public.events`. */
  event_id: string | null;
  url: string;
  thumbnail_url: string | null;
  type: PepperMediaType;
  origin: PepperMediaOrigin;
  caption: string | null;
  status: PepperMediaStatus;
  sort_order: number;
  created_at: string;
};

export type PepperService = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  /** Unidade cobrada: "vídeo", "sequência de stories", "noite"... */
  unit: string;
  base_price: number;
  /** Prazo de entrega em dias, usado no resumo do orçamento. */
  lead_days: number;
  /** Glifo curto exibido no card do serviço. */
  icon: string;
  sort_order: number;
  is_active: boolean;
};

/** Preço que o próprio creator define para um serviço — sobrepõe o `base_price`. */
export type PepperCreatorService = {
  creator_id: string;
  service_id: string;
  custom_price: number;
  is_active: boolean;
};

export type PepperQuoteStatus = "new" | "contacted" | "won" | "lost";

export type PepperQuote = {
  id: string;
  company: string | null;
  contact_name: string;
  email: string;
  whatsapp: string | null;
  briefing: string | null;
  estimate_min: number;
  estimate_max: number;
  payload: PepperQuotePayload;
  status: PepperQuoteStatus;
  created_at: string;
};

/* ------------------------------------------------------------------ */
/* Configurador                                                        */
/* ------------------------------------------------------------------ */

export type PepperUrgency = "flex" | "padrao" | "expresso";
export type PepperUsage = "organico" | "paid30" | "paid90";

export type PepperQuotePayload = {
  /** slug do serviço → quantidade. */
  services: Record<string, number>;
  creatorIds: string[];
  urgency: PepperUrgency;
  usage: PepperUsage;
  exclusivity: boolean;
};

export type PepperQuoteLine = {
  label: string;
  detail: string;
  amount: number;
};

export type PepperQuoteBreakdown = {
  lines: PepperQuoteLine[];
  /** Soma dos serviços já com o peso do casting aplicado. */
  subtotal: number;
  modifiers: PepperQuoteLine[];
  total: number;
  min: number;
  max: number;
  /** Prazo estimado em dias, a partir do serviço mais lento. */
  leadDays: number;
  creatorCount: number;
  /** Alcance somado do casting selecionado. */
  reach: number;
};
