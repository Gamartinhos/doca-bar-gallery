import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AtualizarForm } from "./atualizar-form";

export const metadata: Metadata = {
  title: "Atualizar Senha",
  description: "Escolha sua nova senha.",
};

export default async function AtualizarSenhaPage() {
  const user = await getCurrentUser();
  
  // Se não estiver logado, não tem permissão para alterar a senha.
  // (O link de recuperação do e-mail fará o login automático e nos redirecionará pra cá).
  if (!user) {
    redirect("/login?erro=nao-autorizado");
  }

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center px-4 py-16 sm:px-10">
      <h1 className="mb-10 w-full max-w-md font-display text-5xl leading-[0.85]">
        <span className="outline-type block">NOVA</span>
        <span className="neon neon-purple block">SENHA</span>
      </h1>
      <AtualizarForm />
    </div>
  );
}
