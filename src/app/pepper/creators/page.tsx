import type { Metadata } from "next";

import { CreatorFilters } from "@/components/pepper/creator-filters";
import { DemoNotice } from "@/components/pepper/demo-notice";
import { CountUp, Reveal } from "@/components/pepper/reveal";
import { getPepperCreators } from "@/lib/pepper/data";
import { compactNumber } from "@/lib/pepper/format";

export const revalidate = 0;

export const metadata: Metadata = {
  title: "Casting",
  description:
    "O casting de creators da PEPPER: trap, dancehall, moda, gastronomia e rua. Filtra por vibe, faixa e alcance e monta o time da sua campanha.",
  openGraph: {
    title: "Casting — PEPPER",
    description:
      "Creators da noite por vibe, faixa e alcance. Filtra e monta o time da campanha.",
    type: "website",
    locale: "pt_BR",
  },
};

export default async function PepperCreatorsPage() {
  const { data: creators, source } = await getPepperCreators();

  const reach = creators.reduce(
    (total, creator) =>
      total + creator.followers_instagram + creator.followers_tiktok,
    0,
  );
  const engagement =
    creators.length > 0
      ? creators.reduce((total, creator) => total + creator.engagement_rate, 0) /
        creators.length
      : 0;

  const stats: { label: string; value: number; format: (n: number) => string }[] =
    [
      {
        label: "Creators no casting",
        value: creators.length,
        format: (n) => String(Math.round(n)).padStart(2, "0"),
      },
      {
        label: "Alcance somado",
        value: reach,
        format: (n) => compactNumber(Math.round(n)),
      },
      {
        label: "Engajamento médio",
        value: engagement,
        format: (n) => `${n.toFixed(1).replace(".", ",")}%`,
      },
    ];

  return (
    <div className="mx-auto max-w-7xl px-4 pb-28 pt-14 sm:px-6 sm:pt-20">
      {/* A brasa fica só no cabeçalho: um `overflow-hidden` mais acima
          mataria o `position: sticky` da barra de filtros. */}
      <header className="relative">
        <span
          aria-hidden="true"
          className="pp-heat -left-24 -top-36 h-72 w-72 opacity-70"
        />

        <Reveal>
          <p className="pp-label flex flex-wrap items-center gap-3">
            <span className="pp-live-dot" aria-hidden="true" />
            Casting aberto · atualizado toda semana
          </p>

          <h1 className="pp-display mt-5 text-[clamp(2.75rem,8.5vw,6.5rem)]">
            <span className="block text-[var(--pp-chalk)]">O casting</span>
            <span className="pp-hot-text block">da noite</span>
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-relaxed text-[var(--pp-mute)] sm:text-lg">
            Gente que já vive a pista: dancehall, trap, moda de rua,
            gastronomia noturna. Filtra por vibe, faixa e alcance, abre o
            perfil de quem interessa e fecha o orçamento sem reunião.
          </p>
        </Reveal>

        <Reveal delay={0.12}>
          <dl className="mt-10 grid max-w-2xl grid-cols-1 gap-px overflow-hidden rounded-2xl border border-[var(--pp-glass-brd)] bg-[var(--pp-glass-brd)] sm:grid-cols-3">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="bg-[color-mix(in_oklab,var(--pp-graphite)_92%,transparent)] px-5 py-4"
              >
                <dt className="pp-label text-[0.6rem]">{stat.label}</dt>
                <dd className="mt-1.5 font-[family-name:var(--pp-font-display)] text-3xl font-black leading-none tracking-[-0.04em] text-[var(--pp-chalk)]">
                  <CountUp value={stat.value} format={stat.format} />
                </dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </header>

      {source === "demo" && (
        <div className="mt-10">
          <DemoNotice />
        </div>
      )}

      <div className="mt-12">
        <CreatorFilters creators={creators} />
      </div>
    </div>
  );
}
