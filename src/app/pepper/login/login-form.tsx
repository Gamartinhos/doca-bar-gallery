"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { signIn, type AuthState } from "@/app/(doca)/login/actions";

const EMPTY: AuthState = {};

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="pp-btn w-full">
      {pending ? "Entrando…" : "Entrar"}
    </button>
  );
}

export function PepperLoginForm({ next }: { next: string }) {
  const [state, action] = useActionState(signIn, EMPTY);

  return (
    <form action={action} className="mt-8 space-y-5">
      <input type="hidden" name="next" value={next} />

      <div>
        <label htmlFor="email" className="pp-label mb-2 block text-[0.6rem]">
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="voce@email.com"
          className="pp-field"
        />
      </div>

      <div>
        <label htmlFor="password" className="pp-label mb-2 block text-[0.6rem]">
          Senha
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
          className="pp-field"
        />
      </div>

      {state.error && (
        <p role="alert" className="pp-glass rounded-xl px-4 py-3 text-sm text-[var(--pp-pepper-soft)]">
          {state.error}
        </p>
      )}

      <Submit />

      <p className="text-center text-sm text-[var(--pp-mute)]">
        Ainda não tem conta?{" "}
        <Link href="/pepper/cadastro" className="text-[var(--pp-chalk)] underline decoration-[var(--pp-fog)] underline-offset-4 hover:text-[var(--pp-pepper-soft)]">
          Entrar pro casting
        </Link>
      </p>
    </form>
  );
}
