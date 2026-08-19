import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth";
import {
  getCreatorCustomPrices,
  getMyCreatorProfile,
  getPepperServices,
} from "@/lib/pepper/data";

import { PrecosForm } from "./precos-form";

export const metadata: Metadata = { title: "Meus preços" };
export const revalidate = 0;

export default async function CreatorPrecosPage() {
  const user = await requireUser("/dashboard/creator/precos");

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

  const [servicesResult, customPrices] = await Promise.all([
    getPepperServices(),
    getCreatorCustomPrices(creator.id),
  ]);

  const services = servicesResult.data;
  const vitrine = servicesResult.source === "demo";

  return (
    <div>
      <p className="stamp text-neon-green">Seus preços</p>
      <h2 className="mt-2 font-display text-3xl text-bone sm:text-4xl">
        Ajuste o valor de cada serviço
      </h2>
      <p className="mt-3 max-w-2xl text-ash">
        Vale pro seu link exclusivo de orçamento (
        <code className="rounded bg-concrete px-1.5 py-0.5 font-tech text-xs text-bone">
          /pepper/creators/{creator.slug}/orcamento
        </code>
        ). Sem customização, vale o preço base da Pepper.
      </p>

      {vitrine ? (
        <p className="stamp mt-8 border border-concrete bg-ink px-4 py-4 text-ash">
          Catálogo de serviços ainda em modo vitrine — assim que a Pepper
          cadastrar os serviços reais, eles aparecem aqui.
        </p>
      ) : (
        <PrecosForm services={services} customPrices={customPrices} />
      )}
    </div>
  );
}
