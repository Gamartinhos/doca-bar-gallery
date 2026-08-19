import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/lib/database.types";

/**
 * Rotas que exigem sessão autenticada.
 *
 * `/pepper/estudio` entra aqui — e não só no `requireUser` da página —
 * porque aquela rota tem `loading.tsx`: o shell é enviado antes de o
 * servidor descobrir que não há sessão, e o visitante vê o esqueleto
 * piscar antes de ser jogado no login. Barrando no proxy o redirect vira
 * um 307 limpo, antes de qualquer render.
 */
const PROTECTED_PREFIXES = ["/dashboard", "/pepper/estudio"];

/**
 * Renova o token de sessão a cada request e protege as rotas de dashboard.
 * Chamado pelo `src/proxy.ts` (antigo middleware, renomeado no Next.js 16).
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          supabaseResponse = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // IMPORTANTE: não colocar código entre createServerClient e getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
