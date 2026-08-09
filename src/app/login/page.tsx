import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { firstParam, safeNext } from "@/lib/safe-next";

import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Área do fotógrafo",
  description: "Entre ou peça credencial para subir mídia no Doca Bar.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    next?: string | string[];
    modo?: string | string[];
  }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  const params = await searchParams;
  const next = safeNext(firstParam(params.next));
  const modo = firstParam(params.modo);

  return (
    <div className="relative grid min-h-[calc(100vh-8rem)] lg:grid-cols-2">
      {/* ---------- lado esquerdo: parede ---------- */}
      <aside className="concrete relative hidden overflow-hidden border-r border-concrete lg:block">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-6 top-16 select-none font-tag text-8xl leading-none text-neon-magenta/15"
        >
          quem
          <br />
          fotografa
          <br />
          manda
        </span>

        <div className="relative flex h-full flex-col justify-end p-12">
          <h2 className="font-display text-7xl leading-[0.82]">
            <span className="outline-type block">ÁREA</span>
            <span className="neon neon-purple block">RESTRITA</span>
          </h2>
          <p className="mt-6 max-w-sm text-bone/70">
            Aqui dentro o fotógrafo sobe o material da noite e o admin abre os
            eventos. O público vê só o resultado.
          </p>
          <div className="hazard mt-10 h-2 w-40 opacity-70" />
        </div>
      </aside>

      {/* ---------- lado direito: formulário ---------- */}
      <div className="flex flex-col items-center justify-center px-4 py-16 sm:px-10">
        {/* No mobile a coluna da esquerda some, então o h1 vem aqui. */}
        <h1 className="mb-10 w-full max-w-md font-display text-5xl leading-[0.85] lg:sr-only">
          <span className="outline-type block">ÁREA</span>
          <span className="neon neon-purple block">RESTRITA</span>
        </h1>

        <LoginForm next={next} startAsSignUp={modo === "cadastro"} />
      </div>
    </div>
  );
}
