/**
 * Valida o parâmetro `next` (para onde mandar o usuário depois do login).
 *
 * Cuidado com a contrabarra: navegadores normalizam "\" para "/" ao resolver
 * a URL, então "/\evil.com" vira "//evil.com" e escapa para um host externo.
 * Checar apenas `startsWith("/")` e `!startsWith("//")` NÃO basta.
 *
 * A validação resolve o valor contra uma origem de referência e só aceita se
 * o resultado continuar na mesma origem.
 */
const BASE = "https://doca.local";

export function safeNext(value: unknown, fallback = "/dashboard"): string {
  const raw = typeof value === "string" ? value : "";

  if (!raw.startsWith("/")) return fallback;

  let resolved: URL;
  try {
    resolved = new URL(raw, BASE);
  } catch {
    return fallback;
  }

  if (resolved.origin !== BASE) return fallback;

  return `${resolved.pathname}${resolved.search}${resolved.hash}`;
}

/**
 * `searchParams` entrega `string[]` quando a chave aparece repetida na URL
 * (ex.: ?next=/a&next=/b). Normaliza para o primeiro valor.
 */
export function firstParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}
