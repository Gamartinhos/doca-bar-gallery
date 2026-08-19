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
    <button type="submit" disabled={pending} className="pp-btn">
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
    <form action={action} className="mt-10">
      <ul className="space-y-3">
        {services.map((service) => (
          <li
            key={service.id}
            className="pp-panel flex flex-wrap items-center justify-between gap-4 rounded-2xl p-4"
          >
            <div className="min-w-0">
              <p className="font-[family-name:var(--pp-font-display)] text-base font-black uppercase leading-none tracking-[-0.02em] text-[var(--pp-chalk)]">
                {service.name}
              </p>
              <p className="pp-label mt-2 text-[0.58rem]">
                Base da Pepper: {brl(service.base_price)} / {service.unit}
              </p>
            </div>

            <label className="flex shrink-0 items-center gap-2">
              <span className="pp-label text-[0.6rem]">R$</span>
              <input
                type="number"
                name={`price_${service.id}`}
                min={0}
                step={0.01}
                inputMode="decimal"
                placeholder={service.base_price.toFixed(2)}
                defaultValue={customPrices[service.id] ?? ""}
                aria-label={`Preço personalizado para ${service.name}`}
                className="pp-field !w-32 text-right"
              />
            </label>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-xs leading-relaxed text-[var(--pp-faint)]">
        Deixe em branco pra usar o preço base da Pepper. O que estiver
        preenchido aqui é o que aparece pro cliente no seu link exclusivo de
        orçamento.
      </p>

      {state.error && (
        <p role="alert" className="pp-glass mt-5 rounded-xl px-4 py-3 text-sm text-[var(--pp-pepper-soft)]">
          {state.error}
        </p>
      )}
      {state.message && (
        <p role="status" className="pp-glass mt-5 rounded-xl px-4 py-3 text-sm text-[var(--pp-chalk)]">
          {state.message}
        </p>
      )}

      <div className="mt-6">
        <Submit />
      </div>
    </form>
  );
}
