"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { deleteDriveFile } from "@/lib/google-drive";

export async function deleteMediaAction(mediaId: string, slug: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Não autenticado." };
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const userRole = profile?.role;

  const { data: media } = await supabase
    .from("media")
    .select("*")
    .eq("id", mediaId)
    .maybeSingle();

  if (!media) {
    return { success: false, error: "Mídia não encontrada." };
  }

  const isOwner = media.photographer_id === user.id;
  const isAdmin = userRole === "admin";

  if (!isOwner && !isAdmin) {
    return { success: false, error: "Sem permissão." };
  }

  try {
    if (media.drive_file_id) {
      await deleteDriveFile(media.drive_file_id);
    }
    if (media.storage_path) {
      await supabase.storage.from("media").remove([media.storage_path]);
    }

    const { error } = await supabase.from("media").delete().eq("id", mediaId);
    if (error) throw error;

    revalidatePath(`/evento/${slug}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Falha ao excluir." };
  }
}
