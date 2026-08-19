/**
 * Faixa rolante da Pepper. Puramente CSS (`.pp-ticker`), sem JS: a lista é
 * duplicada e a animação anda -50%, então o loop é perfeito e não custa
 * nada em runtime.
 */
export function Ticker({
  items,
  className = "",
  reverse = false,
  slow = false,
  separator = "✦",
}: {
  items: string[];
  className?: string;
  reverse?: boolean;
  slow?: boolean;
  separator?: string;
}) {
  const loop = [...items, ...items];

  return (
    <div
      className={`pp-fade-x relative overflow-hidden border-y border-[var(--pp-glass-brd)] py-4 ${className}`}
      aria-hidden="true"
    >
      <div
        className={`pp-ticker ${slow ? "pp-ticker-slow" : ""} ${
          reverse ? "pp-ticker-rev" : ""
        }`}
      >
        {loop.map((item, i) => (
          <span
            key={`${item}-${i}`}
            className="flex shrink-0 items-center gap-7 px-7 font-[family-name:var(--pp-font-display)] text-xl font-black uppercase tracking-[-0.02em] text-[var(--pp-chalk)]/80 sm:text-2xl"
          >
            {item}
            <span className="text-[var(--pp-pepper)]">{separator}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
