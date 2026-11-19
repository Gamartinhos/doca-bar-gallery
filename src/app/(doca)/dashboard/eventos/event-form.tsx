"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useActionState, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";

import type {
  DocaEvent,
  MediaStatus,
  MediaType,
} from "@/lib/database.types";

import {
  createEvent,
  deleteModeratedMedia,
  setMediaStatus,
  updateEvent,
  type ActionState,
} from "./actions";

const EMPTY: ActionState = {};

const ACCENTS = [
  { value: "purple", label: "Laranja Fogo", swatch: "bg-neon-orange" },
  { value: "blue", label: "Ouro VIP", swatch: "bg-neon-gold" },
  { value: "red", label: "Vermelho", swatch: "bg-neon-red" },
  { value: "green", label: "Ouro Brilho", swatch: "bg-gold-bright" },
];

function Submit({ isEditing }: { isEditing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-street neon-orange w-full"
    >
      {pending
        ? "Salvando…"
        : isEditing
          ? "Salvar Alterações"
          : "Abrir evento"}
    </button>
  );
}

export function EventForm({ initialData }: { initialData?: DocaEvent }) {
  const [state, action] = useActionState(
    initialData ? updateEvent : createEvent,
    EMPTY,
  );

  return (
    <form action={action} className="space-y-4">
      {initialData && (
        <input type="hidden" name="event_id" value={initialData.id} />
      )}
      <div>
        <label htmlFor="title" className="stamp mb-2 block">
          Nome da noite *
        </label>
        <input
          id="title"
          name="title"
          required
          defaultValue={initialData?.title}
          placeholder="Ex.: Baile do Bigode"
          className="field"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="date" className="stamp mb-2 block">
            Data *
          </label>
          <input
            id="date"
            name="date"
            type="date"
            required
            defaultValue={initialData?.date}
            className="field [color-scheme:dark]"
          />
        </div>

        <fieldset>
          <legend className="stamp mb-2">Cor do neon</legend>
          <div className="flex gap-2">
            {ACCENTS.map((a, i) => (
              <label
                key={a.value}
                title={a.label}
                className="group relative flex-1 cursor-pointer"
              >
                <input
                  type="radio"
                  name="accent"
                  value={a.value}
                  defaultChecked={
                    initialData ? initialData.accent === a.value : i === 0
                  }
                  className="peer sr-only"
                />
                <span className="sr-only">{a.label}</span>
                <span
                  aria-hidden="true"
                  className={`block h-10 border border-concrete transition-all peer-checked:scale-105 peer-checked:border-bone peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-neon-gold ${a.swatch}`}
                />
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="space-y-4 rounded-none border border-concrete p-4">
        <div>
          <label htmlFor="cover_image_file" className="stamp mb-2 block">
            Capa / Flyer do Evento (Upload direto)
          </label>
          <input
            id="cover_image_file"
            name="cover_image_file"
            type="file"
            accept="image/*"
            className="field cursor-pointer file:mr-4 file:cursor-pointer file:border-none file:bg-concrete file:px-4 file:py-2 file:font-tech file:text-sm file:text-bone hover:file:bg-neon-orange hover:file:text-void"
          />
          <p className="stamp mt-2 text-ash">
            O flyer vai para a nossa nuvem super rápida. Tamanho máx: 4.5MB.
          </p>
        </div>

        <div className="border-t border-concrete pt-4">
          <label htmlFor="cover_image" className="stamp mb-2 block">
            OU mantenha/cole a URL de um link externo (fallback)
          </label>
          <input
            id="cover_image"
            name="cover_image"
            type="url"
            placeholder="https://…"
            defaultValue={initialData?.cover_image || ""}
            className="field"
          />
        </div>
      </div>

      <div>
        <label htmlFor="description" className="stamp mb-2 block">
          Line-up / descrição
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          placeholder="Quem toca, quem discoteca, o que rola"
          defaultValue={initialData?.description || ""}
          className="field resize-y"
        />
      </div>

      <fieldset>
        <legend className="stamp mb-2">Chamada para Ação (CTA)</legend>
        <select
          name="interest_type"
          className="field mb-4 bg-void/90"
          defaultValue={initialData?.interest_type || "none"}
        >
          <option value="none" className="bg-ink">
            Nenhum
          </option>
          <option value="link" className="bg-ink">
            Link de Ingressos
          </option>
          <option value="count" className="bg-ink">
            Botão &quot;Vou Colar&quot; (Contador)
          </option>
          <option value="lead" className="bg-ink">
            Lista VIP (Captação de Lead)
          </option>
        </select>

        <input
          name="ticket_url"
          type="text"
          placeholder="URL do ingresso OU Código do Widget (<iframe...)"
          defaultValue={initialData?.ticket_url || ""}
          className="field"
        />
      </fieldset>

      <div>
        <label htmlFor="instagram_url" className="stamp mb-2 block">
          URL do Post Oficial no Instagram
        </label>
        <input
          id="instagram_url"
          name="instagram_url"
          type="url"
          placeholder="https://instagram.com/…"
          defaultValue={initialData?.instagram_url || ""}
          className="field"
        />
      </div>

      {state.error && (
        <p
          role="alert"
          className="border border-neon-red bg-neon-red/10 px-3 py-2 font-tech text-sm text-neon-red"
        >
          {state.error}
        </p>
      )}
      {state.message && (
        <p
          role="status"
          className="border border-emerald-400/60 bg-emerald-500/10 px-3 py-2 font-tech text-sm text-emerald-300"
        >
          {state.message}
        </p>
      )}

      <Submit isEditing={!!initialData} />
      {initialData && (
        <div className="text-center">
          <Link
            href="/dashboard/eventos"
            className="font-tech text-xs text-bone hover:underline"
          >
            Cancelar Edição
          </Link>
        </div>
      )}
    </form>
  );
}

export function DeleteEventButton({ eventTitle }: { eventTitle: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(e) => {
        if (
          !confirm(
            `Apagar o evento "${eventTitle}" e todas as suas referências? Esta ação não pode ser desfeita.`,
          )
        ) {
          e.preventDefault();
        }
      }}
      className="btn-ghost neon-red !px-3 !py-1.5 !text-xs disabled:opacity-50"
    >
      {pending ? "Apagando…" : "Apagar"}
    </button>
  );
}

export function EventLeadsFilter({
  events,
  selectedEventId,
}: {
  events: { id: string; title: string; date: string }[];
  selectedEventId: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <select
      aria-label="Filtrar leads por evento"
      value={selectedEventId}
      onChange={(e) => {
        const params = new URLSearchParams(searchParams.toString());
        if (e.target.value === "all") params.delete("leadEvent");
        else params.set("leadEvent", e.target.value);
        const qs = params.toString();
        router.push(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
      }}
      className="field !w-auto bg-void/90 !py-2 !text-xs"
    >
      <option value="all" className="bg-ink">
        Todos os eventos
      </option>
      {events.map((ev) => (
        <option key={ev.id} value={ev.id} className="bg-ink">
          {new Date(`${ev.date}T12:00:00`).toLocaleDateString("pt-BR")} —{" "}
          {ev.title}
        </option>
      ))}
    </select>
  );
}

/* ------------------------------------------------------------------ */
/* Moderação Visual de Fotos & Vídeos                                  */
/* ------------------------------------------------------------------ */

export interface ModeratedMediaItem {
  id: string;
  event_id: string;
  event_title: string;
  event_slug: string | null;
  author_name: string | null;
  url: string;
  thumbnail_url: string | null;
  type: MediaType;
  caption: string | null;
  status: MediaStatus;
  drive_file_id: string | null;
  storage_path: string | null;
  created_at: string;
}

export type MediaStatusFilter = "all" | MediaStatus;

const STATUS_BADGE: Record<
  MediaStatus,
  { label: string; className: string }
> = {
  approved: {
    label: "Aprovada",
    className: "border-emerald-400/60 bg-emerald-500/15 text-emerald-300",
  },
  pending: {
    label: "Pendente",
    className: "border-neon-orange/70 bg-neon-orange/15 text-neon-orange",
  },
  rejected: {
    label: "Rejeitada / Oculta",
    className: "border-neon-red/70 bg-neon-red/15 text-neon-red",
  },
};

function MediaModerationCard({ item }: { item: ModeratedMediaItem }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [localStatus, setLocalStatus] = useState<MediaStatus>(item.status);
  const [deleted, setDeleted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (deleted) return null;

  const statusMeta = STATUS_BADGE[localStatus];

  function handleStatus(nextStatus: MediaStatus) {
    const prev = localStatus;
    setLocalStatus(nextStatus);
    setError(null);

    startTransition(async () => {
      const res = await setMediaStatus({
        mediaId: item.id,
        status: nextStatus,
      });
      if (!res.ok) {
        setLocalStatus(prev);
        setError(res.error ?? "Erro ao atualizar mídia.");
        return;
      }
      router.refresh();
    });
  }

  function handleDelete() {
    if (
      !confirm(
        "Excluir esta mídia permanentemente do site, Drive e/ou Storage?",
      )
    ) {
      return;
    }
    setError(null);

    startTransition(async () => {
      const res = await deleteModeratedMedia(item.id);
      if (!res.ok) {
        setError(res.error ?? "Erro ao excluir mídia.");
        return;
      }
      setDeleted(true);
      router.refresh();
    });
  }

  return (
    <article className="concrete flex flex-col justify-between overflow-hidden border border-concrete bg-ink">
      <div>
        <div className="scanlines relative aspect-square w-full overflow-hidden border-b border-concrete bg-void">
          {item.type === "video" ? (
            <video
              src={item.url}
              controls
              muted
              playsInline
              preload="metadata"
              className="h-full w-full object-cover"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.thumbnail_url || item.url}
              alt={item.caption ?? `Mídia de ${item.event_title}`}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          )}

          <div className="pointer-events-none absolute inset-x-2 top-2 z-10 flex items-center justify-between gap-2">
            <span className="bg-void/85 px-2 py-0.5 font-tech text-[0.58rem] font-bold uppercase tracking-widest text-bone">
              {item.type === "video" ? "VÍDEO" : "FOTO"} ·{" "}
              {item.drive_file_id ? "DRIVE" : "STORAGE"}
            </span>
            <span
              className={`border px-2 py-0.5 font-tech text-[0.58rem] font-bold uppercase tracking-widest backdrop-blur-sm ${statusMeta.className}`}
            >
              {statusMeta.label}
            </span>
          </div>
        </div>

        <div className="space-y-1.5 p-3.5">
          <div className="flex items-baseline justify-between gap-2">
            {item.event_slug ? (
              <Link
                href={`/evento/${item.event_slug}`}
                className="truncate font-display text-xl text-gold-bright hover:underline"
              >
                {item.event_title}
              </Link>
            ) : (
              <p className="truncate font-display text-xl text-gold-bright">
                {item.event_title}
              </p>
            )}
            <span className="stamp shrink-0 text-[0.58rem] text-ash">
              {new Date(item.created_at).toLocaleDateString("pt-BR")}
            </span>
          </div>

          <p className="stamp truncate text-[0.62rem] text-bone/85">
            Autor: {item.author_name ?? "Equipe Doca"}
          </p>

          {item.caption && (
            <p className="line-clamp-2 text-xs text-ash">{item.caption}</p>
          )}
        </div>
      </div>

      <div className="space-y-2 border-t border-concrete/80 p-3">
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            disabled={isPending || localStatus === "approved"}
            onClick={() => handleStatus("approved")}
            className={`border px-2 py-1.5 font-tech text-[0.6rem] font-bold uppercase tracking-wider transition-colors disabled:opacity-45 ${
              localStatus === "approved"
                ? "border-emerald-400 bg-emerald-500 text-void"
                : "border-emerald-400/50 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/25"
            }`}
          >
            Aprovar
          </button>

          <button
            type="button"
            disabled={isPending || localStatus === "rejected"}
            onClick={() => handleStatus("rejected")}
            className={`border px-2 py-1.5 font-tech text-[0.6rem] font-bold uppercase tracking-wider transition-colors disabled:opacity-45 ${
              localStatus === "rejected"
                ? "border-neon-orange bg-neon-orange text-void"
                : "border-neon-orange/55 bg-neon-orange/10 text-neon-orange hover:bg-neon-orange/25"
            }`}
          >
            Rejeitar
          </button>

          <button
            type="button"
            disabled={isPending}
            onClick={handleDelete}
            className="border border-neon-red/60 bg-neon-red/10 px-2 py-1.5 font-tech text-[0.6rem] font-bold uppercase tracking-wider text-neon-red transition-colors hover:bg-neon-red hover:text-void disabled:opacity-45"
          >
            {isPending ? "…" : "Excluir"}
          </button>
        </div>

        {error && (
          <p
            role="alert"
            className="border border-neon-red bg-neon-red/10 px-2 py-1 font-tech text-[0.6rem] text-neon-red"
          >
            {error}
          </p>
        )}
      </div>
    </article>
  );
}

export function MediaModerationSection({
  mediaItems,
  events,
  activeEventId,
  activeStatus,
  statusCounts,
}: {
  mediaItems: ModeratedMediaItem[];
  events: { id: string; title: string; date: string }[];
  activeEventId: string;
  activeStatus: MediaStatusFilter;
  statusCounts: {
    all: number;
    pending: number;
    approved: number;
    rejected: number;
  };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateFilter(nextEvent: string, nextStatus: MediaStatusFilter) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextEvent === "all") params.delete("mediaEvent");
    else params.set("mediaEvent", nextEvent);

    if (nextStatus === "all") params.delete("mediaStatus");
    else params.set("mediaStatus", nextStatus);

    const qs = params.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  }

  const tabs: { id: MediaStatusFilter; label: string; count: number }[] = [
    { id: "all", label: "Todas", count: statusCounts.all },
    { id: "pending", label: "Pendentes", count: statusCounts.pending },
    { id: "approved", label: "Aprovadas", count: statusCounts.approved },
    { id: "rejected", label: "Rejeitadas", count: statusCounts.rejected },
  ];

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-concrete pb-3">
        <div>
          <p className="stamp text-gold-bright">
            ▸ Curadoria de Galeria · Drive &amp; Storage
          </p>
          <h2 className="mt-1 font-display text-4xl">
            <span className="text-bone">MODERAÇÃO</span>{" "}
            <span className="gold-vip">VISUAL</span>
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label
            htmlFor="media-event-filter"
            className="stamp text-[0.65rem] text-ash"
          >
            Evento:
          </label>
          <select
            id="media-event-filter"
            value={activeEventId}
            onChange={(e) => updateFilter(e.target.value, activeStatus)}
            className="field !w-auto bg-void/90 !py-2 !text-xs"
          >
            <option value="all" className="bg-ink">
              Todos os eventos
            </option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id} className="bg-ink">
                {new Date(`${ev.date}T12:00:00`).toLocaleDateString("pt-BR")} —{" "}
                {ev.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Filtro por status */}
      <div
        role="group"
        aria-label="Filtrar mídias por status"
        className="flex flex-wrap gap-2"
      >
        {tabs.map((tab) => {
          const active = activeStatus === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              aria-pressed={active}
              onClick={() => updateFilter(activeEventId, tab.id)}
              className={`border px-3.5 py-2 font-tech text-[0.65rem] uppercase tracking-[0.14em] transition-colors ${
                active
                  ? "border-gold-bright bg-gold-bright font-bold text-void"
                  : "border-concrete bg-void/80 text-bone/85 hover:border-neon-gold hover:text-gold-bright"
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          );
        })}
      </div>

      {mediaItems.length === 0 ? (
        <div className="fence border border-concrete px-6 py-16 text-center">
          <p className="font-display text-3xl text-bone/75">
            Nenhuma mídia encontrada com esse filtro
          </p>
          <p className="stamp mt-2 text-ash">
            Troque o evento ou status acima para visualizar outros registros.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {mediaItems.map((item) => (
            <MediaModerationCard
              key={`${item.id}-${item.status}`}
              item={item}
            />
          ))}
        </div>
      )}
    </section>
  );
}
