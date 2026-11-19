import type { Metadata } from "next";
import Link from "next/link";

import {
  getEffectivePermissions,
  PERMISSION_LABELS,
  requireUser,
  ROLE_LABELS,
  userHasPermission,
} from "@/lib/auth";

export const metadata: Metadata = { title: "QG da Doca" };
export const revalidate = 0;

type ModuleCard = {
  href: string;
  tag: string;
  title: string;
  description: string;
  accentClass: string;
  tagColorClass: string;
  badge?: string;
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const user = await requireUser("/dashboard");
  const { erro } = await searchParams;

  const firstName = (
    user.full_name?.trim() ||
    user.email?.split("@")[0] ||
    "equipe"
  )
    .split(/\s+/)[0]
    .toUpperCase();

  const effectivePermissions = getEffectivePermissions(user);
  const cards: ModuleCard[] = [];

  if (userHasPermission(user, "door_checkin")) {
    cards.push({
      href: "/dashboard/portaria",
      tag: "Operação de Porta",
      title: "Portaria & Check-in Mobile",
      description:
        "Check-in rápido na entrada, busca na lista nominal de aniversariantes e registro de pagantes extras.",
      accentClass: "neon-orange",
      tagColorClass: "text-neon-orange",
    });
  }

  if (userHasPermission(user, "vip_crm")) {
    cards.push({
      href: "/dashboard/comercial",
      tag: "Relacionamento & VIP",
      title: "Comercial & Listas VIP",
      description:
        "Acompanhe aniversariantes, envie links da lista nominal, atualize status e feche reservas.",
      accentClass: "neon-gold",
      tagColorClass: "text-gold-bright",
    });
  }

  if (userHasPermission(user, "camarotes")) {
    cards.push({
      href: "/dashboard/camarotes",
      tag: "Planta da Casa",
      title: "Mapa de Camarotes & Bistrôs",
      description:
        "Controle de disponibilidade de C1–C6 e B1–B7 por evento, negociações e reservas confirmadas.",
      accentClass: "neon-gold",
      tagColorClass: "text-neon-gold",
    });
  }

  if (userHasPermission(user, "events") || userHasPermission(user, "media_mod")) {
    cards.push({
      href: "/dashboard/eventos",
      tag: "Programação & Galeria",
      title: "Agenda, Eventos & Moderação",
      description:
        "Abertura e publicação das noites da casa além da aprovação de fotos e vídeos da pista.",
      accentClass: "neon-orange",
      tagColorClass: "text-neon-orange",
    });
  }

  if (userHasPermission(user, "menu")) {
    cards.push({
      href: "/dashboard/cardapio",
      tag: "Operação de Bar",
      title: "Balcão & Cardápio Ao Vivo",
      description:
        "Atualize categorias, preços e disponibilidade de drinks, garrafas e combos em tempo real.",
      accentClass: "neon-gold",
      tagColorClass: "text-gold-bright",
    });
  }

  if (userHasPermission(user, "upload")) {
    cards.push({
      href: "/dashboard/upload",
      tag: "Cobertura Fotográfica",
      title: "Subir Mídia (Fotógrafos)",
      description:
        "Envie fotos e vídeos das noites direto para o acervo e Google Drive da casa.",
      accentClass: "neon-gold",
      tagColorClass: "text-neon-gold",
    });
  }

  if (userHasPermission(user, "pepper")) {
    cards.push({
      href: "/dashboard/admin/pepper",
      tag: "Agência & Casting",
      title: "Agência Pepper",
      description:
        "Gestão de creators, aprovações de casting, tabela de serviços e orçamentos comerciais.",
      accentClass: "neon-orange",
      tagColorClass: "text-neon-orange",
    });
  }

  if (user.role === "admin" && user.is_approved) {
    cards.push({
      href: "/dashboard/admin",
      tag: "Comando Master",
      title: "QG Admin & Equipe",
      description:
        "Convites internos, cargos, permissões acumuláveis, fila de aprovação e visão geral da casa.",
      accentClass: "neon-orange",
      tagColorClass: "text-neon-orange",
      badge: "MASTER",
    });
  }

  if (user.role === "creator") {
    cards.push({
      href: "/dashboard/creator",
      tag: "Área do Talent",
      title: "Painel Creator Pepper",
      description:
        "Edite sua bio, links, métricas e personalize sua tabela de valores na Agência Pepper.",
      accentClass: "neon-gold",
      tagColorClass: "text-gold-bright",
    });
  }

  cards.push({
    href: "/",
    tag: "Vitrine da Rua",
    title: "Galeria Pública",
    description:
      "Veja a programação, os camarotes, o cardápio e as coberturas como o público enxerga.",
    accentClass: "neon-gold",
    tagColorClass: "text-ash",
  });

  const roleBadgeClass =
    user.role === "admin"
      ? "bg-neon-orange text-void"
      : user.role === "creator"
        ? "bg-concrete text-bone"
        : "bg-neon-gold text-void";

  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <p className="stamp text-neon-orange">QG DA DOCA // CONTROLE DA CASA</p>
      <h1 className="mt-2 font-display text-6xl sm:text-7xl">
        <span className="text-bone">SALVE,</span>{" "}
        <span className="gold-vip">{firstName}</span>
      </h1>

      {erro === "sem-permissao" && (
        <p
          role="alert"
          className="mt-6 border border-neon-red bg-neon-red/10 px-4 py-3 font-tech text-sm text-neon-red"
        >
          Acesso restrito: sua credencial atual não tem permissão para entrar nessa área.
        </p>
      )}

      <div className="mt-7 flex flex-wrap items-center gap-3">
        <span
          className={`skew-tag px-3 py-1 font-tech text-xs font-bold uppercase tracking-[0.18em] ${roleBadgeClass}`}
        >
          {ROLE_LABELS[user.role]}
        </span>

        <span
          className={`skew-tag px-3 py-1 font-tech text-xs font-bold uppercase tracking-[0.18em] ${
            user.is_approved
              ? "bg-gold-bright text-void"
              : "bg-neon-red text-void"
          }`}
        >
          {user.is_approved ? "Liberado" : "Aguardando aprovação"}
        </span>
      </div>

      {user.is_approved && effectivePermissions.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center gap-2 border-y border-concrete/80 py-3">
          <span className="stamp mr-1 text-[0.65rem] text-ash">
            Permissões ativas:
          </span>
          {effectivePermissions.map((perm) => (
            <span
              key={perm}
              className="border border-neon-gold/40 bg-ink px-2.5 py-0.5 font-tech text-[0.68rem] uppercase tracking-wider text-gold-bright"
            >
              {PERMISSION_LABELS[perm]}
            </span>
          ))}
        </div>
      )}

      {!user.is_approved && (
        <div className="glass-vip mt-6 max-w-2xl border-l-4 border-l-neon-red px-5 py-4">
          <p className="stamp text-neon-red">Credencial em análise</p>
          <p className="mt-2 text-sm text-bone/85">
            {user.role === "creator"
              ? "Sua conta está aguardando liberação do admin. Enquanto isso, você já pode abrir o Painel Creator Pepper abaixo para completar seu perfil e acelerar a publicação."
              : "Sua credencial está aguardando liberação do admin da casa. Assim que for aprovada, todos os módulos do seu cargo serão destravados automaticamente aqui."}
          </p>
        </div>
      )}

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card, index) => (
          <Link
            key={card.href}
            href={card.href}
            className={`card-slab ${card.accentClass} group flex flex-col justify-between p-7`}
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <p className={`stamp ${card.tagColorClass}`}>
                  {String(index + 1).padStart(2, "0")} · {card.tag}
                </p>
                {card.badge && (
                  <span className="skew-tag bg-neon-orange px-2 py-0.5 font-tech text-[0.6rem] font-bold tracking-widest text-void">
                    {card.badge}
                  </span>
                )}
              </div>
              <h2 className="mt-3 font-display text-3xl text-bone transition-colors group-hover:text-gold-bright sm:text-4xl">
                {card.title}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-ash">
                {card.description}
              </p>
            </div>

            <span className="stamp mt-6 inline-block text-bone/80 transition-colors group-hover:text-neon-orange">
              Abrir módulo →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
