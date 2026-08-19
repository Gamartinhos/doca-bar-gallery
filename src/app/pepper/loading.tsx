/**
 * Esqueleto de carregamento da Pepper.
 *
 * Todas as páginas da área são dinâmicas (leem Supabase a cada request), e
 * sem isto a navegação entre elas fica parada na página anterior até o
 * servidor responder.
 */
export default function PepperLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6" aria-busy="true">
      <span className="sr-only" role="status">
        Carregando
      </span>

      <div className="h-3 w-40 animate-pulse rounded-full bg-[var(--pp-steel)]" />
      <div className="mt-6 h-[clamp(3rem,9vw,7rem)] w-full max-w-3xl animate-pulse rounded-2xl bg-[var(--pp-steel)]" />
      <div className="mt-4 h-[clamp(2rem,6vw,4.5rem)] w-full max-w-xl animate-pulse rounded-2xl bg-[var(--pp-steel)]/70" />

      <div className="mt-16 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            className="aspect-[4/5] animate-pulse rounded-[18px] border border-[var(--pp-steel)] bg-[var(--pp-graphite)]"
            style={{ animationDelay: `${i * 90}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
