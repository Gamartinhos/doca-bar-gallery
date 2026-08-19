"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import type { PepperService } from "@/lib/pepper/types";

import { createService, updateService, type ActionState } from "./actions";

const EMPTY: ActionState = {};

function Submit({ isEditing }: { isEditing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-street neon-purple w-full">
      {pending ? "Salvando…" : isEditing ? "Salvar Alterações" : "Criar Serviço"}
    </button>
  );
}

export function ServiceForm({ initialData }: { initialData?: PepperService }) {
  const [state, action] = useActionState(
    initialData ? updateService : createService,
    EMPTY,
  );

  return (
    <form action={action} className="space-y-4">
      {initialData && <input type="hidden" name="service_id" value={initialData.id} />}

      <div>
        <label htmlFor="name" className="stamp mb-2 block">
          Nome *
        </label>
        <input
          id="name"
          name="name"
          required
          defaultValue={initialData?.name}
          placeholder="Ex.: Reels Instagram"
          className="field"
        />
      </div>

      <div>
        <label htmlFor="slug" className="stamp mb-2 block">
          Slug
        </label>
        <input
          id="slug"
          name="slug"
          defaultValue={initialData?.slug}
          placeholder="gerado a partir do nome se ficar vazio"
          className="field"
        />
      </div>

      <div>
        <label htmlFor="description" className="stamp mb-2 block">
          Descrição
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={initialData?.description ?? ""}
          placeholder="O que está incluso na entrega"
          className="field resize-y"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="unit" className="stamp mb-2 block">
            Unidade
          </label>
          <input
            id="unit"
            name="unit"
            defaultValue={initialData?.unit ?? "entrega"}
            placeholder="vídeo, story, noite…"
            className="field"
          />
        </div>
        <div>
          <label htmlFor="icon" className="stamp mb-2 block">
            Ícone
          </label>
          <input
            id="icon"
            name="icon"
            maxLength={4}
            defaultValue={initialData?.icon ?? "*"}
            placeholder="*"
            className="field"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="base_price" className="stamp mb-2 block">
            Preço base (R$)
          </label>
          <input
            id="base_price"
            name="base_price"
            type="number"
            min={0}
            step={0.01}
            defaultValue={initialData?.base_price ?? 0}
            className="field"
          />
        </div>
        <div>
          <label htmlFor="lead_days" className="stamp mb-2 block">
            Prazo (dias)
          </label>
          <input
            id="lead_days"
            name="lead_days"
            type="number"
            min={0}
            defaultValue={initialData?.lead_days ?? 7}
            className="field"
          />
        </div>
      </div>

      {state.error && (
        <p role="alert" className="border border-neon-red bg-neon-red/10 px-3 py-2 font-tech text-sm text-neon-red">
          {state.error}
        </p>
      )}
      {state.message && (
        <p role="status" className="border border-neon-green bg-neon-green/10 px-3 py-2 font-tech text-sm text-neon-green">
          {state.message}
        </p>
      )}

      <Submit isEditing={!!initialData} />
      {initialData && (
        <div className="text-center">
          <Link href="/dashboard/admin/pepper/services" className="font-tech text-xs text-bone hover:underline">
            Cancelar Edição
          </Link>
        </div>
      )}
    </form>
  );
}
