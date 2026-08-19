"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { cadastrarCreator, type CadastroState } from "./actions";

const EMPTY: CadastroState = {};

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="pp-btn w-full">
      {pending ? "Criando conta…" : "Entrar pro casting"}
    </button>
  );
}

export function CadastroForm() {
  const [state, action] = useActionState(cadastrarCreator, EMPTY);

  return (
    <form action={action} className="mt-8 space-y-5">
      <div>
        <label htmlFor="full_name" className="pp-label mb-2 block text-[0.6rem]">
          Nome *
        </label>
        <input
          id="full_name"
          name="full_name"
          type="text"
          required
          autoComplete="name"
          placeholder="Como te chamam"
          className="pp-field"
        />
      </div>

      <div>
        <label htmlFor="email" className="pp-label mb-2 block text-[0.6rem]">
          E-mail *
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
          Senha *
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          placeholder="••••••••"
          className="pp-field"
        />
      </div>

      <div>
        <label htmlFor="handle" className="pp-label mb-2 block text-[0.6rem]">
          @ do Instagram ou TikTok *
        </label>
        <input
          id="handle"
          name="handle"
          type="text"
          required
          placeholder="seu.perfil"
          className="pp-field"
        />
        <p className="mt-2 text-xs leading-relaxed text-[var(--pp-faint)]">
          Vira o link público do seu perfil na Pepper.
        </p>
      </div>

      {state.error && (
        <p role="alert" className="pp-glass rounded-xl px-4 py-3 text-sm text-[var(--pp-pepper-soft)]">
          {state.error}
        </p>
      )}
      {state.message && (
        <p role="status" className="pp-glass rounded-xl px-4 py-3 text-sm text-[var(--pp-chalk)]">
          {state.message}
        </p>
      )}

      <Submit />

      <p className="text-center text-sm text-[var(--pp-mute)]">
        Já tem conta?{" "}
        <Link href="/pepper/login" className="text-[var(--pp-chalk)] underline decoration-[var(--pp-fog)] underline-offset-4 hover:text-[var(--pp-pepper-soft)]">
          Entrar
        </Link>
      </p>
    </form>
  );
}
