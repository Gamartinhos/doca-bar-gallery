import { brl } from "@/lib/pepper/format";
import type { PepperService } from "@/lib/pepper/types";

/**
 * Card da tabela de serviços da Pepper.
 *
 * É vitrine, não seleção: quem escolhe formato e quantidade é o
 * configurador em `/pepper/orcamento`. Por isso o card não é link nem
 * botão — o preço aqui é "a partir de", já que o peso do creator só entra
 * depois que o casting é escolhido.
 */
export function ServiceCard({
  service,
  className = "",
}: {
  service: PepperService;
  className?: string;
}) {
  return (
    <article
      className={`pp-card pp-card-lit group flex h-full flex-col p-6 ${className}`}
    >
      {/* Verniz quente que acende no hover, atrás do conteúdo. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[color-mix(in_oklab,var(--pp-pepper)_16%,transparent)] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />

      <div className="relative flex items-start justify-between gap-4">
        <span
          aria-hidden="true"
          className="pp-glass-lit grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-xl leading-none text-[var(--pp-ember)] transition-colors duration-300 group-hover:text-[var(--pp-pepper-soft)]"
        >
          {service.icon}
        </span>
        <span className="pp-chip">entrega {service.lead_days}d</span>
      </div>

      <h3 className="relative mt-5 text-2xl text-[var(--pp-chalk)]">
        {service.name}
      </h3>

      {service.description && (
        <p className="relative mt-3 flex-1 text-sm leading-relaxed text-[var(--pp-mute)]">
          {service.description}
        </p>
      )}

      <div className="relative mt-6 flex items-end justify-between gap-3 border-t border-[var(--pp-steel)] pt-4">
        <div>
          <p className="pp-label text-[0.58rem]">a partir de</p>
          <p className="mt-1 font-[family-name:var(--pp-font-display)] text-3xl font-black leading-none tracking-[-0.04em] text-[var(--pp-chalk)] transition-colors duration-300 group-hover:text-[var(--pp-ember)]">
            {brl(service.base_price)}
          </p>
        </div>
        <p className="pp-label text-right text-[0.58rem]">por {service.unit}</p>
      </div>
    </article>
  );
}
