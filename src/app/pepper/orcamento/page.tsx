import type { Metadata } from "next";

import { DemoNotice } from "@/components/pepper/demo-notice";
import { QuoteConfigurator } from "@/components/pepper/quote-configurator";
import { Reveal } from "@/components/pepper/reveal";
import { getPepperCreators, getPepperServices } from "@/lib/pepper/data";

export const revalidate = 0;

export const metadata: Metadata = {
  title: "Orçamento",
  description:
    "Monte a campanha: escolha os serviços, o casting, o prazo e os direitos de uso e veja a estimativa na hora. Sem reunião e sem esperar proposta.",
  openGraph: {
    title: "Orçamento — PEPPER",
    description:
      "Serviços, casting, prazo e direitos de uso com estimativa ao vivo.",
    type: "website",
    locale: "pt_BR",
  },
};

export default async function PepperOrcamentoPage({
  searchParams,
}: {
  searchParams: Promise<{ creator?: string }>;
}) {
  const [{ creator: creatorParam }, servicesResult, creatorsResult] =
    await Promise.all([
      searchParams,
      getPepperServices(),
      getPepperCreators(),
    ]);

  const services = servicesResult.data;
  const creators = creatorsResult.data;

  // O perfil do creator linka pra cá com `?creator=<slug>`, mas o
  // configurador trabalha com id. Resolver aqui (e não lá) evita expor o
  // uuid na URL pública.
  const preselected =
    creators.find(
      (c) => c.slug === creatorParam || c.id === creatorParam,
    )?.id ?? null;

  const vitrine =
    servicesResult.source === "demo" || creatorsResult.source === "demo";

  return (
    <div className="mx-auto max-w-7xl px-4 pb-28 pt-14 sm:px-6 sm:pt-20">
      <header className="relative">
        <span
          aria-hidden="true"
          className="pp-heat -left-28 -top-32 h-72 w-72 opacity-70"
        />

        <Reveal>
          <p className="pp-label flex flex-wrap items-center gap-3">
            <span className="pp-live-dot" aria-hidden="true" />
            Estimativa na hora · resposta em até 24h
          </p>

          <h1 className="pp-display mt-5 text-[clamp(2.75rem,8.5vw,6.5rem)]">
            <span className="block text-[var(--pp-chalk)]">Monte sua</span>
            <span className="pp-hot-text block">campanha</span>
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-relaxed text-[var(--pp-mute)] sm:text-lg">
            Escolhe os formatos, o time de creators, o prazo e o direito de
            uso. O preço se move a cada clique — sem briefing por e-mail, sem
            esperar uma semana por PDF.
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
          creators={creators}
          preselectedCreatorId={preselected}
        />
      </div>
    </div>
  );
}
