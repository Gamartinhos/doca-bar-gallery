import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Reveal } from "@/components/pepper/reveal";
import { getCurrentUser } from "@/lib/auth";
import { firstParam, safeNext } from "@/lib/safe-next";

import { PepperLoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Login de creators",
  description: "Entre na sua conta de creator da Pepper.",
};

export default async function PepperLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "creator" ? "/dashboard/creator" : "/dashboard");

  const params = await searchParams;
  const next = safeNext(firstParam(params.next), "/dashboard/creator");

  return (
    <div className="relative flex min-h-[calc(100vh-8rem)] items-center justify-center overflow-hidden px-4 py-20 sm:px-6">
      <span
        aria-hidden="true"
        className="pp-heat left-1/2 top-0 h-96 w-96 -translate-x-1/2 opacity-70"
      />

      <Reveal className="relative w-full max-w-md">
        <div className="pp-glass-lit rounded-3xl p-8 sm:p-10">
          <p className="pp-label pp-label-hot">Área do creator</p>
          <h1 className="mt-4 text-[clamp(2rem,6vw,2.75rem)]">
            <span className="block text-[var(--pp-chalk)]">Bem-vinda(o)</span>
            <span className="pp-hot-text block">de volta</span>
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-[var(--pp-mute)]">
            Entra pra ver o status do seu perfil, ajustar preços e cuidar do
            seu portfólio.
          </p>

          <PepperLoginForm next={next} />
        </div>
      </Reveal>
    </div>
  );
}
