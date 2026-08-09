import { redirect } from "next/navigation";

import type { DocaUser } from "@/lib/database.types";
import { createClient } from "@/utils/supabase/server";

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

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profile) return profile as DocaUser;

  // Fallback: o trigger de signup ainda não rodou.
  return {
    id: user.id,
    email: user.email ?? null,
    full_name: (user.user_metadata?.full_name as string) ?? null,
    instagram: null,
    role: "photographer",
    is_approved: false,
    created_at: user.created_at,
  };
}

/** Exige sessão; redireciona para /login se não houver. */
export async function requireUser(nextPath = "/dashboard"): Promise<DocaUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  return user;
}

/** Exige perfil admin. */
export async function requireAdmin(): Promise<DocaUser> {
  const user = await requireUser("/dashboard/admin");
  if (user.role !== "admin") redirect("/dashboard?erro=sem-permissao");
  return user;
}
