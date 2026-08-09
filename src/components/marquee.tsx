/**
 * Faixa rolante estilo lambe-lambe / letreiro de casa noturna.
 */
export function Marquee({
  items,
  className = "",
}: {
  items: string[];
  className?: string;
}) {
  const loop = [...items, ...items];

  return (
    <div
      className={`relative overflow-hidden border-y border-concrete bg-ink py-3 ${className}`}
      aria-hidden="true"
    >
      <div className="marquee-track">
        {loop.map((item, i) => (
          <span
            key={`${item}-${i}`}
            className="flex shrink-0 items-center gap-6 px-6 font-display text-xl tracking-wide text-bone/80 sm:text-2xl"
          >
            {item}
            <span className="text-neon-magenta">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}
