"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/utils/supabase/server";

/**
 * Cadastro de creators.
 *
 * O trigger `handle_new_user` (migration 0008) lê `role: "creator"` do
 * metadata do signup e já cria a linha em `pepper_creators` sozinho,
 * usando o handle como slug. Por isso o handle é higienizado aqui —
 * minúsculo, sem "@", só caracteres seguros pra URL — antes de virar
 * metadata: o trigger não faz esse saneamento, e um slug sujo quebraria
 * o link público do creator.
 */

export interface CadastroState {
  error?: string;
  message?: string;
}

function sanitizeHandle(value: string): string {
  return value
    .trim()
    .replace(/^@/, "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "")
    .slice(0, 60);
}

export async function cadastrarCreator(
  _prev: CadastroState,
  formData: FormData,
): Promise<CadastroState> {
  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const handle = sanitizeHandle(String(formData.get("handle") ?? ""));

  if (fullName.length < 2) {
    return { error: "Conta seu nome pra gente saber quem é." };
  }
  if (!email) {
    return { error: "Preencha o e-mail." };
  }
  if (password.length < 6) {
    return { error: "A senha precisa de pelo menos 6 caracteres." };
  }
  if (handle.length < 2) {
    return { error: "Conta seu @ do Instagram ou TikTok." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        role: "creator",
        full_name: fullName,
        instagram_handle: handle,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.session) {
    redirect("/dashboard/creator");
  }

  return {
    message: "Conta criada. Confirme o e-mail (se pedido) e entre pelo login — seu perfil já vai estar te esperando no estúdio.",
  };
}
