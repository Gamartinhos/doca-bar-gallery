import type { Metadata } from "next";
import Link from "next/link";

import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Painel" };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const user = await requireUser();
  const { erro } = await searchParams;

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <p className="stamp text-neon-green">Painel</p>
      <h1 className="mt-2 font-display text-6xl sm:text-7xl">
        <span className="text-bone">SALVE,</span>{" "}
        <span className="neon neon-magenta">
          {(user.full_name ?? "fotógrafo").split(" ")[0].toUpperCase()}
        </span>
      </h1>

      {erro === "sem-permissao" && (
        <p
          role="alert"
          className="mt-6 border border-neon-red bg-neon-red/10 px-4 py-3 font-tech text-sm text-neon-red"
        >
          Essa área é só do admin da casa.
        </p>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <span
          className={`skew-tag px-3 py-1 font-tech text-xs font-bold uppercase tracking-[0.18em] ${
            user.role === "admin"
              ? "bg-neon-purple text-void"
              : "bg-concrete text-bone"
          }`}
        >
          {user.role === "admin" ? "Admin da casa" : "Fotógrafo"}
        </span>
        <span
          className={`skew-tag px-3 py-1 font-tech text-xs font-bold uppercase tracking-[0.18em] ${
            user.is_approved
              ? "bg-neon-green text-void"
              : "bg-neon-red text-void"
          }`}
        >
          {user.is_approved ? "Aprovado" : "Aguardando aprovação"}
        </span>
      </div>

      {!user.is_approved && (
        <p className="mt-6 max-w-xl border border-concrete bg-ink px-4 py-4 text-bone/75">
          Sua credencial ainda não foi liberada. Assim que o admin aprovar, o
          upload destrava sozinho.
        </p>
      )}

      <div className="mt-12 grid gap-5 sm:grid-cols-2">
        <Link
          href="/dashboard/upload"
          className="card-slab neon-green group block p-8"
        >
          <p className="stamp text-neon-green">01</p>
          <h2 className="mt-3 font-display text-4xl text-bone">
            Subir mídia
          </h2>
          <p className="mt-3 text-sm text-ash">
            Fotos e vídeos da noite direto pro Google Drive da casa.
          </p>
        </Link>

        {user.role === "admin" && (
          <Link
            href="/dashboard/admin"
            className="card-slab neon-purple group block p-8"
          >
            <p className="stamp text-neon-purple">02</p>
            <h2 className="mt-3 font-display text-4xl text-bone">
              Administrar
            </h2>
            <p className="mt-3 text-sm text-ash">
              Aprovar fotógrafos e abrir novos eventos.
            </p>
          </Link>
        )}

        <Link href="/" className="card-slab neon-blue group block p-8">
          <p className="stamp text-neon-blue">
            {user.role === "admin" ? "03" : "02"}
          </p>
          <h2 className="mt-3 font-display text-4xl text-bone">
            Ver galeria
          </h2>
          <p className="mt-3 text-sm text-ash">
            O que o público enxerga da rua.
          </p>
        </Link>
      </div>
    </div>
  );
}
