import { NextResponse } from "next/server";

import { isDriveConfigured, uploadToDrive } from "@/lib/google-drive";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Limite de corpo em funções serverless da Vercel (~4.5MB). */
const MAX_BYTES = 4 * 1024 * 1024;

function slugFilename(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .slice(-80);
}

/**
 * POST /api/upload
 *
 * multipart/form-data: file, event_id, caption?
 * Sobe para o Google Drive (quando configurado) e registra em `media`.
 * Quando o Drive não está configurado, o cliente envia direto pro
 * Supabase Storage e esta rota não é usada.
 */
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
    .select("id, is_approved")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_approved) {
    return NextResponse.json(
      { error: "Sua credencial ainda não foi aprovada pela casa." },
      { status: 403 },
    );
  }

  if (!isDriveConfigured()) {
    return NextResponse.json(
      {
        error:
          "Google Drive não configurado no servidor. Configure GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY e GOOGLE_DRIVE_FOLDER_ID.",
      },
      { status: 501 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }

  const file = formData.get("file");
  const eventId = String(formData.get("event_id") ?? "");
  const caption = String(formData.get("caption") ?? "").trim();

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Arquivo ausente." }, { status: 400 });
  }
  if (!eventId) {
    return NextResponse.json({ error: "Escolha o evento." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `Arquivo acima de ${MAX_BYTES / 1024 / 1024}MB.` },
      { status: 413 },
    );
  }

  const isVideo = file.type.startsWith("video/");

  try {
    const uploaded = await uploadToDrive(
      file,
      `${Date.now()}-${slugFilename(file.name)}`,
    );

    const { data: inserted, error } = await supabase
      .from("media")
      .insert({
        event_id: eventId,
        photographer_id: user.id,
        drive_file_id: uploaded.fileId,
        url: uploaded.url,
        thumbnail_url: uploaded.thumbnailUrl,
        storage_path: null,
        type: isVideo ? "video" : "photo",
        caption: caption || null,
        width: null,
        height: null,
        status: "approved",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ media: inserted }, { status: 201 });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Erro inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
