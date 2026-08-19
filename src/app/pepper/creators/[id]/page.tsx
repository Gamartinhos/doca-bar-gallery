import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CreatorAvatar } from "@/components/pepper/creator-avatar";
import { TIER_LABEL } from "@/components/pepper/creator-card";
import { DemoNotice } from "@/components/pepper/demo-notice";
import { PortfolioGallery } from "@/components/pepper/portfolio-gallery";
import { Reveal } from "@/components/pepper/reveal";
import { SectionHeading } from "@/components/pepper/section-heading";
import { getCurrentUser } from "@/lib/auth";
import {
  getPepperCreator,
  getPepperMedia,
  getPepperServices,
} from "@/lib/pepper/data";
import {
  brl,
  compactNumber,
  instagramUrl,
  tiktokUrl,
} from "@/lib/pepper/format";
import type { PepperCreator } from "@/lib/pepper/types";

export const revalidate = 0;

/** O segmento aceita slug (link do card) ou uuid (redirect interno). */
type Params = Promise<{ id: string }>;

function resumo(creator: PepperCreator): string {
  const reach = creator.followers_instagram + creator.followers_tiktok;
  const cidade = creator.city ? ` · ${creator.city}` : "";
  return `${creator.name} no casting da Pepper${cidade}. ${compactNumber(
    reach,
  )} de alcance somado entre Instagram e TikTok.`;
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { id } = await params;
  const { data: creator } = await getPepperCreator(id);

  if (!creator) return { title: "Creator fora do casting" };

  const descricao = creator.bio ?? resumo(creator);

  return {
    title: creator.name,
    description: descricao,
    openGraph: {
      title: `${creator.name} · PEPPER`,
      description: descricao,
      type: "profile",
      locale: "pt_BR",
      images: creator.cover_url ? [creator.cover_url] : undefined,
    },
  };
}

type Metrica = {
  label: string;
  value: string;
  hint: string;
  href: string | null;
  accent?: boolean;
};

