import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { finishDriveUpload } from "@/lib/google-drive";

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  try {
    const { fileId, eventId, caption, isVideo } = await request.json();

    if (!fileId || !eventId) {
      return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400 });
    }

    const uploaded = await finishDriveUpload(fileId);

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
    const message = cause instanceof Error ? cause.message : "Erro ao finalizar upload.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
