"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/dashboard/creator", label: "Perfil" },
  { href: "/dashboard/creator/precos", label: "Preços" },
] as const;

export function CreatorTabNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2" aria-label="Painel do creator">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`btn-ghost !px-4 !py-2 !text-xs ${
              active ? "border-neon-magenta text-neon-magenta" : ""
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
      <Link href="/pepper/estudio" className="btn-ghost neon-blue !px-4 !py-2 !text-xs">
        Portfólio
      </Link>
    </nav>
  );
}
