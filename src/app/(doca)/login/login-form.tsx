"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { signIn, signUp, type AuthState } from "./actions";

const EMPTY: AuthState = {};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-street neon-magenta w-full"
    >
      {pending ? "Aguarde…" : label}
    </button>
  );
}

export function LoginForm({
  next,
  startAsSignUp,
}: {
  next: string;
  startAsSignUp: boolean;
}) {
  const [isSignUp, setIsSignUp] = useState(startAsSignUp);
  const [signInState, signInAction] = useActionState(signIn, EMPTY);
  const [signUpState, signUpAction] = useActionState(signUp, EMPTY);

  const state = isSignUp ? signUpState : signInState;

  return (
    <div className="w-full max-w-md">
      {/* alternador */}
      {/* aria-pressed + o marcador "▸" garantem que o estado selecionado
          não dependa só da cor de fundo. */}
      <div className="mb-8 grid grid-cols-2 border border-concrete">
        <button
          type="button"
          aria-pressed={!isSignUp}
          onClick={() => setIsSignUp(false)}
          className={`py-3 font-display text-lg uppercase tracking-wider transition-colors ${
            isSignUp
              ? "bg-transparent text-ash hover:text-bone"
              : "bg-bone text-void"
          }`}
        >
          {!isSignUp && <span aria-hidden="true">▸ </span>}
          Entrar
        </button>
        <button
          type="button"
          aria-pressed={isSignUp}
          onClick={() => setIsSignUp(true)}
          className={`py-3 font-display text-lg uppercase tracking-wider transition-colors ${
            isSignUp
              ? "bg-bone text-void"
              : "bg-transparent text-ash hover:text-bone"
          }`}
        >
          {isSignUp && <span aria-hidden="true">▸ </span>}
          Credencial
        </button>
      </div>

      <form
        key={isSignUp ? "signup" : "signin"}
        action={isSignUp ? signUpAction : signInAction}
        className="space-y-4"
      >
        <input type="hidden" name="next" value={next} />

        {isSignUp && (
          <div>
            <label htmlFor="full_name" className="stamp mb-2 block">
              Nome / @ de trabalho
            </label>
            <input
              id="full_name"
              name="full_name"
              type="text"
              autoComplete="name"
              placeholder="Ex.: Rafa Flash"
              className="field"
            />
          </div>
        )}

        <div>
          <label htmlFor="email" className="stamp mb-2 block">
            E-mail
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

        <div>
          <label htmlFor="password" className="stamp mb-2 block">
            Senha
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete={isSignUp ? "new-password" : "current-password"}
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

        <SubmitButton label={isSignUp ? "Pedir credencial" : "Entrar"} />
      </form>

      <div className="mt-8">
        {isSignUp ? (
          <p className="stamp leading-relaxed">
            Toda credencial nova entra como fotógrafo e precisa da aprovação do admin antes de subir mídia.
          </p>
        ) : (
          <Link
            href="/recuperar-senha"
            className="stamp leading-relaxed underline hover:text-neon-magenta"
          >
            Esqueceu a senha? Recuperar acesso.
          </Link>
        )}
      </div>

      <Link
        href="/"
        className="mt-6 inline-block font-tech text-xs uppercase tracking-[0.2em] text-ash transition-colors hover:text-neon-blue"
      >
        ← Voltar pra galeria
      </Link>
    </div>
  );
}
