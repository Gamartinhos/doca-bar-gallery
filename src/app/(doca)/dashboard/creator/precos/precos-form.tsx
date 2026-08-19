"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { brl } from "@/lib/pepper/format";
import type { PepperService } from "@/lib/pepper/types";

import { salvarPrecosCustomizados, type PrecosState } from "./actions";

const EMPTY: PrecosState = {};

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-street neon-magenta">
      {pending ? "Salvando…" : "Salvar preços"}
    </button>
  );
}

export function PrecosForm({
  services,
  customPrices,
}: {
  services: PepperService[];
  customPrices: Record<string, number>;
}) {
  const [state, action] = useActionState(salvarPrecosCustomizados, EMPTY);

  return (
    <form action={action} className="mt-6">
      <ul className="space-y-3">
        {services.map((service) => (
          <li
            key={service.id}
            className="flex flex-wrap items-center justify-between gap-4 border border-concrete bg-ink px-4 py-3"
          >
            <div className="min-w-0">
              <p className="font-display text-xl text-bone">{service.name}</p>
              <p className="stamp mt-1">
                Base da Pepper: {brl(service.base_price)} / {service.unit}
              </p>
            </div>

            <label className="flex shrink-0 items-center gap-2">
              <span className="stamp">R$</span>
              <input
                type="number"
                name={`price_${service.id}`}
                min={0}
                step={0.01}
                inputMode="decimal"
                placeholder={service.base_price.toFixed(2)}
                defaultValue={customPrices[service.id] ?? ""}
                aria-label={`Preço personalizado para ${service.name}`}
                className="field !w-32 text-right"
              />
            </label>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-sm text-ash">
        Deixe em branco pra usar o preço base da Pepper. O que estiver
        preenchido aqui é o que aparece pro cliente no seu link exclusivo de
        orçamento.
      </p>

      {state.error && (
        <p role="alert" className="mt-4 border border-neon-red bg-neon-red/10 px-3 py-2 font-tech text-sm text-neon-red">
          {state.error}
        </p>
      )}
      {state.message && (
        <p role="status" className="mt-4 border border-neon-green bg-neon-green/10 px-3 py-2 font-tech text-sm text-neon-green">
          {state.message}
        </p>
      )}

      <div className="mt-6">
        <Submit />
      </div>
    </form>
  );
}
