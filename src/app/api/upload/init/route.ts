import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { initResumableUpload } from "@/lib/google-drive";

function slugFilename(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .slice(-80);
}

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("is_approved")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_approved) {
    return NextResponse.json(
      { error: "Sua credencial ainda não foi aprovada." },
      { status: 403 },
    );
  }

  try {
    const { filename, mimeType, size } = await request.json();

    if (!filename || !mimeType || size === undefined) {
      return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400 });
    }

    const name = `${Date.now()}-${slugFilename(filename)}`;
    const uploadUrl = await initResumableUpload(name, mimeType, size);

    return NextResponse.json({ uploadUrl });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Erro ao inicializar upload.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
