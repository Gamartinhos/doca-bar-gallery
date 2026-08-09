import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="concrete relative mt-24 border-t border-concrete">
      <div className="hazard h-1 opacity-60" aria-hidden="true" />

      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-3">
        <div>
          <p className="font-display text-5xl leading-none text-bone">DOCA</p>
          <p className="neon neon-purple mt-1 font-tag text-2xl">lapa</p>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-ash">
            A casa é escura, a parede é pichada e a luz é colorida. O que
            acontece aqui fica registrado aqui.
          </p>
        </div>

        <div>
          <h3 className="stamp mb-4 text-bone">Navegação</h3>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/" className="hover:text-neon-blue">
                Galeria de eventos
              </Link>
            </li>
            <li>
              <Link href="/login" className="hover:text-neon-blue">
                Área do fotógrafo
              </Link>
            </li>
            <li>
              <Link href="/dashboard/upload" className="hover:text-neon-blue">
                Enviar mídia
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="stamp mb-4 text-bone">Fotógrafos</h3>
          <p className="text-sm leading-relaxed text-ash">
            Fotografou uma noite na Doca? Crie sua conta, espere a aprovação da
            casa e suba o material direto pra galeria.
          </p>
          <Link
            href="/login?modo=cadastro"
            className="btn-ghost neon-green mt-5 !px-4 !py-2 !text-sm"
          >
            Quero credencial
          </Link>
        </div>
      </div>

      <div className="border-t border-concrete px-4 py-5 sm:px-6">
        <p className="stamp mx-auto max-w-7xl text-[0.65rem]">
          © {new Date().getFullYear()} Doca Bar · Todas as fotos pertencem a
          quem apertou o botão
        </p>
      </div>
    </footer>
  );
}
