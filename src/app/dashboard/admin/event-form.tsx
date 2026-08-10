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

        <fieldset>
          <legend className="stamp mb-2">Cor do neon</legend>
          <div className="flex gap-2">
            {ACCENTS.map((a, i) => (
              <label
                key={a.value}
                title={a.label}
                className="group relative flex-1 cursor-pointer"
              >
                <input
                  type="radio"
                  name="accent"
                  value={a.value}
                  defaultChecked={i === 0}
                  className="peer sr-only"
                />
                <span className="sr-only">{a.label}</span>
                <span
                  aria-hidden="true"
                  className={`block h-10 border border-concrete transition-all peer-checked:scale-105 peer-checked:border-bone peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-acid ${a.swatch}`}
                />
              </label>
            ))}
          </div>
        </fieldset>
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

      <fieldset>
        <legend className="stamp mb-2">Chamada para Ação (CTA)</legend>
        <select name="interest_type" className="field mb-4 text-black">
          <option value="none">Nenhum</option>
          <option value="link">Link de Ingressos</option>
          <option value="count">Botão "Vou Colar" (Contador)</option>
          <option value="lead">Lista VIP (Captação de Lead)</option>
        </select>
        
        <input
          name="ticket_url"
          type="url"
          placeholder="URL dos ingressos (se escolheu Link)"
          className="field"
        />
      </fieldset>

      <div>
        <label htmlFor="instagram_url" className="stamp mb-2 block">
          URL do Post Oficial no Instagram
        </label>
        <input
          id="instagram_url"
          name="instagram_url"
          type="url"
          placeholder="https://instagram.com/p/..."
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

      <Submit />
    </form>
  );
}
