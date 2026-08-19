"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import type { PepperQuoteStatus } from "@/lib/pepper/types";
import { createClient } from "@/utils/supabase/server";

const STATUSES: readonly PepperQuoteStatus[] = ["new", "contacted", "won", "lost"];

export async function setQuoteStatus(formData: FormData): Promise<void> {
  await requireAdmin();

  const quoteId = String(formData.get("quote_id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!quoteId || !(STATUSES as readonly string[]).includes(status)) return;

  const supabase = await createClient();
  await supabase
    .from("pepper_quotes")
    .update({ status: status as PepperQuoteStatus })
    .eq("id", quoteId);

  revalidatePath("/dashboard/admin/pepper/quotes");
  revalidatePath(`/dashboard/admin/pepper/quotes/${quoteId}`);
}
