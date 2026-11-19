import { redirect } from "next/navigation";

import type { DocaUser, StaffPermission, UserRole } from "@/lib/database.types";
import { createClient } from "@/utils/supabase/server";

export const ALL_STAFF_PERMISSIONS: readonly StaffPermission[] = [
  "events",
  "media_mod",
  "vip_crm",
  "camarotes",
  "door_checkin",
  "menu",
  "pepper",
  "upload",
] as const;

export const STAFF_ROLES: readonly Exclude<UserRole, "creator">[] = [
  "admin",
  "promoter",
  "producer",
  "bar_manager",
  "hostess",
  "photographer",
] as const;

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Chefe / Admin Master",
  promoter: "Comercial / Promoter VIP",
  producer: "Produtor / Social Media",
  bar_manager: "Gerente de Bar / Operação",
  hostess: "Portaria / Hostess",
  photographer: "Fotógrafo",
  creator: "Creator Pepper",
};

export const PERMISSION_LABELS: Record<StaffPermission, string> = {
  events: "Eventos & Agenda",
  media_mod: "Moderação de Mídia",
  vip_crm: "Comercial & Listas VIP",
  camarotes: "Camarotes & Bistrôs",
  door_checkin: "Portaria & Check-in",
  menu: "Balcão & Cardápio",
  pepper: "Agência Pepper",
  upload: "Subir Mídia",
};

export const ROLE_DEFAULT_PERMISSIONS: Record<UserRole, readonly StaffPermission[]> = {
  admin: ALL_STAFF_PERMISSIONS,
  promoter: ["vip_crm", "camarotes", "door_checkin"],
  producer: ["events", "media_mod", "upload"],
  bar_manager: ["menu"],
  hostess: ["door_checkin"],
  photographer: ["upload"],
  creator: [],
};

const VALID_PERMS_SET = new Set<string>(ALL_STAFF_PERMISSIONS);

/**
 * Retorna todas as permissões efetivas do usuário (cargo base + extras acumuladas).
 * Usuários não aprovados não possuem permissões operacionais.
 */
export function getEffectivePermissions(user: DocaUser | null): StaffPermission[] {
  if (!user || !user.is_approved) return [];
  if (user.role === "admin") return [...ALL_STAFF_PERMISSIONS];

  const merged = new Set<StaffPermission>(ROLE_DEFAULT_PERMISSIONS[user.role] ?? []);
  for (const perm of user.permissions ?? []) {
    if (VALID_PERMS_SET.has(perm)) {
      merged.add(perm as StaffPermission);
    }
  }
  return Array.from(merged);
}

/** Verifica se o usuário aprovado possui uma determinada permissão. */
export function userHasPermission(
  user: DocaUser | null,
  perm: StaffPermission,
): boolean {
  if (!user || !user.is_approved) return false;
  if (user.role === "admin") return true;
  return getEffectivePermissions(user).includes(perm);
}

/**
 * Retorna o usuário autenticado + seu perfil, ou null.
 * Usa getUser() (valida o JWT no servidor), nunca getSession().
 */
export async function getCurrentUser(): Promise<DocaUser | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: initialProfile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  let profile = initialProfile as DocaUser | null;

  // Fallback para convites internos criados após o usuário já ter conta:
  // se ainda não estiver aprovado, tenta reivindicar um convite pendente pelo e-mail.
  if (!profile || !profile.is_approved) {
    const { data: claimed } = await supabase.rpc("claim_my_staff_invite");
    if (claimed) {
      const { data: refreshed } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (refreshed) profile = refreshed as DocaUser;
    }
  }

  if (profile) {
    return {
      ...profile,
      permissions: Array.isArray(profile.permissions) ? profile.permissions : [],
    };
  }

  // Fallback: o trigger de signup ainda não rodou.
  return {
    id: user.id,
    email: user.email ?? null,
    full_name: (user.user_metadata?.full_name as string) ?? null,
    instagram: null,
    role: "photographer",
    is_approved: false,
    permissions: [],
    created_at: user.created_at,
  };
}

/** Exige sessão; redireciona para /login se não houver. */
export async function requireUser(nextPath = "/dashboard"): Promise<DocaUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  return user;
}

/** Exige perfil aprovado com a permissão especificada. */
export async function requirePermission(
  perm: StaffPermission,
  nextPath = "/dashboard",
): Promise<DocaUser> {
  const user = await requireUser(nextPath);
  if (!userHasPermission(user, perm)) {
    redirect("/dashboard?erro=sem-permissao");
  }
  return user;
}

/** Exige perfil admin. */
export async function requireAdmin(): Promise<DocaUser> {
  const user = await requireUser("/dashboard/admin");
  if (user.role !== "admin" || !user.is_approved) {
    redirect("/dashboard?erro=sem-permissao");
  }
  return user;
}
