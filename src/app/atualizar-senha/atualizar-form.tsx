"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { updatePassword, type AuthState } from "@/app/login/actions";

const EMPTY: AuthState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-street neon-green w-full"
    >
      {pending ? "Salvando…" : "Salvar nova senha"}
    </button>
  );
}

export function AtualizarForm() {
  const [state, action] = useActionState(updatePassword, EMPTY);

  return (
    <div className="w-full max-w-md">
      <form action={action} className="space-y-4">
        <div>
          <label htmlFor="password" className="stamp mb-2 block">
            Nova Senha
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            placeholder="••••••••"
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
    </div>
  );
}
