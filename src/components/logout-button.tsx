"use client";

import { useTransition } from "react";

import { signOut } from "@/app/login/actions";

export function LogoutButton() {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => void signOut())}
      className="stamp px-2 py-2 transition-colors hover:text-neon-red disabled:opacity-50"
    >
      {pending ? "Saindo…" : "Sair"}
    </button>
  );
}