export default async function CreatorProfilePage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  const { data: creator, source } = await getPepperCreator(id);

  if (!creator) notFound();

  const [{ data: media }, { data: services }, user] = await Promise.all([
    getPepperMedia(creator.id),
    getPepperServices(),
    getCurrentUser(),
  ]);

  const isOwner = user !== null && creator.user_id === user.id;
  const isAdmin = user?.role === "admin";
  const reach = creator.followers_instagram + creator.followers_tiktok;
  const primeiroNome = creator.name.split(" ")[0];

  /**
   * O configurador multiplica o preço base do serviço pelo peso do creator
   * (um creator só não pega desconto de casting), então estes valores batem
   * com o que aparece depois em /pepper/orcamento.
   */
  const tabela = services.map((service) => ({
    ...service,
    price: service.base_price * creator.rate_multiplier,
  }));
  const menorPreco =
    tabela.length > 0 ? Math.min(...tabela.map((item) => item.price)) : 0;

  const metricas: Metrica[] = [
    {
      label: "Instagram",
      value: compactNumber(creator.followers_instagram),
      hint: creator.handle ? `@${creator.handle}` : "seguidores",
      href: creator.handle ? instagramUrl(creator.handle) : null,
    },
    {
      label: "TikTok",
      value: compactNumber(creator.followers_tiktok),
      hint: creator.tiktok_handle ? `@${creator.tiktok_handle}` : "seguidores",
      href: creator.tiktok_handle ? tiktokUrl(creator.tiktok_handle) : null,
    },
    {
      label: "Views médias",
      value: compactNumber(creator.avg_views),
      hint: "por publicação",
      href: null,
    },
    {
      label: "Engajamento",
      value: `${creator.engagement_rate.toFixed(1).replace(".", ",")}%`,
      hint: "média do último mês",
      href: null,
      accent: true,
    },
  ];

  return (
    <article className="pb-28">
      {/* ------------------------------ capa ------------------------------ */}
      <header className="relative">
        <div className="relative h-[44vh] min-h-[320px] w-full overflow-hidden sm:h-[56vh]">
          {creator.cover_url ? (
            <Image
              src={creator.cover_url}
              alt={`Capa de ${creator.name}`}
              fill
              priority
              unoptimized={!creator.cover_url.startsWith("/")}
              sizes="100vw"
              className="object-cover object-center opacity-80"
            />
          ) : (
            <div className="pp-asphalt absolute inset-0" />
          )}

          {/* Degradê que funde a capa com o fundo da página. */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-[var(--pp-ink)] via-[var(--pp-ink)]/45 to-[var(--pp-ink)]/15"
          />
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-52 bg-gradient-to-t from-[var(--pp-ink)] to-transparent"
          />
          <span
            aria-hidden="true"
            className="pp-heat -right-24 -top-16 h-80 w-80 opacity-40"
          />
        </div>

        <div className="relative mx-auto -mt-24 max-w-7xl px-4 sm:-mt-28 sm:px-6">
          <Reveal>
            <Link
              href="/pepper/creators"
              className="pp-label inline-flex items-center gap-2 transition-colors duration-150 hover:text-[var(--pp-chalk)]"
            >
              <span aria-hidden="true">←</span> Voltar pro casting
            </Link>

            <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-end sm:gap-7">
              <CreatorAvatar
                name={creator.name}
                slug={creator.slug}
                src={creator.avatar_url}
                size={124}
                className="shadow-[0_22px_54px_-20px_var(--pp-pepper)]"
              />

              <div className="min-w-0 flex-1">
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <span className="pp-chip pp-chip-hot">
                    {TIER_LABEL[creator.tier]}
                  </span>
                  {creator.city && (
                    <span className="pp-chip">{creator.city}</span>
                  )}
                </div>

                <h1 className="pp-display text-[clamp(2.5rem,8vw,5.75rem)] text-[var(--pp-chalk)]">
                  {creator.name}
                </h1>

                {creator.handle && (
                  <p className="pp-label pp-label-hot mt-4">
                    @{creator.handle}
                  </p>
                )}
              </div>
            </div>

            {creator.tags.length > 0 && (
              <ul className="mt-6 flex flex-wrap gap-2">
                {creator.tags.map((tag) => (
                  <li key={tag} className="pp-chip">
                    {tag}
                  </li>
                ))}
              </ul>
            )}
          </Reveal>
        </div>
      </header>

      {/* --------------------------- métricas --------------------------- */}
      <div className="mx-auto mt-10 max-w-7xl px-4 sm:px-6">
        <Reveal delay={0.08}>
          <dl className="pp-glass-lit grid grid-cols-2 gap-y-7 rounded-2xl p-6 sm:grid-cols-4 sm:gap-y-0 sm:p-7">
            {metricas.map((metrica) => (
              <div
                key={metrica.label}
                className="sm:border-l sm:border-[var(--pp-glass-brd)] sm:px-6 sm:first:border-l-0 sm:first:pl-0 sm:last:pr-0"
              >
                <dt className="pp-label text-[0.58rem]">{metrica.label}</dt>
                <dd className="mt-2.5">
                  <span
                    className={`block font-[family-name:var(--pp-font-display)] text-[clamp(1.6rem,4vw,2.4rem)] font-black leading-none tracking-[-0.045em] ${
                      metrica.accent
                        ? "text-[var(--pp-ember)]"
                        : "text-[var(--pp-chalk)]"
                    }`}
                  >
                    {metrica.value}
                  </span>

                  {metrica.href ? (
                    <a
                      href={metrica.href}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Abrir o ${metrica.label} de ${creator.name} em nova aba`}
                      className="mt-2.5 inline-flex items-center gap-1.5 text-[0.82rem] text-[var(--pp-mute)] transition-colors duration-150 hover:text-[var(--pp-pepper-soft)]"
                    >
                      {metrica.hint}
                      <span aria-hidden="true">↗</span>
                    </a>
                  ) : (
                    <span className="mt-2.5 block text-[0.82rem] text-[var(--pp-mute)]">
                      {metrica.hint}
                    </span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </div>

      {source === "demo" && (
        <div className="mx-auto mt-6 max-w-7xl px-4 sm:px-6">
          <DemoNotice what="perfil" />
        </div>
      )}

      {/* Painel de quem manda na ficha: o próprio creator ou um admin. */}
      {(isOwner || isAdmin) && (
        <div className="mx-auto mt-6 max-w-7xl px-4 sm:px-6">
          <div className="pp-glass flex flex-wrap items-center justify-between gap-4 rounded-xl px-4 py-3">
            <p className="flex items-center gap-2.5 text-sm text-[var(--pp-mute)]">
              <span aria-hidden="true" className="pp-live-dot" />
              {isOwner
                ? "Esta ficha é sua — o portfólio se atualiza pelo estúdio."
                : "Acesso de admin: você pode editar o portfólio deste creator."}
            </p>
            <Link
              href="/pepper/estudio"
              className="pp-btn-ghost !px-4 !py-2 !text-[0.72rem]"
            >
              Gerenciar portfólio
            </Link>
          </div>
        </div>
      )}

      {/* ---------------------- sobre + contratar ---------------------- */}
      <section className="mx-auto mt-16 max-w-7xl px-4 sm:mt-20 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-14">
          <Reveal className="min-w-0">
            <p className="pp-label mb-5">Sobre</p>
            <p className="max-w-[65ch] text-lg leading-relaxed text-[var(--pp-mute)] sm:text-xl">
              {creator.bio ?? resumo(creator)}
            </p>

            <dl className="mt-10 grid max-w-[65ch] grid-cols-2 gap-6 border-t border-[var(--pp-glass-brd)] pt-8 sm:grid-cols-3">
              <div>
                <dt className="pp-label text-[0.58rem]">Alcance somado</dt>
                <dd className="mt-2 font-[family-name:var(--pp-font-display)] text-2xl font-black leading-none text-[var(--pp-chalk)]">
                  {compactNumber(reach)}
                </dd>
              </div>
              <div>
                <dt className="pp-label text-[0.58rem]">Faixa no casting</dt>
                <dd className="mt-2 font-[family-name:var(--pp-font-display)] text-2xl font-black uppercase leading-none text-[var(--pp-chalk)]">
                  {TIER_LABEL[creator.tier]}
                </dd>
              </div>
              <div>
                <dt className="pp-label text-[0.58rem]">Peças no ar</dt>
                <dd className="mt-2 font-[family-name:var(--pp-font-display)] text-2xl font-black leading-none text-[var(--pp-chalk)]">
                  {media.length}
                </dd>
              </div>
            </dl>
          </Reveal>

          <Reveal delay={0.1} className="lg:sticky lg:top-24 lg:self-start">
            <aside className="pp-glass-lit relative overflow-hidden rounded-2xl p-6">
              <span
                aria-hidden="true"
                className="pp-heat -right-16 -top-20 h-48 w-48 opacity-40"
              />

              <div className="relative">
                <p className="pp-label pp-label-hot">Contratar</p>
                <h2 className="mt-3 text-[clamp(1.6rem,3vw,2.1rem)] text-[var(--pp-chalk)]">
                  Fechar com {primeiroNome}
                </h2>
                <p className="mt-4 text-sm leading-relaxed text-[var(--pp-mute)]">
                  Roteiro alinhado com a marca, gravação, edição e publicação no
                  perfil do creator. Corte aprovado por você antes de subir.
                </p>

                {tabela.length > 0 && (
                  <>
                    <p className="pp-label mt-7 text-[0.58rem]">A partir de</p>
                    <p className="pp-hot-text mt-1.5 font-[family-name:var(--pp-font-display)] text-[2.75rem] font-black leading-none tracking-[-0.045em]">
                      {brl(menorPreco)}
                    </p>

                    <ul className="mt-6 space-y-2.5 border-t border-[var(--pp-glass-brd)] pt-6">
                      {tabela.slice(0, 4).map((item) => (
                        <li
                          key={item.id}
                          className="flex items-baseline justify-between gap-3"
                        >
                          <span className="flex min-w-0 items-baseline gap-2">
                            <span
                              aria-hidden="true"
                              className="text-[var(--pp-ember)]"
                            >
                              {item.icon}
                            </span>
                            <span className="truncate text-sm text-[var(--pp-chalk)]">
                              {item.name}
                            </span>
                          </span>
                          <span className="shrink-0 font-[family-name:var(--pp-font-mono)] text-[0.76rem] text-[var(--pp-mute)]">
                            {brl(item.price)}
                            <span className="text-[var(--pp-faint)]">
                              /{item.unit}
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                <Link
                  href={`/pepper/orcamento?creator=${creator.slug}`}
                  className="pp-btn mt-7 w-full"
                >
                  Montar orçamento
                </Link>

                <p className="mt-3.5 text-[0.72rem] leading-relaxed text-[var(--pp-faint)]">
                  Valores já com o peso de casting de {primeiroNome}. Prazo,
                  direitos de uso e exclusividade fecham no configurador.
                </p>
              </div>
            </aside>
          </Reveal>
        </div>
      </section>

      {/* --------------------------- portfólio --------------------------- */}
      <section id="portfolio" className="mx-auto mt-20 max-w-7xl px-4 sm:mt-28 sm:px-6">
        <SectionHeading
          index="01"
          eyebrow="Portfólio"
          title="Material"
          accent="no ar"
          description="Peças do portfólio da Pepper e registros que também vivem na galeria do Doca Bar."
        />
        <PortfolioGallery items={media} creatorName={creator.name} />
      </section>
    </article>
  );
}
