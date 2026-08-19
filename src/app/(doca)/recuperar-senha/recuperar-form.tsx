"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { recoverPassword, type AuthState } from "@/app/(doca)/login/actions";

const EMPTY: AuthState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-street neon-magenta w-full"
    >
      {pending ? "Aguarde…" : "Enviar link de recuperação"}
    </button>
  );
}

export function RecuperarForm() {
  const [state, action] = useActionState(recoverPassword, EMPTY);

  return (
    <div className="w-full max-w-md">
      <form action={action} className="space-y-4">
        <div>
          <label htmlFor="email" className="stamp mb-2 block">
            E-mail da sua conta
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="voce@email.com"
            className="field"
          />
        </div>

        {state.error && (
          <p
            role="alert"
            className="border border-neon-red bg-neon-red/10 px-3 py-2 font-tech text-sm text-neon-red"
          >
            {state.error}
          </p>
        )}

        {state.message && (
          <p
            role="status"
            className="border border-neon-green bg-neon-green/10 px-3 py-2 font-tech text-sm text-neon-green"
          >
            {state.message}
          </p>
        )}

        <SubmitButton />
      </form>

      <Link
        href="/login"
        className="mt-6 inline-block font-tech text-xs uppercase tracking-[0.2em] text-ash transition-colors hover:text-neon-blue"
      >
        ← Voltar pro login
      </Link>
    </div>
  );
}
