import Image from "next/image";
import Link from "next/link";

import { EventCard } from "@/components/event-card";
import { GalleryGrid, type GalleryItem } from "@/components/gallery-grid";
import { Marquee } from "@/components/marquee";
import type { DocaEvent, DocaMedia } from "@/lib/database.types";
import { createClient } from "@/utils/supabase/server";

export const revalidate = 0;

const BIRTHDAY_TIERS = [
  {
    step: "Cadastro",
    reward: "VIP + 1 Acompanhante + 1 Drink",
    highlight: false,
  },
  {
    step: "5 pagantes",
    reward: "+1 Drink",
    highlight: false,
  },
  {
    step: "10 pagantes",
    reward: "1 Garrafa Vodka ou Gin",
    highlight: false,
  },
  {
    step: "15 pagantes",
    reward: "1 Combo",
    highlight: false,
  },
  {
    step: "20+ pagantes",
    reward: "1 Camarote + 1 Combo",
    highlight: true,
  },
] as const;

export default async function HomePage() {
  const supabase = await createClient();

  const { data: eventsData } = await supabase
    .from("events")
    .select("*")
    .eq("is_published", true)
    .order("date", { ascending: false });

  const events = (eventsData ?? []) as DocaEvent[];
  const today = new Date().toISOString().split("T")[0];
  const upcomingEvents = events.filter((e) => e.date >= today).reverse(); // closest first
  const pastEvents = events.filter((e) => e.date < today);
  const publishedIds = pastEvents.map((e) => e.id);

  // Só mostra mídia de evento publicado: esconder um evento tem que
  // esconder as fotos dele também.
  const [{ data: mediaData }, { data: countRows }] =
    publishedIds.length === 0
      ? [{ data: [] }, { data: [] }]
      : await Promise.all([
          supabase
            .from("media")
            .select("*")
            .eq("status", "approved")
            .in("event_id", publishedIds)
            .order("created_at", { ascending: false })
            .limit(24),
          supabase
            .from("media")
            .select("event_id")
            .eq("status", "approved")
            .in("event_id", publishedIds),
        ]);

  const media = (mediaData ?? []) as DocaMedia[];

  const counts = new Map<string, number>();
  for (const row of (countRows ?? []) as { event_id: string }[]) {
    counts.set(row.event_id, (counts.get(row.event_id) ?? 0) + 1);
  }

  const eventTitleById = new Map(events.map((e) => [e.id, e.title]));

  const galleryItems: GalleryItem[] = media.map((m) => ({
    id: m.id,
    url: m.url,
    thumbnail_url: m.thumbnail_url,
    type: m.type,
    caption: m.caption,
    eventTitle: eventTitleById.get(m.event_id) ?? null,
  }));

  const marqueeItems =
    events.length > 0
      ? events.slice(0, 8).map((e) => e.title.toUpperCase())
      : ["BAILE DO BIGODE", "DUB JUNGLE SYSTEM", "QUINTA FEVER", "B.O.S.S"];

  return (
    <>
      {/* ================= BLOCO 1: HERO RAUL UNDERGROUND ================= */}
      <section className="concrete relative overflow-hidden border-b border-concrete">
        {/* pichações sutis de fundo */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -left-8 top-10 select-none font-tag text-7xl text-neon-orange/12 sm:text-9xl"
        >
          sem flash
        </span>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-4 bottom-16 select-none font-tag text-6xl text-neon-gold/12 sm:text-8xl"
        >
          lapa underground
        </span>

        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:py-28">
          <div className="grid gap-10 lg:grid-cols-[1fr_280px] lg:items-center">
            <div>
              <p className="stamp animate-rise mb-5 text-gold-bright">
                ▸ Viela Ema Ângelo Murari, 8 · Lapa · São Paulo
              </p>

              <h1 className="animate-rise font-display text-[clamp(3.3rem,13vw,9.4rem)] leading-[0.78] tracking-tighter">
                <span className="chromatic block">DOCA BAR</span>
                <span className="gold-vip block">SUBA PRO VIP</span>
                <span className="neon neon-orange block">VIVA A PISTA</span>
              </h1>

              <p className="animate-rise mt-7 max-w-xl text-lg leading-relaxed text-bone/80">
                Rua, concreto e grave alto na Lapa. Viva a pista sem filtro ou
                feche o bonde nos camarotes VIP com vista privilegiada do palco.
              </p>

              <div className="animate-rise mt-9 flex flex-wrap gap-3.5">
                <Link href="/camarotes" className="btn-gold">
                  Reservar Camarote
                </Link>
                <Link href="/aniversario" className="btn-street neon-orange">
                  Comemorar Aniversário VIP
                </Link>
                <a
                  href="https://doca-tour-3d.vercel.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ghost neon-gold"
                >
                  Entrar no Tour 3D ↗
                </a>
                <Link href="#agenda" className="btn-ghost">
                  Próximas Noites
                </Link>
              </div>
            </div>

            {/* destaque visual discreto com emblema gold */}
            <div className="hidden lg:block">
              <div className="glass-vip p-3">
                <div className="relative aspect-square w-full overflow-hidden border border-neon-gold/30 bg-void">
                  <Image
                    src="/id-visual/logo-gold.jfif"
                    alt="Identidade visual DOCA BAR Lapa"
                    fill
                    unoptimized
                    priority
                    sizes="260px"
                    className="object-cover"
                  />
                </div>
                <p className="stamp mt-3 flex items-center justify-between text-[0.65rem] text-gold-bright">
                  <span>DOCA · LAPA</span>
                  <span className="text-neon-orange">VIP &amp; RUA</span>
                </p>
              </div>
            </div>
          </div>

          <dl className="mt-14 flex flex-wrap gap-x-12 gap-y-6 border-t border-concrete pt-8">
            <div>
              <dt className="stamp">Eventos</dt>
              <dd className="font-display text-5xl text-neon-orange">
                {String(events.length).padStart(2, "0")}
              </dd>
            </div>
            <div>
              <dt className="stamp">Registros</dt>
              <dd className="font-display text-5xl text-gold-bright">
                {String(countRows?.length ?? 0).padStart(3, "0")}
              </dd>
            </div>
            <div>
              <dt className="stamp">Setores VIP</dt>
              <dd className="font-display text-5xl text-neon-gold">
                C1–C6 + Chefe
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <Marquee items={marqueeItems} />

      {/* ================= BLOCO 2: AGENDA — PRÓXIMOS EVENTOS ================= */}
      <section id="agenda" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <header className="mb-10 flex flex-wrap items-end justify-between gap-4 border-b border-concrete pb-5">
          <div>
            <p className="stamp mb-2 text-neon-orange">▸ Programação</p>
            <h2 className="font-display text-5xl sm:text-6xl">
              <span className="text-bone">AGENDA</span>
            </h2>
          </div>
          <p className="stamp text-gold-bright">Próximos eventos na casa</p>
        </header>

        {upcomingEvents.length === 0 ? (
          <div className="fence border border-concrete px-6 py-16 text-center">
            <p className="font-display text-4xl text-bone/75">
              Nenhum evento futuro publicado no momento
            </p>
            <p className="stamp mt-3">
              Fique de olho ou já garanta seu camarote para as próximas noites
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {upcomingEvents.map((event) => (
              <EventCard
                key={event.id}
                slug={event.slug}
                title={event.title}
                date={event.date}
                coverImage={event.cover_image}
                accent={event.accent}
                mediaCount={0}
                isUpcoming={true}
              />
            ))}
          </div>
        )}

        {/* Faixa de atalho rápido */}
        <div className="glass-vip mt-8 flex flex-wrap items-center justify-between gap-4 p-5 sm:px-7 sm:py-5">
          <div>
            <p className="stamp text-gold-bright">Atalho VIP da noite</p>
            <p className="mt-1 font-display text-2xl tracking-wide text-bone sm:text-3xl">
              Garanta camarote ou lista de aniversário antes de esgotar
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/camarotes"
              className="btn-gold !px-5 !py-2.5 !text-sm"
            >
              Reservar Camarote
            </Link>
            <Link
              href="/aniversario"
              className="btn-street neon-orange !px-5 !py-2.5 !text-sm"
            >
              Lista de Aniversário
            </Link>
          </div>
        </div>
      </section>

      {/* ================= BLOCO 3: VITRINE RÁPIDA VIP & TOUR 3D ================= */}
      <section
        id="camarotes"
        className="concrete border-y border-concrete py-20"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <header className="mb-10 flex flex-wrap items-end justify-between gap-4 border-b border-concrete pb-5">
            <div>
              <p className="stamp mb-2 text-gold-bright">
                ▸ Mezanino, Térreo &amp; Visão 360°
              </p>
              <h2 className="font-display text-5xl sm:text-6xl">
                <span className="text-bone">CAMAROTES</span>{" "}
                <span className="gold-vip">VIP</span>
              </h2>
            </div>
            <p className="stamp">Setores exclusivos &amp; Tour 3D</p>
          </header>

          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
            <div className="space-y-5">
              {/* Card Destaque: CAMAROTE DO CHEFE */}
              <article className="glass-vip relative overflow-hidden p-6 sm:p-8">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-block border border-neon-gold/60 bg-neon-gold/15 px-3 py-1 font-tech text-[0.65rem] font-bold uppercase tracking-[0.18em] text-gold-bright">
                    ACESSO RESTRITO • CONVIDADOS &amp; SELEÇÃO DA CASA
                  </span>
                </div>

                <h3 className="gold-vip mt-4 font-display text-4xl sm:text-5xl">
                  CAMAROTE DO CHEFE
                </h3>

                <p className="mt-3 leading-relaxed text-bone/85">
                  Mezanino exclusivo para até 10 pessoas, lustre de cristal,
                  sofá preto e 2 poltronas vermelhas, com grade frontal livre e a
                  visão mais privilegiada da pista e do palco.
                </p>

                <p className="stamp mt-5 text-neon-gold/90">
                  ✦ Indisponível para reserva comum · acesso apenas por convite
                  da casa
                </p>
              </article>

              {/* Cards resumidos: C1-C6 e B1-B7 (sem preço fixo) */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="border border-neon-gold/30 bg-ink/90 p-5 transition-colors hover:border-neon-gold">
                  <p className="stamp text-gold-bright">Térreo &amp; Mezanino</p>
                  <h3 className="mt-2 font-display text-3xl text-bone">
                    Camarotes C1–C6
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-bone/75">
                    Espaços privativos para até 10 pessoas no térreo ou mezanino
                    com atendimento exclusivo no setor.
                  </p>
                </div>

                <div className="border border-neon-orange/30 bg-ink/90 p-5 transition-colors hover:border-neon-orange">
                  <p className="stamp text-neon-orange">Pista &amp; Bar</p>
                  <h3 className="mt-2 font-display text-3xl text-bone">
                    Bistrôs B1–B7
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-bone/75">
                    Mesas bistrô em pontos estratégicos para curtir o som de
                    perto com base garantida pro seu bonde.
                  </p>
                </div>
              </div>
            </div>

            {/* Preview Mapas 3D Oficiais + Botões */}
            <div className="glass-vip p-4 sm:p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <span className="stamp text-gold-bright">
                  Mapas 3D Oficiais · Doca Bar
                </span>
                <span className="stamp text-ash">C1–C6 · B1–B7 · Chefe</span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col border border-concrete bg-void">
                  <div className="border-b border-concrete/80 px-3 py-1.5">
                    <span className="font-tech text-[0.62rem] font-bold uppercase tracking-[0.16em] text-neon-orange">
                      Térreo • C1–C3 + B1–B7
                    </span>
                  </div>
                  <div className="relative aspect-[15/16] w-full overflow-hidden bg-void">
                    <Image
                      src="/id-visual/mapa-terreo.png"
                      alt="Mapa 3D oficial do Térreo da Doca Bar com Camarotes C1 a C3, Bistrôs B1 a B7, Bar e Palco"
                      width={2400}
                      height={2560}
                      unoptimized
                      className="h-full w-full object-contain"
                    />
                  </div>
                </div>

                <div className="flex flex-col border border-neon-gold/35 bg-void">
                  <div className="border-b border-concrete/80 px-3 py-1.5">
                    <span className="font-tech text-[0.62rem] font-bold uppercase tracking-[0.16em] text-gold-bright">
                      Mezanino • Chefe + C4–C6
                    </span>
                  </div>
                  <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-void p-2">
                    <Image
                      src="/id-visual/mapa-mezanino.png"
                      alt="Mapa 3D oficial do Mezanino da Doca Bar com Camarote do Chefe e Camarotes C4 a C6"
                      width={2640}
                      height={1120}
                      unoptimized
                      className="h-auto w-full object-contain"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/camarotes"
                  className="btn-gold flex-1 min-w-[210px] !text-sm sm:!text-base"
                >
                  Ver Todos os Camarotes &amp; Mapas
                </Link>
                <a
                  href="https://doca-tour-3d.vercel.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ghost neon-gold flex-1 min-w-[200px] !text-sm sm:!text-base"
                >
                  Abrir Tour 3D Interativo ↗
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= BLOCO 4: ANIVERSÁRIO "BONDE NO VIP" ================= */}
      <section className="relative overflow-hidden border-b border-neon-orange/30 bg-gradient-to-br from-ink via-smoke to-void py-20">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-12 top-8 select-none font-tag text-7xl text-neon-orange/10 sm:text-9xl"
        >
          bonde no vip
        </div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-[1fr_260px] lg:items-center">
            <div>
              <p className="stamp mb-2 text-neon-orange">
                ▸ Comemore seu aniversário na Doca
              </p>
              <h2 className="font-display text-5xl sm:text-6xl">
                <span className="text-bone">ANIVERSÁRIO</span>{" "}
                <span className="neon neon-orange">&ldquo;BONDE NO VIP&rdquo;</span>
              </h2>
              <p className="mt-4 max-w-2xl text-bone/80">
                Quanto maior o bonde, mais forte fica a mesa. Cadastre sua data
                e destrave prêmios progressivos direto na noite do rolê:
              </p>

              {/* Escadinha de prêmios */}
              <ol className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                {BIRTHDAY_TIERS.map((tier, index) => (
                  <li
                    key={tier.step}
                    className={
                      tier.highlight
                        ? "glass-vip flex flex-col justify-between border-neon-gold p-4"
                        : "flex flex-col justify-between border border-concrete bg-void/80 p-4 transition-colors hover:border-neon-orange/60"
                    }
                  >
                    <span
                      className={`stamp text-[0.65rem] ${
                        tier.highlight ? "text-gold-bright" : "text-neon-orange"
                      }`}
                    >
                      0{index + 1} · {tier.step}
                    </span>
                    <p
                      className={`mt-2 font-display text-xl leading-tight ${
                        tier.highlight ? "gold-vip" : "text-bone"
                      }`}
                    >
                      {tier.reward}
                    </p>
                  </li>
                ))}
              </ol>

              <div className="mt-8">
                <Link href="/aniversario" className="btn-street neon-orange">
                  Garantir Meu Aniversário VIP
                </Link>
              </div>
            </div>

            {/* Thumbnail Capa Aniversário */}
            <div className="mx-auto w-full max-w-[260px]">
              <div className="tape relative aspect-[9/16] w-full overflow-hidden border border-neon-orange/60 bg-void shadow-[0_0_40px_-10px_rgba(255,77,0,0.45)]">
                <Image
                  src="/id-visual/capa-aniversario.jfif"
                  alt="Aniversário Bonde no VIP no Doca Bar"
                  fill
                  unoptimized
                  sizes="260px"
                  className="object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= BLOCO 5: GALERIA DE NOITES & ÚLTIMOS FLASHES ================= */}
      <section
        id="galeria"
        className="border-b border-concrete bg-smoke/30 py-20"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <header className="mb-10 flex flex-wrap items-end justify-between gap-4 border-b border-concrete pb-5">
            <div>
              <p className="stamp mb-2 text-gold-bright">
                ▸ Memória da pista
              </p>
              <h2 className="font-display text-5xl sm:text-6xl">
                <span className="text-bone">GALERIA</span>
              </h2>
            </div>
            <p className="stamp">Arquivo por data · mais recente primeiro</p>
          </header>

          {pastEvents.length === 0 ? (
            <div className="fence border border-concrete px-6 py-20 text-center">
              <p className="font-display text-4xl text-bone/70">
                Nenhuma galeria publicada
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {pastEvents.map((event) => (
                <EventCard
                  key={event.id}
                  slug={event.slug}
                  title={event.title}
                  date={event.date}
                  coverImage={event.cover_image}
                  accent={event.accent}
                  mediaCount={counts.get(event.id) ?? 0}
                />
              ))}
            </div>
          )}

          {/* Últimos Flashes */}
          <div className="mt-20">
            <header className="mb-10 flex flex-wrap items-end justify-between gap-4 border-b border-concrete pb-5">
              <h2 className="font-display text-5xl sm:text-6xl">
                <span className="text-bone">ÚLTIMOS</span>{" "}
                <span className="neon neon-gold">FLASHES</span>
              </h2>
              <p className="stamp">Direto da pista</p>
            </header>

            <GalleryGrid items={galleryItems} />
          </div>

          {/* Banner de credencial para fotógrafos */}
          <div className="fence mt-16 flex flex-wrap items-center justify-between gap-6 border border-concrete bg-void/80 px-6 py-10 sm:px-10">
            <div>
              <h3 className="font-display text-4xl sm:text-5xl">
                <span className="neon neon-orange">FOTOGRAFOU</span>{" "}
                <span className="text-bone">AQUI?</span>
              </h3>
              <p className="mt-3 max-w-md text-bone/75">
                Peça credencial, espere a casa aprovar e suba seu material
                direto na galeria oficial.
              </p>
            </div>
            <Link
              href="/login?modo=cadastro"
              className="btn-street neon-orange"
            >
              Pedir credencial
            </Link>
          </div>
        </div>
      </section>

      {/* ================= BLOCO 6: COMO CHEGAR & REGRAS DA CASA ================= */}
      <section id="info" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-2">
          {/* Como Chegar */}
          <div>
            <header className="mb-6 border-b border-concrete pb-4">
              <p className="stamp mb-2 text-gold-bright">
                ▸ Localização Oficial
              </p>
              <h2 className="font-display text-4xl text-bone sm:text-5xl">
                COMO CHEGAR
              </h2>
            </header>

            <div className="concrete border border-concrete p-6 sm:p-8">
              <p className="stamp text-neon-orange">Endereço</p>
              <p className="mt-2 font-display text-2xl leading-tight text-bone sm:text-3xl">
                Viela Ema Ângelo Murari, 8 — Lapa, São Paulo - SP
              </p>

              <ul className="mt-6 space-y-3 border-t border-concrete pt-5 text-sm text-bone/85">
                <li className="flex items-center gap-3">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    className="h-5 w-5 shrink-0 text-gold-bright"
                    aria-hidden="true"
                  >
                    <rect x="5" y="3" width="14" height="14" rx="2" />
                    <path d="M5 12h14M9 17l-2 4M15 17l2 4M9 8h.01M15 8h.01" />
                  </svg>
                  <span>Estação Lapa — 5 min a pé</span>
                </li>
                <li className="flex items-center gap-3">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    className="h-5 w-5 shrink-0 text-neon-orange"
                    aria-hidden="true"
                  >
                    <path d="M4 6h16v10H4z" />
                    <path d="M4 11h16M7 16v3M17 16v3M7 6V4h10v2" />
                  </svg>
                  <span>Ponto de Ônibus — 3 min a pé</span>
                </li>
              </ul>

              <div className="mt-7 flex flex-wrap gap-3">
                <a
                  href="https://www.google.com/maps/search/?api=1&query=Viela+Ema+Angelo+Murari+8+Lapa+Sao+Paulo"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-gold !px-4 !py-2.5 !text-sm"
                >
                  Google Maps ↗
                </a>
                <a
                  href="https://m.uber.com/ul/?action=setPickup&dropoff[formatted_address]=Viela%20Ema%20Angelo%20Murari%2C%208%20-%20Lapa%2C%20Sao%20Paulo%20-%20SP"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ghost neon-orange !px-4 !py-2.5 !text-sm"
                >
                  Ir de Uber ↗
                </a>
                <a
                  href="https://99app.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ghost neon-gold !px-4 !py-2.5 !text-sm"
                >
                  Ir de 99 ↗
                </a>
              </div>
            </div>
          </div>

          {/* Regras da Casa */}
          <div>
            <header className="mb-6 border-b border-concrete pb-4">
              <p className="stamp mb-2 text-neon-red">
                ▸ Convivência &amp; Portaria
              </p>
              <h2 className="font-display text-4xl text-bone sm:text-5xl">
                REGRAS DA CASA
              </h2>
            </header>

            <ul className="space-y-3">
              <li className="flex items-start gap-4 border border-concrete bg-ink/85 p-4">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  className="mt-0.5 h-6 w-6 shrink-0 text-neon-red"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M8 9v6M12 10.5a1.5 1.5 0 1 1 3 0c0 .8-.7 1.3-1.5 1.5.8.2 1.5.7 1.5 1.5a1.5 1.5 0 1 1-3 0" />
                </svg>
                <div>
                  <h3 className="font-display text-xl text-bone">
                    Proibido Menores de 18 Anos
                  </h3>
                  <p className="mt-0.5 text-sm text-ash">
                    Obrigatório documento original com foto.
                  </p>
                </div>
              </li>

              <li className="flex items-start gap-4 border border-concrete bg-ink/85 p-4">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  className="mt-0.5 h-6 w-6 shrink-0 text-neon-red"
                  aria-hidden="true"
                >
                  <path d="M12 3 4 7v5c0 5 3.5 8.5 8 9 4.5-.5 8-4 8-9V7l-8-4Z" />
                  <path d="m9 9 6 6M15 9l-6 6" />
                </svg>
                <div>
                  <h3 className="font-display text-xl text-bone">
                    Zero Brigas ou Assédio
                  </h3>
                  <p className="mt-0.5 text-sm text-ash">
                    Qualquer desrespeito ou discriminação resulta em expulsão
                    imediata.
                  </p>
                </div>
              </li>

              <li className="flex items-start gap-4 border border-concrete bg-ink/85 p-4">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  className="mt-0.5 h-6 w-6 shrink-0 text-neon-orange"
                  aria-hidden="true"
                >
                  <path d="M8 3h8l-1 13H9L8 3Z" />
                  <path d="M12 16v5M9 21h6M4 4l16 16" />
                </svg>
                <div>
                  <h3 className="font-display text-xl text-bone">
                    Proibido Bebidas de Fora
                  </h3>
                  <p className="mt-0.5 text-sm text-ash">
                    Não é permitida a entrada com bebidas, copos ou objetos
                    cortantes.
                  </p>
                </div>
              </li>

              <li className="flex items-start gap-4 border border-concrete bg-ink/85 p-4">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  className="mt-0.5 h-6 w-6 shrink-0 text-neon-orange"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="m5.6 5.6 12.8 12.8" />
                </svg>
                <div>
                  <h3 className="font-display text-xl text-bone">
                    Proibido Ilícitos
                  </h3>
                  <p className="mt-0.5 text-sm text-ash">
                    Sujeito a revista na entrada.
                  </p>
                </div>
              </li>

              <li className="flex items-start gap-4 border border-concrete bg-ink/85 p-4">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  className="mt-0.5 h-6 w-6 shrink-0 text-gold-bright"
                  aria-hidden="true"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <path d="m16 17 5-5-5-5M21 12H9" />
                </svg>
                <div>
                  <h3 className="font-display text-xl text-bone">
                    Sem Retorno
                  </h3>
                  <p className="mt-0.5 text-sm text-ash">
                    Após a saída, o retorno exige novo ingresso.
                  </p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
