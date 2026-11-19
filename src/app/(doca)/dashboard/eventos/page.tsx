import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { requireUser, userHasPermission } from "@/lib/auth";
import type {
  DocaEvent,
  DocaMedia,
  DocaUser,
  EventLead,
  MediaStatus,
} from "@/lib/database.types";
import { createClient } from "@/utils/supabase/server";

import { deleteEvent, togglePublished } from "./actions";
import {
  DeleteEventButton,
  EventForm,
  EventLeadsFilter,
  MediaModerationSection,
  type MediaStatusFilter,
  type ModeratedMediaItem,
} from "./event-form";

export const metadata: Metadata = {
  title: "Eventos & Moderação · QG da Doca",
};
export const revalidate = 0;

function formatPhoneDisplay(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.length >= 12 && digits.startsWith("55")) {
    digits = digits.slice(2);
  }
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return raw;
}

function buildEventLeadWhatsappUrl(lead: EventLead, eventTitle: string): string {
  const digits = lead.whatsapp.replace(/\D/g, "");
  const phoneWithCountry =
    digits.startsWith("55") && digits.length >= 12 ? digits : `55${digits}`;
  const text = `Salve ${lead.name}! Recebemos seu cadastro na Lista VIP do evento "${eventTitle}" na Doca Bar. Bora confirmar sua presença!`;
  return `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(text)}`;
}

function toMediaStatusFilter(raw: string | undefined): MediaStatusFilter {
  const valid: readonly string[] = ["pending", "approved", "rejected"];
  return raw && valid.includes(raw) ? (raw as MediaStatus) : "all";
}

