"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth";
import type { PepperMediaOrigin, PepperMediaType } from "@/lib/pepper/types";
import { createClient } from "@/utils/supabase/server";

/**
 * Estúdio do creator — gravação das peças de portfólio.
 *
 * O arquivo em si sobe pelo browser (Supabase Storage, bucket `media`);
 * aqui só chega a URL pública. Estas ações fazem a parte que o cliente não
 * pode fazer: decidir de quem é a peça e, no modo "doca", escrever a linha
 * em `public.media` que coloca o material na galeria oficial da casa.
 */

export type EstudioActionResult = { error?: string; success?: boolean };

const LIMITE_LEGENDA = 280;
const LIMITE_CREDITO = 80;
const LIMITE_URL = 2048;

function texto(valor: FormDataEntryValue | null, limite: number): string {
  return String(valor ?? "")
    .trim()
    .slice(0, limite);
}

/**
 * A URL chega do browser depois do upload. Aceitar string livre deixaria
 * gravar `javascript:` ou `data:` no portfólio — que vira XSS na hora que
 * a galeria monta o link. Só https passa.
 */
function urlValida(valor: string): boolean {
  return /^https:\/\/\S+$/i.test(valor);
}

/** ".../storage/v1/object/public/media/<caminho>" → "<caminho>" */
function caminhoNoStorage(url: string): string | null {
  const marca = "/storage/v1/object/public/media/";
  const corte = url.indexOf(marca);
  if (corte === -1) return null;

  const caminho = url.slice(corte + marca.length).split("?")[0];
  if (!caminho) return null;

  try {
    return decodeURIComponent(caminho);
  } catch {
    return caminho;
  }
}

/**
 * Registra uma peça já subida pro Storage.
 *
 * Modo "portfolio": uma linha em `pepper_media` e acabou.
 * Modo "doca": primeiro a linha em `public.media` (galeria da noite),
 * depois a de `pepper_media` apontando pra ela. Uma peça, dois lugares,
 * sem job de sincronização — é o mesmo registro sendo lido por duas áreas.
 */
