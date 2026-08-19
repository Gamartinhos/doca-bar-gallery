import Link from "next/link";

import { requireAdmin } from "@/lib/auth";

export default async function PepperAdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4 border-b border-concrete pb-6">
        <div>
          <Link href="/dashboard/admin" className="stamp text-ash hover:text-neon-purple">
            ‹ Admin
          </Link>
          <h1 className="mt-2 font-display text-5xl sm:text-6xl">
            <span className="text-bone">AGÊNCIA</span> <span className="neon neon-magenta">PEPPER</span>
          </h1>
        </div>

        <nav className="flex flex-wrap gap-2">
          <Link href="/dashboard/admin/pepper" className="btn-ghost neon-magenta !px-4 !py-2 !text-xs">
            Overview
          </Link>
          <Link href="/dashboard/admin/pepper/creators" className="btn-ghost neon-blue !px-4 !py-2 !text-xs">
            Casting
          </Link>
          <Link href="/dashboard/admin/pepper/quotes" className="btn-ghost neon-green !px-4 !py-2 !text-xs">
            Orçamentos
          </Link>
        </nav>
      </div>

      {children}
    </div>
  );
}
