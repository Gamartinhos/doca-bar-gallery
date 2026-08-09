"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { createEvent, type ActionState } from "./actions";

const EMPTY: ActionState = {};

const ACCENTS = [
  { value: "purple", label: "Roxo", swatch: "bg-neon-purple" },
  { value: "blue", label: "Azul", swatch: "bg-neon-blue" },
  { value: "red", label: "Vermelho", swatch: "bg-neon-red" },
  { value: "green", label: "Verde", swatch: "bg-neon-green" },
];

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-street neon-purple w-full"
    >
      {pending ? "Abrindo…" : "Abrir evento"}
    </button>
  );
}

export function EventForm() {
  const [state, action] = useActionState(createEvent, EMPTY);

  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="title" className="stamp mb-2 block">
          Nome da noite *
        </label>
        <input
          id="title"
          name="title"
          required
          placeholder="Ex.: Baile do Bigode"
          className="field"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="date" className="stamp mb-2 block">
            Data *
          </label>
          <input id="date" name="date" type="date" required className="field" />
        </div>

        <div>
          <label htmlFor="accent" className="stamp mb-2 block">
            Cor do neon
          </label>
          <select id="accent" name="accent" className="field" defaultValue="purple">
            {ACCENTS.map((a) => (
              <option key={a.value} value={a.value} className="bg-void">
                {a.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="cover_image" className="stamp mb-2 block">
          URL da capa / flyer
        </label>
        <input
          id="cover_image"
          name="cover_image"
          type="url"
          placeholder="https://…"
          className="field"
        />
      </div>

      <div>
        <label htmlFor="description" className="stamp mb-2 block">
          Line-up / descrição
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          placeholder="Quem toca, quem discoteca, o que rola"
          className="field resize-y"
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

      <Submit />
    </form>
  );
}
