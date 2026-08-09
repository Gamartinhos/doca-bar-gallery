"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";

import { createClient } from "@/utils/supabase/client";

interface EventOption {
  id: string;
  title: string;
  date: string;
}

type Status = "queued" | "sending" | "done" | "error";

interface QueueItem {
  key: string;
  file: File;
  preview: string;
  status: Status;
  error?: string;
}

export function Uploader({
  events,
  driveEnabled,
  photographerId,
}: {
  events: EventOption[];
  driveEnabled: boolean;
  photographerId: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [eventId, setEventId] = useState(events[0]?.id ?? "");
  const [caption, setCaption] = useState("");
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

  const addFiles = useCallback((files: FileList | File[]) => {
    const accepted = Array.from(files).filter(
      (f) => f.type.startsWith("image/") || f.type.startsWith("video/"),
    );

    setQueue((current) => [
      ...current,
      ...accepted.map((file) => ({
        key: `${file.name}-${file.size}-${file.lastModified}-${Math.random()
          .toString(36)
          .slice(2, 7)}`,
        file,
        preview: URL.createObjectURL(file),
        status: "queued" as Status,
      })),
    ]);
    setSummary(null);
  }, []);

  const removeItem = useCallback((key: string) => {
    setQueue((current) => {
      const target = current.find((i) => i.key === key);
      if (target) URL.revokeObjectURL(target.preview);
      return current.filter((i) => i.key !== key);
    });
  }, []);

  const patch = useCallback((key: string, next: Partial<QueueItem>) => {
    setQueue((current) =>
      current.map((i) => (i.key === key ? { ...i, ...next } : i)),
    );
  }, []);

  /** Caminho A — servidor: Google Drive via /api/upload. */
  async function sendViaDrive(item: QueueItem) {
    const body = new FormData();
    body.append("file", item.file);
    body.append("event_id", eventId);
    body.append("caption", caption);

    const res = await fetch("/api/upload", { method: "POST", body });
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(json.error ?? `Falhou (${res.status})`);
    }
  }

  /** Caminho B — direto pro Supabase Storage (sem limite de 4MB). */
  async function sendViaStorage(item: QueueItem) {
    const supabase = createClient();
    const ext = item.file.name.split(".").pop() ?? "bin";
    const path = `${eventId}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("media")
      .upload(path, item.file, {
        cacheControl: "31536000",
        contentType: item.file.type || undefined,
      });

    if (uploadError) throw new Error(uploadError.message);

    const {
      data: { publicUrl },
    } = supabase.storage.from("media").getPublicUrl(path);

    const { error: insertError } = await supabase.from("media").insert({
      event_id: eventId,
      photographer_id: photographerId,
      drive_file_id: null,
      url: publicUrl,
      thumbnail_url: publicUrl,
      storage_path: path,
      type: item.file.type.startsWith("video/") ? "video" : "photo",
      caption: caption || null,
      width: null,
      height: null,
      status: "approved",
    });

    if (insertError) throw new Error(insertError.message);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!eventId || queue.length === 0 || busy) return;

    setBusy(true);
    setSummary(null);

    let ok = 0;
    let fail = 0;

    for (const item of queue) {
      if (item.status === "done") continue;

      patch(item.key, { status: "sending", error: undefined });

      try {
        if (driveEnabled) await sendViaDrive(item);
        else await sendViaStorage(item);

        patch(item.key, { status: "done" });
        ok += 1;
      } catch (cause) {
        const message =
          cause instanceof Error ? cause.message : "Erro inesperado";
        patch(item.key, { status: "error", error: message });
        fail += 1;
      }
    }

    setBusy(false);
    setSummary(
      `${ok} ${ok === 1 ? "arquivo subiu" : "arquivos subiram"}${
        fail > 0 ? ` · ${fail} falhou` : ""
      }`,
    );

    if (ok > 0) router.refresh();
  }

  if (events.length === 0) {
    return (
      <div className="fence border border-concrete px-6 py-16 text-center">
        <p className="font-display text-3xl text-bone/70">
          Nenhum evento aberto
        </p>
        <p className="stamp mt-3">
          O admin precisa abrir uma noite antes de você subir material
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* ---------- destino ---------- */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="event" className="stamp mb-2 block">
            Noite *
          </label>
          <select
            id="event"
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            className="field"
            required
          >
            {events.map((e) => (
              <option key={e.id} value={e.id} className="bg-void">
                {e.title} — {new Date(`${e.date}T12:00:00`).toLocaleDateString("pt-BR")}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="caption" className="stamp mb-2 block">
            Legenda (opcional, vale pro lote)
          </label>
          <input
            id="caption"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Ex.: pista às 2h"
            className="field"
          />
        </div>
      </div>

      {/* ---------- dropzone ---------- */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          addFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        className={`fence cursor-pointer border-2 border-dashed px-6 py-16 text-center transition-colors ${
          dragging
            ? "border-neon-green bg-neon-green/5"
            : "border-concrete hover:border-neon-magenta"
        }`}
      >
        <p className="font-display text-4xl text-bone">
          {dragging ? "SOLTA AÍ" : "ARRASTA OS ARQUIVOS"}
        </p>
        <p className="stamp mt-3">
          ou clique pra escolher · JPG, PNG, WEBP, MP4, WEBM
        </p>
        {driveEnabled ? (
          <p className="stamp mt-1 text-neon-green">
            destino: Google Drive da casa · até 4MB por arquivo
          </p>
        ) : (
          <p className="stamp mt-1 text-neon-blue">
            destino: Supabase Storage (Drive não configurado)
          </p>
        )}

        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {/* ---------- fila ---------- */}
      {queue.length > 0 && (
        <div>
          <div className="mb-4 flex items-baseline justify-between border-b border-concrete pb-2">
            <h2 className="font-display text-3xl text-bone">
              FILA ({queue.length})
            </h2>
            <button
              type="button"
              onClick={() => {
                queue.forEach((i) => URL.revokeObjectURL(i.preview));
                setQueue([]);
                setSummary(null);
              }}
              className="stamp transition-colors hover:text-neon-red"
            >
              Limpar
            </button>
          </div>

          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {queue.map((item) => (
              <li
                key={item.key}
                className="scanlines relative aspect-square overflow-hidden border border-concrete bg-ink"
              >
                {item.file.type.startsWith("video/") ? (
                  <video
                    src={item.preview}
                    muted
                    className="h-full w-full object-cover opacity-70"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.preview}
                    alt={item.file.name}
                    className="h-full w-full object-cover opacity-70"
                  />
                )}

                <span
                  className={`absolute left-1.5 top-1.5 z-10 px-1.5 py-0.5 font-tech text-[0.6rem] font-bold uppercase tracking-widest ${
                    item.status === "done"
                      ? "bg-neon-green text-void"
                      : item.status === "error"
                        ? "bg-neon-red text-void"
                        : item.status === "sending"
                          ? "animate-flicker bg-neon-blue text-void"
                          : "bg-concrete text-bone"
                  }`}
                >
                  {item.status === "done"
                    ? "OK"
                    : item.status === "error"
                      ? "ERRO"
                      : item.status === "sending"
                        ? "SUBINDO"
                        : "NA FILA"}
                </span>

                {item.status !== "sending" && (
                  <button
                    type="button"
                    onClick={() => removeItem(item.key)}
                    aria-label={`Remover ${item.file.name}`}
                    className="absolute right-1 top-1 z-10 bg-void/80 px-1.5 font-display text-lg leading-tight text-bone hover:text-neon-red"
                  >
                    ×
                  </button>
                )}

                <span className="absolute inset-x-0 bottom-0 z-10 truncate bg-void/85 px-2 py-1 font-tech text-[0.6rem] text-ash">
                  {item.error ?? item.file.name}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {summary && (
        <p
          role="status"
          className="border border-neon-green bg-neon-green/10 px-3 py-2 font-tech text-sm text-neon-green"
        >
          {summary}
        </p>
      )}

      <button
        type="submit"
        disabled={busy || queue.length === 0}
        className="btn-street neon-green w-full sm:w-auto"
      >
        {busy ? "Subindo…" : `Subir ${queue.length || ""} pra galeria`}
      </button>
    </form>
  );
}
