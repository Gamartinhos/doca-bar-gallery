import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { CreatorCard } from "@/components/pepper/creator-card";
import { DemoNotice } from "@/components/pepper/demo-notice";
import { PepperHero } from "@/components/pepper/pepper-hero";
import {
  Parallax,
  Reveal,
  RevealGroup,
  RevealItem,
} from "@/components/pepper/reveal";
import { SectionHeading } from "@/components/pepper/section-heading";
import { ServiceCard } from "@/components/pepper/service-card";
import { Ticker } from "@/components/pepper/ticker";
import { getPepperCreators, getPepperServices } from "@/lib/pepper/data";

export const revalidate = 0;

export const metadata: Metadata = {
  // Absoluto porque o layout aplica o template "%s · PEPPER" — na home o
  // nome da marca já é o título, repetir ficaria "PEPPER … · PEPPER".
  title: { absolute: "PEPPER — Casting de creators da noite" },
  description:
    "Agência de influenciadores nascida na pista do Doca. Casting curado, orçamento fechado em minutos e material que também entra na galeria oficial da casa.",
};

const BORDOES = [
  "INFLUENCE IN MOTION",
  "CASTING DA NOITE",
  "ORÇAMENTO EM 2 MINUTOS",
  "TRAP · DANCEHALL · RUA",
  "DO BAILE PRA TIMELINE",
  "PEPPER × DOCA",
];

const PASSOS = [
  {
    index: "01",
    title: "Briefing",
    text: "Você diz o objetivo, o formato e a verba. Sem reunião de uma hora: o configurador já devolve a faixa de preço enquanto você monta o pedido.",
  },
  {
    index: "02",
    title: "Casting",
    text: "A gente sugere os creators que combinam com a marca — por público, cidade e o tipo de noite que eles frequentam de verdade.",
  },
  {
    index: "03",
    title: "Produção",
    text: "Roteiro, gravação e aprovação passam pelo estúdio da Pepper. Você aprova antes de subir, sem ficar refém do feed de ninguém.",
  },
  {
    index: "04",
    title: "Entrega e relatório",
    text: "Publicação feita, material bruto entregue e um relatório com alcance, views e engajamento peça por peça.",
  },
];

/**
 * Régua de capacidade: cada creator do casting segura quatro entregas no
 * mês — é a mesma conta do pacote "embaixador mensal". O número sai do
 * tamanho real do casting, não é enfeite de landing page.
 */
const ENTREGAS_POR_CREATOR_MES = 4;

