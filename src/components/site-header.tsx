import Link from "next/link";

import { LogoutButton } from "@/components/logout-button";
import { getCurrentUser } from "@/lib/auth";

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-50 border-b border-concrete bg-void/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
        <Link href="/" className="group flex items-center gap-2">
          <img src="/logo-doca.jpg" alt="DOCA bar" className="h-10 w-auto object-contain transition-opacity group-hover:opacity-80" />
        </Link>

        <nav className="flex flex-wrap items-center justify-end gap-x-1 gap-y-1 sm:gap-x-3">
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
