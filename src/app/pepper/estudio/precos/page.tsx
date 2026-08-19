import type { Metadata } from "next";
import Link from "next/link";

import { DemoNotice } from "@/components/pepper/demo-notice";
import { Reveal } from "@/components/pepper/reveal";
import { requireUser } from "@/lib/auth";
import {
  getCreatorCustomPrices,
  getMyCreatorProfile,
  getPepperServices,
} from "@/lib/pepper/data";

import { PrecosForm } from "./precos-form";

export const revalidate = 0;

export const metadata: Metadata = {
  title: "Meus preços",
  description: "Área do creator: personalize o preço de cada serviço no seu link exclusivo de orçamento.",
};

export default async function PepperEstudioPrecosPage() {
  const user = await requireUser("/pepper/estudio/precos");
  const creator = await getMyCreatorProfile(user.id);

  if (!creator) {
    return (
      <div className="mx-auto max-w-3xl px-4 pb-28 pt-20 sm:px-6">
        <span
          aria-hidden="true"
          className="pp-heat left-1/2 top-24 h-80 w-80 -translate-x-1/2 opacity-50"
        />

        <Reveal className="relative">
          <p className="pp-label pp-label-hot">Estúdio do creator</p>

          <h1 className="mt-5 text-[clamp(2.25rem,7vw,4.5rem)]">
            <span className="block text-[var(--pp-chalk)]">Sua ficha</span>
            <span className="pp-hot-text block">ainda não existe</span>
          </h1>

          <div className="pp-glass-lit mt-10 rounded-2xl p-6 sm:p-8">
            <p className="text-[var(--pp-mute)]">
              Seu login está ativo, mas ninguém ligou ele a um creator do
              casting ainda. Quem faz esse vínculo é o time da Pepper — assim
              que a ficha for criada, esta página vira sua mesa de preços.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/pepper/creators" className="pp-btn">
                Ver o casting
              </Link>
              <Link href="/pepper" className="pp-btn-ghost">
                Voltar pra Pepper
              </Link>
            </div>
          </div>
        </Reveal>
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
    <div className="mx-auto max-w-4xl px-4 pb-28 pt-14 sm:px-6 sm:pt-20">
      <header className="relative">
        <span
          aria-hidden="true"
          className="pp-heat -left-24 -top-32 h-72 w-72 opacity-60"
        />

        <Reveal>
          <p className="pp-label pp-label-hot">Estúdio do creator</p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link
              href="/pepper/estudio"
              className="pp-label transition-colors duration-150 hover:text-[var(--pp-chalk)]"
            >
              Portfólio
            </Link>
            <span className="pp-label text-[var(--pp-faint)]">·</span>
            <span className="pp-label pp-label-hot">Preços</span>
          </div>

          <h1 className="mt-4 text-[clamp(2.25rem,6vw,3.75rem)] text-[var(--pp-chalk)]">
            Seus preços
          </h1>

          <p className="mt-4 max-w-2xl text-[var(--pp-mute)]">
            Ajuste o valor de cada serviço pro seu link exclusivo de
            orçamento (<code className="rounded bg-[var(--pp-steel)] px-1.5 py-0.5 font-[family-name:var(--pp-font-mono)] text-[0.75rem] text-[var(--pp-chalk)]">
              /pepper/creators/{creator.slug}/orcamento
            </code>). Sem customização, vale o preço base da Pepper.
          </p>
        </Reveal>
      </header>

      {vitrine ? (
        <div className="mt-10">
          <DemoNotice what="catálogo de serviços" />
        </div>
      ) : (
        <PrecosForm services={services} customPrices={customPrices} />
      )}
    </div>
  );
}
