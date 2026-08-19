import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DemoNotice } from "@/components/pepper/demo-notice";
import { QuoteConfigurator } from "@/components/pepper/quote-configurator";
import { Reveal } from "@/components/pepper/reveal";
import {
  getCreatorCustomPrices,
  getPepperCreator,
  getPepperServices,
} from "@/lib/pepper/data";

export const revalidate = 0;

/** Mesmo segmento da ficha do creator: aceita slug (link público) ou uuid. */
type Params = Promise<{ id: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { id } = await params;
  const { data: creator } = await getPepperCreator(id);

  if (!creator) return { title: "Creator fora do casting" };

  return {
    title: `Orçamento com ${creator.name}`,
    description: `Monte a campanha direto com ${creator.name} — preços fechados especialmente para este link.`,
  };
}

export default async function CreatorOrcamentoPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  const { data: creator, source } = await getPepperCreator(id);

  if (!creator) notFound();

  const [servicesResult, customPricesByServiceId] = await Promise.all([
    getPepperServices(),
    getCreatorCustomPrices(creator.id),
  ]);

  const services = servicesResult.data;

  const customPricesOverride: Record<string, number> = {};
  for (const service of services) {
    const custom = customPricesByServiceId[service.id];
    if (custom != null) customPricesOverride[service.slug] = custom;
  }

  const vitrine = source === "demo" || servicesResult.source === "demo";
  const primeiroNome = creator.name.split(" ")[0];

  return (
    <div className="mx-auto max-w-7xl px-4 pb-28 pt-14 sm:px-6 sm:pt-20">
      <header className="relative">
        <span
          aria-hidden="true"
          className="pp-heat -left-28 -top-32 h-72 w-72 opacity-70"
        />

        <Reveal>
          <Link
            href={`/pepper/creators/${creator.slug}`}
            className="pp-label inline-flex items-center gap-2 transition-colors duration-150 hover:text-[var(--pp-chalk)]"
          >
            <span aria-hidden="true">←</span> Voltar pro perfil
          </Link>

          <p className="pp-label pp-label-hot mt-6 flex flex-wrap items-center gap-3">
            <span className="pp-live-dot" aria-hidden="true" />
            Orçamento exclusivo · {creator.name}
          </p>

          <h1 className="pp-display mt-5 text-[clamp(2.5rem,8vw,5.5rem)]">
            <span className="block text-[var(--pp-chalk)]">Fechar com</span>
            <span className="pp-hot-text block">{primeiroNome}</span>
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-relaxed text-[var(--pp-mute)] sm:text-lg">
            Esse configurador já vem travado no casting de {creator.name} —
            escolhe os formatos, o prazo e o direito de uso. Os valores
            exibidos já são os preços fechados especialmente para este link.
          </p>
        </Reveal>
      </header>

      {vitrine && (
        <div className="mt-10">
          <DemoNotice what="orçamento" />
        </div>
      )}

      <div className="mt-12">
        <QuoteConfigurator
          services={services}
          creators={[creator]}
          lockedCreator={creator}
          customPricesOverride={customPricesOverride}
        />
      </div>
    </div>
  );
}
