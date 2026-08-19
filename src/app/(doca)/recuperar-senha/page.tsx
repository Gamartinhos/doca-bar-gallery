import type { Metadata } from "next";
import { RecuperarForm } from "./recuperar-form";

export const metadata: Metadata = {
  title: "Recuperar Senha",
  description: "Recupere sua senha do Doca Bar.",
};

export default function RecuperarSenhaPage() {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center px-4 py-16 sm:px-10">
      <h1 className="mb-10 w-full max-w-md font-display text-5xl leading-[0.85]">
        <span className="outline-type block">RECUPERAR</span>
        <span className="neon neon-purple block">SENHA</span>
      </h1>
      <RecuperarForm />
    </div>
  );
}
