import type { NextRequest } from "next/server";

import { updateSession } from "@/utils/supabase/middleware";

/**
 * No Next.js 16 o antigo `middleware` passou a se chamar `proxy`.
 * Roda antes de cada request para renovar a sessão do Supabase.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Ignora arquivos estáticos e imagens otimizadas.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|mp4|webm)$).*)",
  ],
};
