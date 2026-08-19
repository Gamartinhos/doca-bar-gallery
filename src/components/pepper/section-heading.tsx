import { Reveal } from "./reveal";

/**
 * Cabeçalho de seção da Pepper: número de índice, título gigante e uma
 * linha de apoio. Mantém o ritmo igual em todas as páginas.
 */
export function SectionHeading({
  index,
  eyebrow,
  title,
  accent,
  description,
  action,
  className = "",
}: {
  index?: string;
  eyebrow?: string;
  title: string;
  /** Segunda metade do título, pintada com o gradiente quente. */
  accent?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <Reveal className={`mb-12 ${className}`}>
      <div className="flex flex-wrap items-end justify-between gap-6 border-b border-[var(--pp-glass-brd)] pb-6">
        <div className="max-w-2xl">
          {(index || eyebrow) && (
            <p className="pp-label mb-4 flex items-center gap-3">
              {index && (
                <span className="pp-label-hot font-bold">{index}</span>
              )}
              {eyebrow}
            </p>
          )}
          <h2 className="text-[clamp(2.25rem,6vw,4.25rem)]">
            <span className="text-[var(--pp-chalk)]">{title}</span>
            {accent && (
              <>
                {" "}
                <span className="pp-hot-text">{accent}</span>
              </>
            )}
          </h2>
          {description && (
            <p className="mt-5 text-base leading-relaxed text-[var(--pp-mute)]">
              {description}
            </p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </Reveal>
  );
}
