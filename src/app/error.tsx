"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error(error);
  }, [error]);

  // reset() só remonta o segmento com o payload que já falhou. Quando o
  // erro veio de um Server Component (o caso comum aqui, tudo busca dados
  // no servidor), é preciso refazer o request antes de remontar.
  function religar() {
    router.refresh();
    reset();
  }

  return (
    <div className="concrete flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="font-display text-6xl leading-none sm:text-7xl">
        <span className="chromatic block">CAIU A</span>
        <span className="neon neon-red block">ENERGIA</span>
      </h1>

      <p className="mt-6 max-w-md text-bone/70">
        Alguma coisa quebrou no meio da noite. Tenta de novo.
      </p>

      {error.digest && <p className="stamp mt-3">ref: {error.digest}</p>}

      <button type="button" onClick={religar} className="btn-street neon-red mt-10">
        Religar
      </button>
    </div>
  );
}
