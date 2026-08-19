"use client";

import type { PepperQuoteStatus } from "@/lib/pepper/types";

import { setQuoteStatus } from "./actions";

const STATUS_OPTIONS: { value: PepperQuoteStatus; label: string }[] = [
  { value: "new", label: "Novo" },
  { value: "contacted", label: "Contatado" },
  { value: "won", label: "Ganho" },
  { value: "lost", label: "Perdido" },
];

export function QuoteStatusForm({
  quoteId,
  status,
  compact = false,
}: {
  quoteId: string;
  status: PepperQuoteStatus;
  compact?: boolean;
}) {
  return (
    <form action={setQuoteStatus}>
      <input type="hidden" name="quote_id" value={quoteId} />
      <select
        name="status"
        defaultValue={status}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className={compact ? "field !w-auto !py-1.5 !text-xs" : "field"}
        aria-label="Status do orçamento"
      >
        {STATUS_OPTIONS.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
    </form>
  );
}
