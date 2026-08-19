"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Boundary da Pepper. Fica aqui (e não só na raiz) para o erro aparecer
 * dentro da casca da agência — cair no visual do Doca no meio de um
 * orçamento seria pior do que o próprio erro.
 */
export default function PepperError({
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

  // reset() só remonta o segmento com o payload que já falhou. Como tudo
  // aqui busca dados no servidor, é preciso refazer o request antes.
  function tentarDeNovo() {
    router.refresh();
    reset();
  }

  return (
    <div className="relative flex min-h-[72vh] flex-col items-center justify-center overflow-hidden px-4 text-center">
      <span
        aria-hidden="true"
        className="pp-heat left-1/2 top-1/2 h-[380px] w-[380px] -translate-x-1/2 -translate-y-1/2 opacity-40"
      />

      <p className="pp-label pp-label-hot relative mb-5">Deu ruim</p>

      <h1 className="relative text-[clamp(2.5rem,8vw,5.5rem)]">
        <span className="text-[var(--pp-chalk)]">Alguma coisa</span>{" "}
        <span className="pp-hot-text">travou</span>
      </h1>

      <p className="relative mt-6 max-w-md text-[var(--pp-mute)]">
        O erro já foi registrado. Tenta de novo — normalmente resolve.
      </p>

      {error.digest && (
        <p className="pp-label relative mt-4 text-[0.62rem]">
          ref: {error.digest}
        </p>
      )}

      <button
        type="button"
        onClick={tentarDeNovo}
        className="pp-btn relative mt-10"
      >
        Tentar de novo
      </button>
    </div>
  );
}
