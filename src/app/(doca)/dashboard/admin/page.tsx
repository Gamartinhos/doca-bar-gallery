import type { Metadata } from "next";
import Link from "next/link";

import {
  ALL_STAFF_PERMISSIONS,
  getEffectivePermissions,
  PERMISSION_LABELS,
  requireAdmin,
  ROLE_DEFAULT_PERMISSIONS,
  ROLE_LABELS,
  STAFF_ROLES,
} from "@/lib/auth";
import type {
  BirthdayLead,
  DocaEvent,
  DocaUser,
  StaffInvite,
} from "@/lib/database.types";
import { createClient } from "@/utils/supabase/server";

import {
  cancelStaffInvite,
  deleteEvent,
  inviteStaff,
  setApproval,
  togglePublished,
  updateMemberAccess,
} from "./actions";
import { EventForm } from "./event-form";

export const metadata: Metadata = { title: "Administração" };
export const revalidate = 0;

const GUEST_TIER_BADGES: Record<string, string> = {
  ate_5: "VIP Base (até 4)",
  "5_10": "5 a 10 Pagantes",
  "10_15": "10 a 15 Pagantes",
  "15_20": "15 a 20 Pagantes",
  "20_mais": "20+ Pagantes",
};

function formatTierLabel(tier: string): string {
  return GUEST_TIER_BADGES[tier] ?? tier;
}