export default async function DashboardEventosPage({
  searchParams,
}: {
  searchParams: Promise<{
    edit?: string;
    leadEvent?: string;
    mediaEvent?: string;
    mediaStatus?: string;
  }>;
}) {
  const user = await requireUser("/dashboard/eventos");
  const canManageEvents = userHasPermission(user, "events");
  const canModerateMedia = userHasPermission(user, "media_mod");

  if (!canManageEvents && !canModerateMedia) {
    redirect("/dashboard?erro=sem-permissao");
  }

  const supabase = await createClient();
  const {
    edit: editId,
    leadEvent: leadEventParam,
    mediaEvent: mediaEventParam,
    mediaStatus: mediaStatusParam,
  } = await searchParams;

  const { data: eventsData } = await supabase
    .from("events")
    .select("*")
    .order("date", { ascending: false });

  const events = (eventsData ?? []) as DocaEvent[];
  const eventById = new Map(events.map((e) => [e.id, e]));

  const editEvent =
    canManageEvents && editId
      ? events.find((e) => e.id === editId)
      : undefined;

  // ---- Dados de Eventos + Leads ----
  let leads: EventLead[] = [];
  const mediaCountByEvent = new Map<string, number>();
  const activeLeadEventId =
    leadEventParam && eventById.has(leadEventParam) ? leadEventParam : "all";

  if (canManageEvents) {
    let leadsQuery = supabase
      .from("event_leads")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (activeLeadEventId !== "all") {
      leadsQuery = leadsQuery.eq("event_id", activeLeadEventId);
    }

    const [{ data: leadsData }, { data: mediaIdRows }] = await Promise.all([
      leadsQuery,
      supabase.from("media").select("event_id"),
    ]);

    leads = (leadsData ?? []) as EventLead[];
    for (const row of (mediaIdRows ?? []) as { event_id: string }[]) {
      mediaCountByEvent.set(
        row.event_id,
        (mediaCountByEvent.get(row.event_id) ?? 0) + 1,
      );
    }
  }

  // ---- Dados de Moderação Visual de Mídia ----
  const activeMediaEventId =
    mediaEventParam && eventById.has(mediaEventParam) ? mediaEventParam : "all";
  const activeMediaStatus = toMediaStatusFilter(mediaStatusParam);

  let moderatedMedia: ModeratedMediaItem[] = [];
  let mediaStatusCounts = {
    all: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  };

  if (canModerateMedia) {
    let mediaQuery = supabase
      .from("media")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(120);

    if (activeMediaEventId !== "all") {
      mediaQuery = mediaQuery.eq("event_id", activeMediaEventId);
    }
    if (activeMediaStatus !== "all") {
      mediaQuery = mediaQuery.eq("status", activeMediaStatus);
    }

    const makeCountQuery = (status?: MediaStatus) => {
      let q = supabase
        .from("media")
        .select("*", { count: "exact", head: true });
      if (activeMediaEventId !== "all") {
        q = q.eq("event_id", activeMediaEventId);
      }
      if (status) {
        q = q.eq("status", status);
      }
      return q;
    };

    const [
      { data: mediaRows },
      { count: countAll },
      { count: countPending },
      { count: countApproved },
      { count: countRejected },
    ] = await Promise.all([
      mediaQuery,
      makeCountQuery(),
      makeCountQuery("pending"),
      makeCountQuery("approved"),
      makeCountQuery("rejected"),
    ]);

    const rawMedia = (mediaRows ?? []) as DocaMedia[];
    mediaStatusCounts = {
      all: countAll ?? 0,
      pending: countPending ?? 0,
      approved: countApproved ?? 0,
      rejected: countRejected ?? 0,
    };

    const photographerIds = [
      ...new Set(rawMedia.map((m) => m.photographer_id).filter(Boolean)),
    ] as string[];

    const authorById = new Map<string, string>();
    if (photographerIds.length > 0) {
      const { data: people } = await supabase
        .from("users")
        .select("id, full_name")
        .in("id", photographerIds);

      for (const person of (people ?? []) as Pick<
        DocaUser,
        "id" | "full_name"
      >[]) {
        if (person.full_name) authorById.set(person.id, person.full_name);
      }
    }

    moderatedMedia = rawMedia.map((m) => {
      const ev = eventById.get(m.event_id);
      return {
        id: m.id,
        event_id: m.event_id,
        event_title: ev?.title ?? "Evento removido",
        event_slug: ev?.slug ?? null,
        author_name: m.photographer_id
          ? (authorById.get(m.photographer_id) ?? null)
          : null,
        url: m.url,
        thumbnail_url: m.thumbnail_url,
        type: m.type,
        caption: m.caption,
        status: m.status,
        drive_file_id: m.drive_file_id,
        storage_path: m.storage_path,
        created_at: m.created_at,
      };
    });
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/dashboard"
            className="stamp inline-block text-ash transition-colors hover:text-gold-bright"
          >
            ← Voltar ao QG
          </Link>
          <p className="stamp mt-4 text-neon-orange">
            ▸ Programação &amp; Acervo da Casa
          </p>
          <h1 className="mt-2 font-display text-5xl sm:text-7xl">
            <span className="text-bone">EVENTOS</span>{" "}
            <span className="neon neon-orange">&amp; GALERIA</span>
          </h1>
        </div>

        <div className="flex flex-wrap gap-2">
          {userHasPermission(user, "upload") && (
            <Link
              href="/dashboard/upload"
              className="btn-ghost neon-gold !px-4 !py-2.5 !text-xs"
            >
              Subir Mídia →
            </Link>
          )}
          <Link href="/" className="btn-ghost !px-4 !py-2.5 !text-xs">
            Ver Site Público ↗
          </Link>
        </div>
      </div>

      {/* ================= GESTÃO DE EVENTOS & LEADS ================= */}
      {canManageEvents && (
        <div className="grid gap-14 lg:grid-cols-[1fr_380px]">
          <div className="space-y-14">
            {/* Lista de Eventos */}
            <section>
              <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2 border-b border-concrete pb-3">
                <h2 className="font-display text-4xl">
                  <span className="text-bone">AS</span>{" "}
                  <span className="gold-vip">NOITES</span>
                </h2>
                <span className="stamp text-ash">
                  {events.length} {events.length === 1 ? "evento" : "eventos"}
                </span>
              </div>

              {events.length === 0 ? (
                <p className="stamp py-6">Nenhum evento aberto.</p>
              ) : (
                <ul className="space-y-3">
                  {events.map((e) => (
                    <li
                      key={e.id}
                      className="flex flex-wrap items-center justify-between gap-3 border border-concrete bg-ink px-4 py-3"
                    >
                      <div className="min-w-0">
                        <Link
                          href={`/evento/${e.slug}`}
                          className="block truncate font-display text-2xl text-bone hover:text-gold-bright"
                        >
                          {e.title}
                        </Link>
                        <p className="stamp">
                          {new Date(`${e.date}T12:00:00`).toLocaleDateString(
                            "pt-BR",
                          )}{" "}
                          · {mediaCountByEvent.get(e.id) ?? 0} mídias ·{" "}
                          <span
                            className={
                              e.is_published
                                ? "text-emerald-300"
                                : "text-neon-red"
                            }
                          >
                            {e.is_published ? "publicado" : "oculto"}
                          </span>
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <form action={togglePublished}>
                          <input type="hidden" name="event_id" value={e.id} />
                          <input
                            type="hidden"
                            name="publish"
                            value={e.is_published ? "false" : "true"}
                          />
                          <button
                            type="submit"
                            className="btn-ghost neon-gold !px-3 !py-1.5 !text-xs"
                          >
                            {e.is_published ? "Ocultar" : "Publicar"}
                          </button>
                        </form>

                        <Link
                          href={`/dashboard/eventos?edit=${e.id}`}
                          className="btn-ghost neon-orange !px-3 !py-1.5 !text-xs"
                        >
                          Editar
                        </Link>

                        <form action={deleteEvent}>
                          <input type="hidden" name="event_id" value={e.id} />
                          <DeleteEventButton eventTitle={e.title} />
                        </form>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Leads Capturados por Evento */}
            <section>
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-concrete pb-3">
                <div>
                  <h2 className="font-display text-4xl">
                    <span className="text-bone">LEADS</span>{" "}
                    <span className="neon neon-orange">POR EVENTO</span>
                  </h2>
                  <p className="stamp mt-1 text-[0.62rem] text-ash">
                    Cadastros da Lista VIP capturados nas páginas dos eventos
                  </p>
                </div>

                <Suspense fallback={null}>
                  <EventLeadsFilter
                    events={events}
                    selectedEventId={activeLeadEventId}
                  />
                </Suspense>
              </div>

              {leads.length === 0 ? (
                <p className="stamp py-6">
                  Nenhum lead capturado com esse filtro.
                </p>
              ) : (
                <ul className="space-y-2.5">
                  {leads.map((lead) => {
                    const ev = eventById.get(lead.event_id);
                    const eventTitle = ev?.title ?? "Evento";
                    return (
                      <li
                        key={lead.id}
                        className="glass-vip flex flex-wrap items-center justify-between gap-4 border border-concrete px-4 py-3.5"
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate font-display text-2xl text-bone">
                              {lead.name}
                            </p>
                            <span className="border border-neon-gold/45 bg-neon-gold/10 px-2 py-0.5 font-tech text-[0.6rem] font-bold uppercase tracking-wider text-gold-bright">
                              {eventTitle}
                            </span>
                          </div>
                          <p className="font-tech text-xs text-bone/85">
                            {formatPhoneDisplay(lead.whatsapp)} ·{" "}
                            <span className="text-ash">
                              {new Date(lead.created_at).toLocaleDateString(
                                "pt-BR",
                              )}
                            </span>
                          </p>
                        </div>

                        <a
                          href={buildEventLeadWhatsappUrl(lead, eventTitle)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-gold shrink-0 !px-4 !py-2 !text-xs"
                        >
                          Chamar no WhatsApp ↗
                        </a>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>

          {/* Formulário Abrir / Editar Evento */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="tape concrete border border-concrete p-6">
              <h2 className="mb-6 font-display text-3xl">
                <span className="neon neon-orange">
                  {editEvent ? "EDITAR" : "ABRIR"}
                </span>{" "}
                <span className="text-bone">NOITE</span>
              </h2>
              <EventForm
                key={editEvent?.id || "new"}
                initialData={editEvent}
              />
            </div>
          </aside>
        </div>
      )}

      {/* ================= MODERAÇÃO VISUAL DA GALERIA ================= */}
      {canModerateMedia && (
        <div className={canManageEvents ? "mt-20 border-t border-concrete pt-14" : ""}>
          <Suspense fallback={null}>
            <MediaModerationSection
              mediaItems={moderatedMedia}
              events={events}
              activeEventId={activeMediaEventId}
              activeStatus={activeMediaStatus}
              statusCounts={mediaStatusCounts}
            />
          </Suspense>
        </div>
      )}
    </div>
  );
}
