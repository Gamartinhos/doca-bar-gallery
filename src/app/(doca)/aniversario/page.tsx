import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import type { DocaEvent } from "@/lib/database.types";
import { createClient } from "@/utils/supabase/server";

import { BirthdayClient } from "./birthday-client";

export const revalidate = 0;

export const metadata: Metadata = {
  title: "Aniversário VIP",
  description:
    "Comemore seu aniversário na Doca Bar na Lapa. Escale os benefícios da sua lista VIP, garanta drinks, garrafa, combo ou camarote e finalize direto no WhatsApp.",
};

type UpcomingEventSummary = Pick<DocaEvent, "id" | "title" | "date" | "slug">;

function getSaoPauloTodayIso(): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value ?? "2026";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

const QUICK_RULES = [
  {
    code: "+18",
    title: "Proibido menores de 18 anos",
    detail:
      "Entrada permitida somente com documento oficial original com foto.",
  },
  {
    code: "BONDE",
    title: "Benefícios liberados conforme a entrada dos convidados pagantes da lista",
    detail:
      "Cada degrau acende na pista de acordo com a contagem de pagantes confirmados na portaria.",
  },
  {
    code: "18H",
    title: "Lista deve ser enviada com antecedência",
    detail:
      "Cadastre seu aniversário antes do rolê e envie a lista até às 18h no dia do evento.",
  },
  {
    code: "OPEN BAR",
    title: "Não válido para eventos Open Bar",
    detail:
      "Os benefícios da escadinha não se aplicam em noites com formato Open Bar.",
  },
];

export default async function AniversarioPage() {
  const supabase = await createClient();
  const today = getSaoPauloTodayIso();

  const { data: eventsData } = await supabase
    .from("events")
    .select("id, title, date, slug")
    .eq("is_published", true)
    .gte("date", today)
    .order("date", { ascending: true });

  const upcomingEvents = (eventsData ?? []) as UpcomingEventSummary[];

  return (
    <>
      {/* ================= HERO RAUL UNDERGROUND ================= */}
      <section className="concrete relative overflow-hidden border-b border-concrete">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -left-8 top-10 select-none font-tag text-6xl text-neon-orange/12 sm:text-8xl"
        >
          noite vip
        </span>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-4 bottom-12 select-none font-tag text-6xl text-neon-gold/12 sm:text-8xl"
        >
          bonde na pista
        </span>

        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1fr_280px]">
          <div>
            <p className="stamp animate-rise text-neon-gold">
              ▸ Lapa · São Paulo · Cadastro Prévio
            </p>
            <h1 className="animate-rise mt-4 font-display text-[clamp(3.2rem,12vw,7.5rem)] leading-[0.8]">
              <span className="chromatic block">COMEMORE SEU</span>
              <span className="gold-vip block">ANIVERSÁRIO</span>
              <span className="neon neon-orange block">NA DOCA</span>
            </h1>

            <p className="animate-rise mt-6 max-w-xl text-lg leading-relaxed text-bone/80">
              Válido mediante cadastro prévio. Escolha a meta do seu bonde na
              escadinha abaixo, desbloqueie drinks, garrafa, combo ou camarote e
              feche direto no WhatsApp da casa.
            </p>

            <div className="animate-rise mt-8 flex flex-wrap gap-3">
              <a href="#escadinha" className="btn-gold">
                Montar minha lista VIP
              </a>
              <a href="#regras-aniversario" className="btn-ghost neon-orange">
                Regras rápidas
              </a>
            </div>
          </div>

          <div className="mx-auto w-56 sm:w-64 lg:w-full">
            <div className="tape glass-vip relative aspect-square overflow-hidden lg:aspect-[4/5]">
              <Image
                src="/id-visual/capa-aniversario.jfif"
                alt="Aniversário VIP na Doca Bar"
                fill
                unoptimized
                priority
                sizes="(max-width: 1024px) 256px, 280px"
                className="object-cover object-center"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-void via-void/85 to-transparent p-4 text-center">
                <p className="font-tech text-[0.65rem] font-bold uppercase tracking-[0.22em] text-gold-bright">
                  VIP · Drinks · Camarote
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="hazard h-1 opacity-75" aria-hidden="true" />
      </section>

      {/* ================= ESCADINHA + FORMULÁRIO ================= */}
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
        <BirthdayClient upcomingEvents={upcomingEvents} />

        {/* ================= PREVIEW DISCRETO CAMAROTES & TOUR 3D ================= */}
        <aside className="glass-vip mt-12 flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
          <div className="max-w-xl">
            <p className="stamp text-neon-gold">Quer espaço reservado?</p>
            <p className="mt-1 font-display text-2xl text-bone sm:text-3xl">
              Conheça os Camarotes &amp; explore a casa em 3D
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/camarotes"
              className="btn-ghost neon-gold !px-4 !py-2 !text-sm"
            >
              Ver Camarotes →
            </Link>
            <a
              href="https://doca-tour-3d.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost neon-orange !px-4 !py-2 !text-sm"
            >
              Tour 3D ↗
            </a>
          </div>
        </aside>
      </div>

      {/* ================= RODAPÉ DE REGRAS RÁPIDAS ================= */}
      <section
        id="regras-aniversario"
        aria-labelledby="regras-heading"
        className="border-t border-concrete bg-ink/85"
      >
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
          <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3 border-b border-concrete pb-3">
            <h2 id="regras-heading" className="font-display text-3xl sm:text-4xl">
              <span className="text-bone">REGRAS</span>{" "}
              <span className="text-neon-orange">RÁPIDAS</span>
            </h2>
            <p className="stamp text-[0.68rem]">
              Viela Ema Ângelo Murari, 8 · Lapa, SP
            </p>
          </div>

          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {QUICK_RULES.map((rule) => (
              <li
                key={rule.code}
                className="border border-concrete bg-void/70 p-4"
              >
                <span className="inline-block border border-neon-red/50 bg-neon-red/10 px-2 py-0.5 font-tech text-[0.65rem] font-bold uppercase tracking-[0.2em] text-neon-red">
                  {rule.code}
                </span>
                <h3 className="mt-3 font-display text-xl leading-snug text-bone">
                  {rule.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ash">
                  {rule.detail}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
