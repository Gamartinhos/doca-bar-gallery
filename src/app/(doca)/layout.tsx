import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

/**
 * Casca do Doca Bar — grão de filme, cabeçalho e rodapé da casa.
 *
 * Fica num route group `(doca)` para que `/pepper` (outra marca dentro do
 * mesmo app e do mesmo banco) não herde nada disso. O grupo não aparece na
 * URL: `(doca)/page.tsx` continua servindo `/`.
 */
export default function DocaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="doca-shell grain flex min-h-full flex-1 flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
