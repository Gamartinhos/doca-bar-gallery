"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { submitLead, type LeadState } from "./actions";

const EMPTY: LeadState = {};

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-street neon-red w-full !py-2.5 !text-sm"
    >
      {pending ? "Enviando…" : "Confirmar"}
    </button>
  );
}

export function LeadForm({
  eventId,
  slug,
  alreadyInList,
}: {
  eventId: string;
  slug: string;
  alreadyInList: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(submitLead, EMPTY);

  if (alreadyInList || state.success) {
    return (
      <p className="stamp text-neon-red">✓ Você tá na lista, a casa te chama</p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-street neon-red w-full !px-3 !py-3 text-sm md:w-auto md:!px-8 md:!py-4 md:text-lg"
      >
        Lista VIP
      </button>
    );
  }

  return (
    <form action={action} className="w-full space-y-2 text-left md:w-72">
      <input type="hidden" name="event_id" value={eventId} />
      <input type="hidden" name="slug" value={slug} />
      <input
        name="name"
        placeholder="Seu nome"
        required
        autoComplete="name"
        className="field !py-2.5 !text-sm"
      />
      <input
        name="whatsapp"
        placeholder="WhatsApp com DDD"
        required
        inputMode="tel"
        autoComplete="tel"
        className="field !py-2.5 !text-sm"
      />
      {state.error && (
        <p role="alert" className="stamp text-neon-red">
          {state.error}
        </p>
      )}
      <Submit />
    </form>
  );
}
