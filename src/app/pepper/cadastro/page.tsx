import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Reveal } from "@/components/pepper/reveal";
import { getCurrentUser } from "@/lib/auth";

import { CadastroForm } from "./cadastro-form";

export const metadata: Metadata = {
  title: "Cadastro de creators",
  description: "Entre pro casting da Pepper — cadastre sua conta e comece a receber orçamentos.",
};

export default async function PepperCadastroPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "creator" ? "/dashboard/creator" : "/dashboard");

  return (
    <div className="relative flex min-h-[calc(100vh-8rem)] items-center justify-center overflow-hidden px-4 py-20 sm:px-6">
      <span
        aria-hidden="true"
        className="pp-heat left-1/2 top-0 h-96 w-96 -translate-x-1/2 opacity-70"
      />

      <Reveal className="relative w-full max-w-md">
        <div className="pp-glass-lit rounded-3xl p-8 sm:p-10">
          <p className="pp-label pp-label-hot">Casting Pepper</p>
          <h1 className="mt-4 text-[clamp(2rem,6vw,2.75rem)]">
            <span className="block text-[var(--pp-chalk)]">Vire</span>
            <span className="pp-hot-text block">creator</span>
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-[var(--pp-mute)]">
            Cadastre-se, complete seu perfil no estúdio e nosso time libera
            seu acesso. Sem burocracia, sem reunião.
          </p>

          <CadastroForm />
        </div>
      </Reveal>
    </div>
  );
}
