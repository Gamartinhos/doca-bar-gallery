import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { deleteDriveFile } from "@/lib/google-drive";

export const maxDuration = 60;

export async function GET(request: Request) {
  // Vercel Cron envia um cabeçalho de segurança para garantir que a rota não seja abusada
  if (request.headers.get("Authorization") !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const supabase = await createClient();

  // Pega a retenção de dias da env, padrão 7
  const days = parseInt(process.env.VIDEO_RETENTION_DAYS || "7", 10);
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() - days);
  
  const { data: oldVideos, error } = await supabase
    .from("media")
    .select("id, drive_file_id")
    .eq("type", "video")
    .not("drive_file_id", "is", null)
    .lt("created_at", thresholdDate.toISOString());

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let deletedCount = 0;
  let failedCount = 0;

  for (const video of oldVideos) {
    try {
      if (video.drive_file_id) {
        await deleteDriveFile(video.drive_file_id);
      }
      // Remove do banco de dados após deletar do Drive
      await supabase.from("media").delete().eq("id", video.id);
      deletedCount++;
    } catch (e) {
      console.error(`Falha ao limpar vídeo ${video.id} (Drive ID: ${video.drive_file_id}):`, e);
      failedCount++;
    }
  }

  return NextResponse.json({
    message: `Limpeza finalizada.`,
    deleted: deletedCount,
    failed: failedCount,
    retentionDays: days
  });
}
