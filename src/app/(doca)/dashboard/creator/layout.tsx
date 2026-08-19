import Link from "next/link";

import { requireUser } from "@/lib/auth";

export default async function CreatorDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser("/dashboard/creator");

  return (
    <div className="relative overflow-hidden">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 -top-40 h-96 w-96 rounded-full bg-neon-magenta/20 blur-[120px]"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 top-72 h-96 w-96 rounded-full bg-neon-purple/20 blur-[120px]"
      />

      <div className="relative mx-auto max-w-5xl px-4 py-14 sm:px-6">
        <div className="mb-10 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <p className="stamp text-neon-magenta">Pepper</p>
            <h1 className="mt-1 font-display text-4xl text-bone sm:text-5xl">
              Painel do <span className="neon neon-magenta">creator</span>
            </h1>
          </div>

          <nav className="flex flex-wrap gap-2">
            <Link href="/pepper/estudio" className="btn-ghost neon-blue !px-4 !py-2 !text-xs">
              Portfólio
            </Link>
            <Link href="/pepper/estudio/precos" className="btn-ghost neon-green !px-4 !py-2 !text-xs">
              Preços
            </Link>
          </nav>
        </div>

        {children}
      </div>
    </div>
  );
}