export default async function PepperHome() {
  const [
    { data: creators, source: creatorsSource },
    { data: services, source: servicesSource },
  ] = await Promise.all([getPepperCreators(), getPepperServices()]);

  const reach = creators.reduce(
    (total, creator) =>
      total + creator.followers_instagram + creator.followers_tiktok,
    0,
  );

  const engagement = creators.length
    ? creators.reduce((total, creator) => total + creator.engagement_rate, 0) /
      creators.length
    : 0;

  const cities = new Set(
    creators
      .map((creator) => creator.city)
      .filter((city): city is string => Boolean(city)),
  ).size;

  const isDemo = creatorsSource === "demo" || servicesSource === "demo";
  const demoWhat =
    creatorsSource === "demo" && servicesSource === "demo"
      ? "casting e esta tabela de serviços"
      : creatorsSource === "demo"
        ? "casting"
        : "tabela de serviços";

  return (
    <>
      <PepperHero
        creators={creators.length}
        reach={reach}
        deliveries={creators.length * ENTREGAS_POR_CREATOR_MES}
        cities={cities}
        engagement={engagement}
      />

      <Ticker items={BORDOES} />

      {isDemo && (
        <div className="px-4 pt-12 sm:px-6">
          <DemoNotice what={demoWhat} />
        </div>
      )}

      {/* ---------------------------------------------------------------
          01 · CASTING
          --------------------------------------------------------------- */}
      <section
        id="casting"
        className="mx-auto max-w-7xl scroll-mt-24 px-4 py-24 sm:px-6"
      >
        <SectionHeading
          index="01"
          eyebrow="Casting"
          title="Gente que"
          accent="vive a pista"
          description="Nada de perfil comprado. Todo creator do casting frequenta a noite que ele posta — e a Pepper acompanha alcance, views e engajamento de cada um."
          action={
            <Link href="/pepper/creators" className="pp-btn-ghost">
              Ver casting completo
            </Link>
          }
        />

        <RevealGroup className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {creators.slice(0, 6).map((creator) => (
            <RevealItem key={creator.id} className="h-full">
              <CreatorCard creator={creator} />
            </RevealItem>
          ))}
        </RevealGroup>

        {creators.length > 6 && (
          <Reveal className="mt-12 flex justify-center">
            <Link
              href="/pepper/creators"
              className="pp-label inline-flex items-center gap-2 transition-colors duration-200 hover:text-[var(--pp-pepper-soft)]"
            >
              ver casting completo
              <span aria-hidden="true">→</span>
            </Link>
          </Reveal>
        )}
      </section>

      {/* ---------------------------------------------------------------
          02 · SERVIÇOS
          --------------------------------------------------------------- */}
      <section
        id="servicos"
        className="relative scroll-mt-24 overflow-hidden py-24"
      >
        <span
          aria-hidden="true"
          className="pp-heat right-[-12%] top-[10%] h-[440px] w-[440px] opacity-35"
        />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeading
            index="02"
            eyebrow="Formatos"
            title="O que a Pepper"
            accent="entrega"
            description="Preço de tabela, sem pacote fechado. O valor final depende do casting escolhido e do direito de uso — tudo isso o configurador calcula na hora."
            action={
              <Link href="/pepper/orcamento" className="pp-btn">
                Montar orçamento
              </Link>
            }
          />

          <RevealGroup className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <RevealItem key={service.id} className="h-full">
                <ServiceCard service={service} />
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      {/* ---------------------------------------------------------------
          03 · COMO FUNCIONA
          --------------------------------------------------------------- */}
      <section
        id="como-funciona"
        className="mx-auto max-w-7xl scroll-mt-24 px-4 py-24 sm:px-6"
      >
        <SectionHeading
          index="03"
          eyebrow="Processo"
          title="Do briefing"
          accent="ao relatório"
          description="Quatro etapas, prazo combinado no começo e uma pessoa responsável do lado de cá em todas elas."
        />

        <RevealGroup className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PASSOS.map((passo) => (
            <RevealItem key={passo.index} className="h-full">
              <div className="pp-glass-lit flex h-full flex-col rounded-2xl p-6 transition-colors duration-300 hover:border-[color-mix(in_oklab,var(--pp-pepper)_55%,transparent)]">
                <span
                  aria-hidden="true"
                  className="pp-outline font-[family-name:var(--pp-font-display)] text-5xl font-black leading-none tracking-[-0.04em]"
                >
                  {passo.index}
                </span>
                <h3 className="mt-5 text-2xl text-[var(--pp-chalk)]">
                  {passo.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-[var(--pp-mute)]">
                  {passo.text}
                </p>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </section>

      {/* ---------------------------------------------------------------
          04 · PROVA — a ligação com o Doca
          --------------------------------------------------------------- */}
      {/* `isolate` prende o -z-10 aqui dentro: sem isso a camada de asfalto
          cairia atrás do fundo opaco de `.pepper-root::before`. */}
      <section className="relative isolate overflow-hidden py-24">
        <div className="pp-asphalt absolute inset-0 -z-10 opacity-60" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2">
          <Reveal direction="right">
            {/* A imagem é maior que a moldura de propósito: o parallax
                desloca o miolo e não pode abrir borda vazia. */}
            <Parallax
              speed={24}
              className="relative overflow-hidden rounded-3xl border border-[var(--pp-glass-brd)]"
            >
              <div className="relative aspect-[4/3] w-full scale-[1.16]">
                <Image
                  src="/noites/noite-03.png"
                  alt="Pista cheia numa noite do Doca Bar"
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                />
                <span
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-t from-[var(--pp-ink)] via-transparent to-transparent"
                />
              </div>
            </Parallax>
          </Reveal>

          <Reveal direction="left">
            <p className="pp-label pp-label-hot mb-5">Pepper × Doca</p>
            <h2 className="text-[clamp(2.25rem,6vw,4.25rem)]">
              <span className="text-[var(--pp-chalk)]">O material vive</span>{" "}
              <span className="pp-hot-text">em dois lugares</span>
            </h2>
            <p className="mt-6 text-base leading-relaxed text-[var(--pp-mute)]">
              O creator sobe a peça no estúdio da Pepper. Se ela nasceu numa
              noite do Doca, entra no portfólio dele aqui e também na galeria
              oficial da casa — mesma conta, mesmo banco, nenhum repost
              improvisado.
            </p>
            <p className="mt-4 text-base leading-relaxed text-[var(--pp-mute)]">
              Na prática: a marca contrata uma ação e leva junto a audiência da
              casa que já vai estar lá naquela noite.
            </p>

            <div className="mt-7 flex flex-wrap gap-2">
              <span className="pp-chip pp-chip-hot">
                <span className="pp-live-dot" /> mesmo login
              </span>
              <span className="pp-chip">portfólio + galeria</span>
              <span className="pp-chip">fotógrafo credenciado</span>
            </div>

            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/" className="pp-btn-ghost">
                Ver a galeria do Doca
              </Link>
              <Link href="/pepper/orcamento" className="pp-btn">
                Contratar uma ação
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------------------------------------------------------------
          05 · CHAMADA FINAL
          --------------------------------------------------------------- */}
      <section className="relative overflow-hidden px-4 py-28 sm:px-6">
        <span
          aria-hidden="true"
          className="pp-heat left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 opacity-45"
        />

        <Reveal className="relative mx-auto max-w-3xl text-center">
          <p className="pp-label pp-label-hot mb-5">Orçamento em 2 minutos</p>
          <h2 className="text-[clamp(2.5rem,8vw,5.5rem)]">
            <span className="text-[var(--pp-chalk)]">Coloca a sua marca</span>{" "}
            <span className="pp-hot-text">em movimento</span>
          </h2>
          <p className="mx-auto mt-7 max-w-xl text-base leading-relaxed text-[var(--pp-mute)]">
            Monta o pacote, escolhe o casting e sai com a faixa de investimento
            na tela. Nossa equipe responde com a proposta fechada no mesmo dia
            útil.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link href="/pepper/orcamento" className="pp-btn">
              Montar orçamento
            </Link>
            <Link href="/pepper/creators" className="pp-btn-ghost">
              Conhecer o casting
            </Link>
          </div>
        </Reveal>
      </section>
    </>
  );
}
