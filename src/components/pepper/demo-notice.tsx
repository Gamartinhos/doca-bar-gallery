/**
 * Aviso de vitrine.
 *
 * Enquanto a migration 0006 não roda (ou enquanto ninguém cadastrou
 * creator), a área Pepper renderiza o casting de demonstração. É melhor
 * mostrar a régua visual completa do que uma página vazia — mas mentir que
 * aquele é o casting real seria pior ainda, então isso fica explícito.
 */
export function DemoNotice({ what = "casting" }: { what?: string }) {
  return (
    <div
      role="status"
      className="pp-glass-lit mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-1 rounded-xl px-4 py-2.5"
    >
      <span className="pp-chip pp-chip-hot">vitrine</span>
      <p className="text-sm text-[var(--pp-mute)]">
        Este {what} é de demonstração. Rode{" "}
        <code className="rounded bg-[var(--pp-steel)] px-1.5 py-0.5 font-[family-name:var(--pp-font-mono)] text-[0.75rem] text-[var(--pp-chalk)]">
          supabase/migrations/0006_pepper.sql
        </code>{" "}
        e cadastre os creators para ver os dados reais.
      </p>
    </div>
  );
}
