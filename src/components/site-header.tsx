import Link from "next/link";

import { LogoutButton } from "@/components/logout-button";
import { getCurrentUser } from "@/lib/auth";

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-50 border-b border-concrete bg-void/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="group flex items-baseline gap-2">
          <span className="font-display text-3xl leading-none tracking-tight text-bone transition-colors group-hover:text-neon-magenta sm:text-4xl">
            DOCA
          </span>
          <span className="neon neon-magenta font-tag text-lg leading-none sm:text-xl">
            bar
          </span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-3">
          <Link
            href="/"
            className="stamp px-2 py-2 transition-colors hover:text-neon-blue"
          >
            Galeria
          </Link>

          {user ? (
            <>
              {user.role === "admin" && (
                <Link
                  href="/dashboard/admin"
                  className="stamp px-2 py-2 transition-colors hover:text-neon-purple"
                >
                  Admin
                </Link>
              )}
              <Link
                href="/dashboard/upload"
                className="stamp px-2 py-2 transition-colors hover:text-neon-green"
              >
                Upload
              </Link>
              <LogoutButton />
            </>
          ) : (
            <Link
              href="/login"
              className="btn-street neon-magenta !px-4 !py-2 !text-sm"
            >
              Entrar
            </Link>
          )}
        </nav>
      </div>

      {/* fita de obra sob o cabeçalho */}
      <div className="hazard h-1 opacity-70" aria-hidden="true" />
    </header>
  );
}
