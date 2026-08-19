import { NotFoundContent } from "@/components/not-found-content";

/**
 * 404 global — URL que não bate com nenhum segmento de nenhuma área.
 *
 * Fica **sem** cabeçalho e rodapé de propósito. O Next serializa este
 * boundary no payload de toda página do app: montar a casca do Doca aqui
 * faria o `SiteHeader` (que é async e chama `getCurrentUser`) rodar a cada
 * request de qualquer rota — inclusive das da Pepper, que nem são do Doca.
 * Um `getUser()` no Supabase por página, só para um 404 que quase nunca
 * aparece.
 *
 * Os 404 que importam — `notFound()` dentro de uma área — caem no boundary
 * mais próximo (`(doca)/not-found.tsx`, `pepper/not-found.tsx`) e esses sim
 * já vêm com a casca da marca em volta.
 */
export default function NotFound() {
  return (
    <div className="doca-shell flex min-h-full flex-1 flex-col">
      <NotFoundContent />
    </div>
  );
}
