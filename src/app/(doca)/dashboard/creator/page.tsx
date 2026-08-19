import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { getMyCreatorProfile } from "@/lib/pepper/data";

import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Painel do creator" };
export const revalidate = 0;

export default async function CreatorDashboardPage() {
  const user = await requireUser("/dashboard/creator");

  if (user.role !== "creator") {
    redirect("/dashboard?erro=sem-permissao");
  }

  const creator = await getMyCreatorProfile(user.id);

  if (!creator) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-xl">
        <p className="stamp text-neon-red">Perfil pendente</p>
        <h2 className="mt-3 font-display text-3xl text-bone">
          Sua ficha ainda está sendo preparada
        </h2>
        <p className="mt-4 max-w-xl text-bone/70">
          Sua conta foi criada, mas sua ficha de creator ainda não apareceu
          por aqui — pode acontecer se o seu @ já estava em uso por outro
          perfil. Chama a gente que resolvemos na mão.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {!user.is_approved && (
        <div className="rounded-2xl border border-neon-purple/40 bg-neon-purple/[0.06] px-6 py-5 backdrop-blur-xl">
          <p className="stamp text-neon-purple">Em análise</p>
          <p className="mt-2 text-bone/85">
            Seu perfil está em análise pela nossa equipe. Enquanto isso,
            complete seus dados abaixo — quanto mais completo, mais rápido a
            aprovação sai.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`skew-tag px-3 py-1 font-tech text-xs font-bold uppercase tracking-[0.18em] ${
            creator.is_published ? "bg-neon-green text-void" : "bg-concrete text-bone"
          }`}
        >
          {creator.is_published ? "Perfil publicado" : "Ainda não publicado"}
        </span>
        <Link href={`/pepper/creators/${creator.slug}`} className="stamp text-ash hover:text-neon-blue">
          ver perfil público →
        </Link>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl sm:p-8">
        <h2 className="font-display text-2xl text-bone">Complete seu perfil</h2>
        <p className="mt-2 text-sm text-ash">
          Esses dados aparecem no seu perfil público e nos orçamentos que os
          clientes recebem.
        </p>
        <ProfileForm creator={creator} />
      </div>
    </div>
  );
}
