import Link from "next/link";

/** 404 da Pepper — renderiza dentro da casca da agência, não do Doca. */
export default function PepperNotFound() {
  return (
    <div className="relative flex min-h-[72vh] flex-col items-center justify-center overflow-hidden px-4 text-center">
      <span
        aria-hidden="true"
        className="pp-heat left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 opacity-50"
      />

      <span
        aria-hidden="true"
        className="pointer-events-none absolute select-none font-[family-name:var(--pp-font-display)] text-[34vw] font-black leading-none text-[var(--pp-chalk)]/[0.04]"
      >
        404
      </span>

      <p className="pp-label pp-label-hot relative mb-5">Fora do casting</p>

      <h1 className="relative text-[clamp(2.75rem,9vw,6rem)]">
        <span className="text-[var(--pp-chalk)]">Essa página</span>{" "}
        <span className="pp-hot-text">não existe</span>
      </h1>

      <p className="relative mt-6 max-w-md text-[var(--pp-mute)]">
        O link morreu, o creator saiu do ar ou o endereço veio errado.
      </p>

      <div className="relative mt-10 flex flex-wrap justify-center gap-3">
        <Link href="/pepper" className="pp-btn">
          Voltar pra Pepper
        </Link>
        <Link href="/pepper/creators" className="pp-btn-ghost">
          Ver o casting
        </Link>
      </div>
    </div>
  );
}
