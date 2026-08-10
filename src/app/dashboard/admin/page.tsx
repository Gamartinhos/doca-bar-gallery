import type { Metadata } from "next";
import Link from "next/link";

import { requireAdmin } from "@/lib/auth";
import type { DocaEvent, DocaUser } from "@/lib/database.types";
import { createClient } from "@/utils/supabase/server";

import { deleteEvent, setApproval, setRole, togglePublished } from "./actions";
import { EventForm } from "./event-form";

export const metadata: Metadata = { title: "Administração" };
export const revalidate = 0;

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const admin = await requireAdmin();
  const supabase = await createClient();

  const { edit: editId } = await searchParams;

  const [{ data: usersData }, { data: eventsData }, { data: mediaRows }] =
    await Promise.all([
      supabase.from("users").select("*").order("created_at", { ascending: false }),
      supabase.from("events").select("*").order("date", { ascending: false }),
      supabase.from("media").select("event_id"),
    ]);

  const users = (usersData ?? []) as DocaUser[];
  const events = (eventsData ?? []) as DocaEvent[];

  const counts = new Map<string, number>();
  for (const row of (mediaRows ?? []) as { event_id: string }[]) {
    counts.set(row.event_id, (counts.get(row.event_id) ?? 0) + 1);
  }

  const pending = users.filter((u) => !u.is_approved);
  const active = users.filter((u) => u.is_approved);

  const editEvent = editId ? events.find((e) => e.id === editId) : undefined;

  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
      <p className="stamp text-neon-purple">Controle da casa</p>
      <h1 className="mt-2 font-display text-6xl sm:text-7xl">
        <span className="text-bone">PAINEL</span>{" "}
        <span className="neon neon-purple">ADMIN</span>
      </h1>

      {/* ---------- resumo ---------- */}
      <dl className="mt-10 grid grid-cols-2 gap-4 border-y border-concrete py-6 sm:grid-cols-4">
        <div>
          <dt className="stamp">Na fila</dt>
          <dd className="font-display text-4xl text-neon-red">
            {String(pending.length).padStart(2, "0")}
          </dd>
        </div>
        <div>
          <dt className="stamp">Aprovados</dt>
          <dd className="font-display text-4xl text-neon-green">
            {String(active.length).padStart(2, "0")}
          </dd>
        </div>
        <div>
          <dt className="stamp">Eventos</dt>
          <dd className="font-display text-4xl text-neon-blue">
            {String(events.length).padStart(2, "0")}
          </dd>
        </div>
        <div>
          <dt className="stamp">Mídias</dt>
          <dd className="font-display text-4xl text-neon-purple">
            {String(mediaRows?.length ?? 0).padStart(3, "0")}
          </dd>
        </div>
      </dl>

      <div className="mt-14 grid gap-14 lg:grid-cols-[1fr_380px]">
        {/* ============ COLUNA ESQUERDA ============ */}
        <div className="space-y-14">
          {/* ---------- fila de aprovação ---------- */}
          <section>
            <h2 className="mb-5 border-b border-concrete pb-3 font-display text-4xl">
              <span className="text-bone">FILA DE</span>{" "}
              <span className="neon neon-red">APROVAÇÃO</span>
            </h2>

            {pending.length === 0 ? (
              <p className="stamp py-6">Ninguém esperando na porta.</p>
            ) : (
              <ul className="space-y-3">
                {pending.map((u) => (
                  <li
                    key={u.id}
                    className="flex flex-wrap items-center justify-between gap-3 border border-concrete bg-ink px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-display text-2xl text-bone">
                        {u.full_name ?? "Sem nome"}
                      </p>
                      <p className="stamp truncate">{u.email}</p>
                    </div>
                    <form action={setApproval}>
                      <input type="hidden" name="user_id" value={u.id} />
                      <input type="hidden" name="approve" value="true" />
                      <button
                        type="submit"
                        className="btn-street neon-green !px-4 !py-2 !text-sm"
                      >
                        Liberar
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ---------- equipe ---------- */}
          <section>
            <h2 className="mb-5 border-b border-concrete pb-3 font-display text-4xl">
              <span className="text-bone">A</span>{" "}
              <span className="neon neon-green">EQUIPE</span>
            </h2>

            {active.length === 0 ? (
              <p className="stamp py-6">Nenhum fotógrafo liberado ainda.</p>
            ) : (
              <ul className="space-y-3">
                {active.map((u) => (
                  <li
                    key={u.id}
                    className="flex flex-wrap items-center justify-between gap-3 border border-concrete bg-ink px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 font-display text-2xl text-bone">
                        <span className="truncate">
                          {u.full_name ?? "Sem nome"}
                        </span>
                        {u.role === "admin" && (
                          <span className="skew-tag shrink-0 bg-neon-purple px-2 py-0.5 font-tech text-[0.6rem] font-bold tracking-widest text-void">
                            ADMIN
                          </span>
                        )}
                        {u.id === admin.id && (
                          <span className="stamp shrink-0 text-[0.6rem] text-ash">
                            (você)
                          </span>
                        )}
                      </p>
                      <p className="stamp truncate">{u.email}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {u.id !== admin.id && (
                        <>
                          <form action={setRole}>
                            <input type="hidden" name="user_id" value={u.id} />
                            <input
                              type="hidden"
                              name="role"
                              value={u.role === "admin" ? "photographer" : "admin"}
                            />
                            <button
                              type="submit"
                              className="btn-ghost neon-purple !px-3 !py-1.5 !text-xs"
                            >
                              {u.role === "admin" ? "Rebaixar" : "Tornar admin"}
                            </button>
                          </form>

                          <form action={setApproval}>
                            <input type="hidden" name="user_id" value={u.id} />
                            <input type="hidden" name="approve" value="false" />
                            <button
                              type="submit"
                              className="btn-ghost neon-red !px-3 !py-1.5 !text-xs"
                            >
                              Suspender
                            </button>
                          </form>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ---------- eventos ---------- */}
          <section>
            <h2 className="mb-5 border-b border-concrete pb-3 font-display text-4xl">
              <span className="text-bone">AS</span>{" "}
              <span className="neon neon-blue">NOITES</span>
            </h2>

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
                        className="block truncate font-display text-2xl text-bone hover:text-neon-blue"
                      >
                        {e.title}
                      </Link>
                      <p className="stamp">
                        {new Date(`${e.date}T12:00:00`).toLocaleDateString(
                          "pt-BR",
                        )}{" "}
                        · {counts.get(e.id) ?? 0} mídias ·{" "}
                        {e.is_published ? "publicado" : "oculto"}
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
                          className="btn-ghost neon-blue !px-3 !py-1.5 !text-xs"
                        >
                          {e.is_published ? "Ocultar" : "Publicar"}
                        </button>
                      </form>

                      <Link
                        href={`/dashboard/admin?edit=${e.id}`}
                        className="btn-ghost text-bone hover:text-neon-purple !px-3 !py-1.5 !text-xs"
                      >
                        Editar
                      </Link>

                      <form action={deleteEvent}>
                        <input type="hidden" name="event_id" value={e.id} />
                        <button
                          type="submit"
                          className="btn-ghost neon-red !px-3 !py-1.5 !text-xs"
                        >
                          Apagar
                        </button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* ============ COLUNA DIREITA ============ */}
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="tape concrete border border-concrete p-6">
            <h2 className="mb-6 font-display text-3xl">
              <span className="neon neon-purple">
                {editEvent ? "EDITAR" : "ABRIR"}
              </span>{" "}
              <span className="text-bone">NOITE</span>
            </h2>
            <EventForm initialData={editEvent} />
          </div>
        </aside>
      </div>
    </div>
  );
}
