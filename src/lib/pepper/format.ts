/** Formatadores compartilhados pela área Pepper. */

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

export function brl(value: number): string {
  return BRL.format(Math.round(value));
}

/** 1240 → "1,2 mil" · 1_240_000 → "1,2 mi" */
export function compactNumber(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1).replace(".", ",").replace(",0", "")} mi`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1).replace(".", ",").replace(",0", "")} mil`;
  }
  return String(value);
}

/** Iniciais para o avatar gerado quando o creator não subiu foto. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Matiz estável a partir do id/slug — dá a cada creator sem foto um avatar
 * consistente entre renders (nada de Math.random, que quebraria a
 * hidratação) e dentro da paleta quente da marca.
 */
export function warmHue(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 100000;
  }
  // 0–48: do vermelho pimenta ao âmbar. Nada de verde/azul aqui.
  return hash % 48;
}

export function instagramUrl(handle: string): string {
  return `https://instagram.com/${handle.replace(/^@/, "")}`;
}

export function tiktokUrl(handle: string): string {
  return `https://tiktok.com/@${handle.replace(/^@/, "")}`;
}