function formatBirthDate(dateStr: string): string {
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return dateStr;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

function formatInstagram(handle: string): string {
  const cleaned = handle.trim().replace(/^@+/, "");
  return cleaned ? `@${cleaned}` : "-";
}

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

function buildLeadWhatsappUrl(lead: BirthdayLead): string {
  const digits = lead.whatsapp.replace(/\D/g, "");
  const phoneWithCountry =
    digits.startsWith("55") && digits.length >= 12 ? digits : `55${digits}`;
  const text = `Salve ${lead.full_name}! Recebemos seu cadastro de Aniversário VIP na Doca Bar (${lead.event_label}). Bora confirmar os detalhes da sua lista!`;
  return `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(text)}`;
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const admin = await requireAdmin();
  const supabase = await createClient();

  const { edit: editId } = await searchParams;

  const [
    { data: usersData },
    { data: invitesData },
    { data: eventsData },
    { data: mediaRows },
    { data: birthdayLeadsData, count: birthdayLeadsCount },
  ] = await Promise.all([
    supabase.from("users").select("*").order("created_at", { ascending: false }),
    supabase
      .from("staff_invites")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase.from("events").select("*").order("date", { ascending: false }),
    supabase.from("media").select("event_id"),
    supabase
      .from("birthday_leads")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const users = (usersData ?? []) as DocaUser[];
  const invites = (invitesData ?? []) as StaffInvite[];
  const pendingInvites = invites.filter((invite) => !invite.accepted_at);
  const events = (eventsData ?? []) as DocaEvent[];
  const birthdayLeads = (birthdayLeadsData ?? []) as BirthdayLead[];
  const totalBirthdayLeads = birthdayLeadsCount ?? birthdayLeads.length;

  const counts = new Map<string, number>();
  for (const row of (mediaRows ?? []) as { event_id: string }[]) {
    counts.set(row.event_id, (counts.get(row.event_id) ?? 0) + 1);
  }

  const pending = users.filter((u) => !u.is_approved);
  const active = users.filter((u) => u.is_approved);

  const editEvent = editId ? events.find((e) => e.id === editId) : undefined;

  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link
            href="/dashboard"
            className="stamp text-ash transition-colors hover:text-neon-orange"
          >
            ‹ QG da Doca
          </Link>
          <p className="stamp mt-3 text-neon-orange">Controle da casa</p>
          <h1 className="mt-2 font-display text-6xl sm:text-7xl">
            <span className="text-bone">PAINEL</span>{" "}
            <span className="neon neon-orange">ADMIN</span>
          </h1>
        </div>

        <nav
          aria-label="Atalhos operacionais"
          className="flex flex-wrap gap-2"
        >
          <Link
            href="/dashboard/portaria"
            className="btn-ghost neon-orange !px-3 !py-1.5 !text-xs"
          >
            Portaria
          </Link>
          <Link
            href="/dashboard/comercial"
            className="btn-ghost neon-gold !px-3 !py-1.5 !text-xs"
          >
            Comercial VIP
          </Link>
          <Link
            href="/dashboard/camarotes"
            className="btn-ghost neon-gold !px-3 !py-1.5 !text-xs"
          >
            Camarotes
          </Link>
          <Link
            href="/dashboard/eventos"
            className="btn-ghost neon-orange !px-3 !py-1.5 !text-xs"
          >
            Eventos &amp; Mídia
          </Link>
          <Link
            href="/dashboard/cardapio"
            className="btn-ghost neon-gold !px-3 !py-1.5 !text-xs"
          >
            Cardápio
          </Link>
        </nav>
      </div>

      {/* ---------- resumo ---------- */}
      <dl className="mt-10 grid grid-cols-2 gap-4 border-y border-concrete py-6 sm:grid-cols-3 lg:grid-cols-6">
        <div>
          <dt className="stamp">Na fila</dt>
          <dd className="font-display text-4xl text-neon-red">
            {String(pending.length).padStart(2, "0")}
          </dd>
        </div>
        <div>
          <dt className="stamp">Convites</dt>
          <dd className="font-display text-4xl text-neon-orange">
            {String(pendingInvites.length).padStart(2, "0")}
          </dd>
        </div>
        <div>
          <dt className="stamp">Aprovados</dt>
          <dd className="font-display text-4xl text-gold-bright">
            {String(active.length).padStart(2, "0")}
          </dd>
        </div>
        <div>
          <dt className="stamp">Eventos</dt>
          <dd className="font-display text-4xl text-neon-gold">
            {String(events.length).padStart(2, "0")}
          </dd>
        </div>
        <div>
          <dt className="stamp">Mídias</dt>
          <dd className="font-display text-4xl text-neon-orange">
            {String(mediaRows?.length ?? 0).padStart(3, "0")}
          </dd>
        </div>
        <div>
          <dt className="stamp">Aniversariantes</dt>
          <dd className="gold-vip font-display text-4xl">
            {String(totalBirthdayLeads).padStart(2, "0")}
          </dd>
        </div>
      </dl>

      <Link
        href="/dashboard/admin/pepper"
        className="tape concrete mt-10 flex flex-wrap items-center justify-between gap-4 border border-concrete p-5 transition-colors hover:border-neon-orange"
      >
        <div>
          <p className="stamp text-neon-orange">Agência</p>
          <p className="font-display text-3xl text-bone">
            PEPPER — Casting &amp; Orçamentos
          </p>
        </div>
        <span className="stamp text-ash">Gerenciar →</span>
      </Link>

      <div className="mt-14 grid gap-14 lg:grid-cols-[1fr_380px]">
        {/* ============ COLUNA ESQUERDA ============ */}
        <div className="space-y-14">
          {/* ---------- convites híbridos / pré-cadastro ---------- */}
          <section>
            <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2 border-b border-concrete pb-3">
              <h2 className="font-display text-4xl">
                <span className="text-bone">CONVIDAR / PRÉ-CADASTRAR</span>{" "}
                <span className="gold-vip">EQUIPE INTERNA</span>
              </h2>
              <span className="stamp text-ash">Onboarding híbrido</span>
            </div>

            <form action={inviteStaff} className="glass-vip space-y-5 p-6">
              <p className="text-sm text-ash">
                Pré-cadastre o e-mail de quem entra na operação. Se a pessoa já
                tiver conta, o cargo e as permissões são liberados na hora; caso
                contrário, o acesso ativa automaticamente no primeiro login ou
                cadastro.
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="invite-full-name" className="stamp mb-2 block">
                    Nome Completo *
                  </label>
                  <input
                    id="invite-full-name"
                    name="full_name"
                    required
                    placeholder="Ex.: Carla Promoter"
                    className="field"
                  />
                </div>

                <div>
                  <label htmlFor="invite-email" className="stamp mb-2 block">
                    E-mail *
                  </label>
                  <input
                    id="invite-email"
                    name="email"
                    type="email"
                    required
                    placeholder="equipe@docabar.com.br"
                    className="field"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="invite-role" className="stamp mb-2 block">
                  Cargo Principal *
                </label>
                <select
                  id="invite-role"
                  name="role"
                  defaultValue="promoter"
                  className="field"
                >
                  {STAFF_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </option>
                  ))}
                </select>
              </div>

              <fieldset>
                <legend className="stamp mb-2">
                  Permissões Extras (acumuláveis ao cargo)
                </legend>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {ALL_STAFF_PERMISSIONS.map((perm) => (
                    <label
                      key={perm}
                      className="flex cursor-pointer items-center gap-2 border border-concrete bg-void/70 px-3 py-2 text-xs text-bone transition-colors hover:border-neon-gold/60 has-[:checked]:border-neon-gold has-[:checked]:bg-neon-gold/10"
                    >
                      <input
                        type="checkbox"
                        name="permissions"
                        value={perm}
                        className="h-3.5 w-3.5 accent-[#f5d061]"
                      />
                      <span className="font-tech text-[0.68rem] uppercase tracking-wider">
                        {PERMISSION_LABELS[perm]}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="btn-gold !px-5 !py-2.5 !text-sm"
                >
                  Enviar / Pré-Cadastrar Acesso
                </button>
              </div>
            </form>

            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="stamp text-neon-orange">
                  Convites Pendentes ({pendingInvites.length})
                </h3>
              </div>

              {pendingInvites.length === 0 ? (
                <p className="stamp border border-concrete/60 bg-ink/50 px-4 py-4 text-ash">
                  Nenhum convite pendente aguardando primeiro acesso.
                </p>
              ) : (
                <ul className="space-y-3">
                  {pendingInvites.map((invite) => (
                    <li
                      key={invite.id}
                      className="flex flex-wrap items-center justify-between gap-3 border border-concrete bg-ink px-4 py-3"
                    >
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate font-display text-2xl text-bone">
                            {invite.full_name}
                          </p>
                          <span className="skew-tag shrink-0 bg-neon-gold px-2 py-0.5 font-tech text-[0.6rem] font-bold tracking-widest text-void">
                            {ROLE_LABELS[invite.role] ?? invite.role}
                          </span>
                        </div>
                        <p className="stamp truncate">
                          {invite.email} · criado em{" "}
                          {new Date(invite.created_at).toLocaleDateString("pt-BR")}
                        </p>
                        {invite.permissions.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-0.5">
                            {invite.permissions.map((perm) => (
                              <span
                                key={perm}
                                className="border border-neon-gold/35 bg-smoke px-2 py-0.5 font-tech text-[0.6rem] uppercase tracking-wider text-gold-bright"
                              >
                                +{PERMISSION_LABELS[perm as keyof typeof PERMISSION_LABELS] ?? perm}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <form action={cancelStaffInvite}>
                        <input
                          type="hidden"
                          name="invite_id"
                          value={invite.id}
                        />
                        <button
                          type="submit"
                          className="btn-ghost neon-red !px-3 !py-1.5 !text-xs"
                        >
                          Cancelar
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

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
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-display text-2xl text-bone">
                          {u.full_name ?? "Sem nome"}
                        </p>
                        <span className="skew-tag shrink-0 bg-concrete px-2 py-0.5 font-tech text-[0.6rem] font-bold tracking-widest text-bone">
                          {ROLE_LABELS[u.role]}
                        </span>
                      </div>
                      <p className="stamp truncate">{u.email}</p>
                    </div>
                    <form action={setApproval}>
                      <input type="hidden" name="user_id" value={u.id} />
                      <input type="hidden" name="approve" value="true" />
                      <button
                        type="submit"
                        className="btn-street neon-gold !px-4 !py-2 !text-sm"
                      >
                        Liberar
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ---------- aniversariantes / leads vip ---------- */}
          <section>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-concrete pb-3">
              <div className="flex flex-wrap items-baseline gap-3">
                <h2 className="font-display text-4xl">
                  <span className="text-bone">ANIVERSARIANTES /</span>{" "}
                  <span className="gold-vip">LEADS VIP</span>
                </h2>
                <span className="stamp text-ash">
                  Últimos {birthdayLeads.length}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href="/dashboard/comercial"
                  className="btn-ghost neon-gold !px-3 !py-1.5 !text-xs"
                >
                  Comercial VIP →
                </Link>
                <Link
                  href="/dashboard/portaria"
                  className="btn-ghost neon-orange !px-3 !py-1.5 !text-xs"
                >
                  Portaria →
                </Link>
              </div>
            </div>

            {birthdayLeads.length === 0 ? (
              <p className="stamp py-6">Nenhum aniversariante cadastrado ainda.</p>
            ) : (
              <ul className="space-y-3">
                {birthdayLeads.map((lead) => (
                  <li
                    key={lead.id}
                    className="glass-vip flex flex-wrap items-center justify-between gap-4 px-4 py-4"
                  >
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-display text-2xl text-bone">
                          {lead.full_name}
                        </p>
                        <span className="border border-neon-orange/60 bg-neon-orange/15 px-2.5 py-0.5 font-tech text-[0.65rem] font-bold uppercase tracking-wider text-neon-orange">
                          {formatTierLabel(lead.guest_tier)}
                        </span>
                        {lead.wants_camarote && (
                          <span className="border border-neon-gold/70 bg-neon-gold/20 px-2.5 py-0.5 font-tech text-[0.65rem] font-bold uppercase tracking-wider text-gold-bright">
                            Quer Camarote
                          </span>
                        )}
                      </div>

                      <p className="font-tech text-xs tracking-wide text-bone/85">
                        <span className="text-neon-gold">
                          {formatInstagram(lead.instagram)}
                        </span>{" "}
                        · Nasc.: {formatBirthDate(lead.birth_date)} ·{" "}
                        {formatPhoneDisplay(lead.whatsapp)}
                      </p>

                      <p className="stamp text-[0.68rem] text-ash">
                        Evento: <span className="text-bone/90">{lead.event_label}</span>
                      </p>
                    </div>

                    <a
                      href={buildLeadWhatsappUrl(lead)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-gold shrink-0 !px-4 !py-2 !text-xs"
                    >
                      Chamar no WhatsApp
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ---------- equipe ---------- */}
          <section>
            <h2 className="mb-5 border-b border-concrete pb-3 font-display text-4xl">
              <span className="text-bone">A EQUIPE</span>{" "}
              <span className="gold-vip">(MEMBROS ATIVOS)</span>
            </h2>

            {active.length === 0 ? (
              <p className="stamp py-6">Nenhum membro ativo ainda.</p>
            ) : (
              <ul className="space-y-4">
                {active.map((u) => {
                  const effective = getEffectivePermissions(u);
                  const basePerms = new Set(ROLE_DEFAULT_PERMISSIONS[u.role] ?? []);
                  const extraPerms = new Set(u.permissions ?? []);

                  return (
                    <li
                      key={u.id}
                      className="space-y-4 border border-concrete bg-ink p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate font-display text-2xl text-bone">
                              {u.full_name ?? "Sem nome"}
                            </p>
                            <span
                              className={`skew-tag shrink-0 px-2 py-0.5 font-tech text-[0.6rem] font-bold tracking-widest text-void ${
                                u.role === "admin"
                                  ? "bg-neon-orange"
                                  : u.role === "creator"
                                    ? "bg-concrete !text-bone"
                                    : "bg-neon-gold"
                              }`}
                            >
                              {ROLE_LABELS[u.role]}
                            </span>
                            {u.id === admin.id && (
                              <span className="stamp shrink-0 text-[0.6rem] text-ash">
                                (você)
                              </span>
                            )}
                          </div>

                          <p className="stamp truncate">{u.email}</p>

                          {effective.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-0.5">
                              {effective.map((perm) => (
                                <span
                                  key={perm}
                                  className={`border px-2 py-0.5 font-tech text-[0.6rem] uppercase tracking-wider ${
                                    extraPerms.has(perm) && !basePerms.has(perm)
                                      ? "border-neon-orange/60 bg-neon-orange/15 text-neon-orange"
                                      : "border-neon-gold/35 bg-smoke text-gold-bright"
                                  }`}
                                >
                                  {PERMISSION_LABELS[perm]}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {u.id !== admin.id && (
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
                        )}
                      </div>

                      {u.id !== admin.id && (
                        <form
                          key={`${u.id}-${u.role}-${(u.permissions ?? []).join(",")}`}
                          action={updateMemberAccess}
                          className="space-y-3 border-t border-concrete/70 pt-3"
                        >
                          <input type="hidden" name="user_id" value={u.id} />

                          <div className="flex flex-wrap items-end justify-between gap-3">
                            <div className="min-w-[220px] flex-1">
                              <span className="stamp mb-1.5 block text-[0.62rem]">
                                Cargo Principal
                              </span>
                              <select
                                name="role"
                                defaultValue={u.role}
                                aria-label={`Cargo de ${u.full_name ?? u.email ?? "membro"}`}
                                className="field !py-2 !text-sm"
                              >
                                {STAFF_ROLES.map((role) => (
                                  <option key={role} value={role}>
                                    {ROLE_LABELS[role]}
                                  </option>
                                ))}
                                {u.role === "creator" && (
                                  <option value="creator">
                                    {ROLE_LABELS.creator}
                                  </option>
                                )}
                              </select>
                            </div>

                            <button
                              type="submit"
                              className="btn-street neon-gold !px-4 !py-2 !text-xs"
                            >
                              Salvar Acessos
                            </button>
                          </div>

                          <div>
                            <span className="stamp mb-2 block text-[0.62rem]">
                              Permissões Extras
                            </span>
                            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                              {ALL_STAFF_PERMISSIONS.map((perm) => {
                                const isBase = basePerms.has(perm);
                                return (
                                  <label
                                    key={perm}
                                    className="flex cursor-pointer items-center gap-2 border border-concrete/80 bg-void/60 px-2.5 py-1.5 text-xs text-bone/90 transition-colors hover:border-neon-gold/60 has-[:checked]:border-neon-orange has-[:checked]:bg-neon-orange/10"
                                  >
                                    <input
                                      type="checkbox"
                                      name="permissions"
                                      value={perm}
                                      defaultChecked={extraPerms.has(perm)}
                                      className="h-3.5 w-3.5 accent-[#ff4d00]"
                                    />
                                    <span className="truncate font-tech text-[0.64rem] uppercase tracking-wider">
                                      {PERMISSION_LABELS[perm]}
                                      {isBase ? " · cargo" : ""}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        </form>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* ---------- eventos ---------- */}
          <section>
            <h2 className="mb-5 border-b border-concrete pb-3 font-display text-4xl">
              <span className="text-bone">AS</span>{" "}
              <span className="neon neon-gold">NOITES</span>
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
                        className="block truncate font-display text-2xl text-bone hover:text-neon-gold"
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
                          className="btn-ghost neon-gold !px-3 !py-1.5 !text-xs"
                        >
                          {e.is_published ? "Ocultar" : "Publicar"}
                        </button>
                      </form>

                      <Link
                        href={`/dashboard/admin?edit=${e.id}`}
                        className="btn-ghost neon-orange !px-3 !py-1.5 !text-xs"
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
              <span className="neon neon-orange">
                {editEvent ? "EDITAR" : "ABRIR"}
              </span>{" "}
              <span className="text-bone">NOITE</span>
            </h2>
            <EventForm key={editEvent?.id || "new"} initialData={editEvent} />
          </div>
        </aside>
      </div>
    </div>
  );
}