export async function registrarPecaPortfolio(
  formData: FormData,
): Promise<EstudioActionResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Sua sessão caiu. Entra de novo pra publicar." };

  const url = texto(formData.get("url"), LIMITE_URL);
  const thumbnailUrl = texto(formData.get("thumbnail_url"), LIMITE_URL);
  const tipo = texto(formData.get("type"), 16) as PepperMediaType;
  const origem = texto(formData.get("origin"), 16) as PepperMediaOrigin;
  const eventoRecebido = texto(formData.get("event_id"), 64);
  const legenda = texto(formData.get("caption"), LIMITE_LEGENDA);
  const credito = texto(formData.get("credit"), LIMITE_CREDITO);
  const creatorRecebido = texto(formData.get("creator_id"), 64);

  if (!urlValida(url)) {
    return { error: "Arquivo sem URL válida. Sobe de novo." };
  }
  if (tipo !== "photo" && tipo !== "video") {
    return { error: "Tipo de mídia desconhecido." };
  }
  if (origem !== "portfolio" && origem !== "doca") {
    return { error: "Destino inválido." };
  }
  if (thumbnailUrl && !urlValida(thumbnailUrl)) {
    return { error: "Miniatura com endereço inválido." };
  }

  const supabase = await createClient();

  // O `creator_id` chega pelo formulário, e qualquer um reescreve isso no
  // devtools. A RLS de `pepper_media` (owns_pepper_creator) barraria o
  // insert, mas o insert em `public.media` roda por outra policy — que só
  // olha o fotógrafo, não a Pepper — e passaria feliz com a ficha de
  // outro creator. Por isso a ficha é relida por `user_id` e é ela que
  // manda; o valor do formulário só serve pra detectar sessão trocada em
  // outra aba enquanto a fila subia.
  const { data: creator } = await supabase
    .from("pepper_creators")
    .select("id, slug")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!creator) {
    return {
      error: "Sua ficha de creator não está mais ligada a este login.",
    };
  }
  if (creatorRecebido && creatorRecebido !== creator.id) {
    return { error: "A ficha mudou no meio do envio. Recarrega a página." };
  }

  let mediaId: string | null = null;
  let eventId: string | null = null;
  let eventoSlug: string | null = null;

  if (origem === "doca") {
    if (!eventoRecebido) return { error: "Escolhe a noite antes de mandar." };

    const { data: evento } = await supabase
      .from("events")
      .select("id, slug")
      .eq("id", eventoRecebido)
      .eq("is_published", true)
      .maybeSingle();

    if (!evento) {
      return { error: "Essa noite não está aberta pra receber material." };
    }

    // `public.media` não tem coluna de crédito — a autoria entra na
    // legenda, que é o único texto que a galeria da casa exibe.
    const legendaDoca =
      [legenda, credito && `foto: ${credito}`].filter(Boolean).join(" · ") ||
      null;

    const { data: midia, error: erroMidia } = await supabase
      .from("media")
      .insert({
        event_id: evento.id,
        photographer_id: user.id,
        drive_file_id: null,
        url,
        thumbnail_url: thumbnailUrl || url,
        storage_path: caminhoNoStorage(url),
        type: tipo,
        caption: legendaDoca,
        width: null,
        height: null,
        // Mesma régua do /dashboard/upload: credencial aprovada publica
        // direto na noite. A curadoria da Pepper é outra coisa e acontece
        // em `pepper_media.status`.
        status: "approved",
      })
      .select("id")
      .single();

    if (erroMidia || !midia) {
      return {
        error:
          "A galeria da casa recusou a peça — sua credencial de fotógrafo do Doca precisa estar aprovada pra publicar numa noite.",
      };
    }

    mediaId = midia.id;
    eventId = evento.id;
    eventoSlug = evento.slug;
  }

  const { error: erroPepper } = await supabase.from("pepper_media").insert({
    creator_id: creator.id,
    media_id: mediaId,
    event_id: eventId,
    url,
    thumbnail_url: thumbnailUrl || url,
    type: tipo,
    origin: origem,
    caption: legenda || null,
    status: "pending",
    sort_order: 0,
  });

  if (erroPepper) {
    // Não existe transação entre os dois inserts. Deixar a linha do Doca
    // órfã publicaria a peça na galeria da noite sem ela existir no
    // portfólio — exatamente o contrário do que o creator pediu.
    if (mediaId) await supabase.from("media").delete().eq("id", mediaId);
    return { error: "Não deu pra registrar a peça no portfólio. Tenta de novo." };
  }

  revalidatePath("/pepper/estudio");
  revalidatePath(`/pepper/creators/${creator.slug}`);
  if (eventoSlug) revalidatePath(`/evento/${eventoSlug}`);

  return { success: true };
}

/** Tira uma peça do portfólio. Só do próprio creator. */
export async function removerPecaPortfolio(
  id: string,
): Promise<EstudioActionResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Sua sessão caiu. Entra de novo." };
  if (!id) return { error: "Peça inválida." };

  const supabase = await createClient();

  const { data: creator } = await supabase
    .from("pepper_creators")
    .select("id, slug")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!creator) {
    return { error: "Sua ficha de creator não está mais ligada a este login." };
  }

  const { data: peca } = await supabase
    .from("pepper_media")
    .select("id, creator_id, media_id, origin, url")
    .eq("id", id)
    .maybeSingle();

  if (!peca) return { error: "Essa peça já não está no portfólio." };

  // Mesmo motivo do insert: o id vem do cliente. A policy de delete já
  // exige dono, só que ela falha em silêncio (zero linhas afetadas) e o
  // creator veria "removido" sem nada ter saído. Conferir aqui devolve
  // uma frase honesta.
  if (peca.creator_id !== creator.id) return { error: "Essa peça não é sua." };

  const { error } = await supabase
    .from("pepper_media")
    .delete()
    .eq("id", peca.id);

  if (error) return { error: "Não deu pra remover agora. Tenta de novo." };

  // Peça vinculada a uma noite continua na galeria da casa: sair do
  // portfólio da Pepper não é apagar a cobertura do Doca — quem faz isso é
  // o painel do fotógrafo. Só o material solto, que não tem linha em
  // `public.media`, leva o arquivo do Storage junto.
  if (peca.origin === "portfolio" && !peca.media_id) {
    const caminho = caminhoNoStorage(peca.url);
    if (caminho) await supabase.storage.from("media").remove([caminho]);
  }

  revalidatePath("/pepper/estudio");
  revalidatePath(`/pepper/creators/${creator.slug}`);

  return { success: true };
}
