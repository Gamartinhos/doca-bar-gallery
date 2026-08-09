import Link from "next/link";

export default function NotFound() {
  return (
    <div className="concrete relative flex min-h-[70vh] flex-col items-center justify-center overflow-hidden px-4 text-center">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute select-none font-display text-[38vw] leading-none text-neon-red/10"
      >
        404
      </span>

      <h1 className="relative font-display text-6xl leading-none sm:text-8xl">
        <span className="chromatic block">PORTA</span>
        <span className="neon neon-red block">FECHADA</span>
      </h1>

      <p className="relative mt-6 max-w-md text-bone/70">
        Essa página não existe, foi apagada ou nunca esteve na lista.
      </p>

      <Link href="/" className="btn-street neon-red relative mt-10">
        Voltar pra galeria
      </Link>
    </div>
  );
}
