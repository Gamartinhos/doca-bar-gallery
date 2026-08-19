import { getCurrentUser } from "@/lib/auth";

import { PepperNav } from "./pepper-nav";

/**
 * Cabeçalho da Pepper. Server component só para descobrir se há sessão —
 * a mesma sessão do Doca, já que é o mesmo `auth.users`. Quem já está
 * logado vai direto pro estúdio; quem não está passa pelo login e volta.
 */
export async function PepperHeader() {
  const user = await getCurrentUser();

  const studioHref = user
    ? "/pepper/estudio"
    : "/login?next=%2Fpepper%2Festudio";

  return <PepperNav studioHref={studioHref} />;
}
