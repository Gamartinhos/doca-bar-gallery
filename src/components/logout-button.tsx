"use client";

import { useTransition } from "react";

import { signOut } from "@/app/login/actions";

export function LogoutButton() {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      // Sem o await, a transition fecha na hora e o estado "Saindo…" some
      // antes do servidor responder.
      onClick={() => startTransition(async () => { await signOut(); })}
      className="stamp px-2 py-2 transition-colors hover:text-neon-red disabled:opacity-50"
    >
      {pending ? "Saindo…" : "Sair"}
    </button>
  );
}
