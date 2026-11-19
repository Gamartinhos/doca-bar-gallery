"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/utils/supabase/server";

export interface SubmitBirthdayLeadInput {
  full_name: string;
  whatsapp: string;
  instagram: string;
  birth_date: string;
  event_id: string | null;
  event_label: string;
  guest_tier: string;
  wants_camarote: boolean;
}

export interface SubmitBirthdayLeadResult {
  ok: boolean;
  error?: string;
  shareToken?: string;
}

const VALID_TIERS = new Set([
  "ate_5",
  "5_10",
  "10_15",
  "15_20",
  "20_mais",
]);

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getSaoPauloTodayParts(): {
  year: number;
  month: number;
  day: number;
  iso: string;
} {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  const iso = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  return { year, month, day, iso };
}

function calculateAge(birthDateIso: string): number | null {
  const match = birthDateIso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (year < 1900 || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const checkDate = new Date(Date.UTC(year, month - 1, day));
  if (
    checkDate.getUTCFullYear() !== year ||
    checkDate.getUTCMonth() !== month - 1 ||
    checkDate.getUTCDate() !== day
  ) {
    return null;
  }

  const today = getSaoPauloTodayParts();
  if (birthDateIso > today.iso) return null;

  let age = today.year - year;
  if (today.month < month || (today.month === month && today.day < day)) {
    age -= 1;
  }

  return age;
}

export async function submitBirthdayLead(
  input: SubmitBirthdayLeadInput,
): Promise<SubmitBirthdayLeadResult> {
  const fullName = input.full_name.trim();
  const whatsappDigits = input.whatsapp.replace(/\D/g, "");
  const instagramClean = input.instagram.trim().replace(/^@+/, "");
  const birthDate = input.birth_date.trim();
  const eventLabel = input.event_label.trim();
  const guestTier = VALID_TIERS.has(input.guest_tier)
    ? input.guest_tier
    : "ate_5";
  const eventId =
    input.event_id && UUID_REGEX.test(input.event_id.trim())
      ? input.event_id.trim()
      : null;

  if (fullName.length < 2) {
    return { ok: false, error: "Informe seu nome completo." };
  }

  if (whatsappDigits.length < 10 || whatsappDigits.length > 13) {
    return { ok: false, error: "Informe um WhatsApp válido com DDD." };
  }

  if (!instagramClean) {
    return { ok: false, error: "Informe seu @ do Instagram." };
  }

  const age = calculateAge(birthDate);
  if (age === null) {
    return { ok: false, error: "Informe uma data de nascimento válida." };
  }

  if (age < 18) {
    return {
      ok: false,
      error: "Proibido menores de 18 anos na Doca Bar.",
    };
  }

  if (!eventLabel) {
    return {
      ok: false,
      error: "Selecione o evento ou a data da comemoração.",
    };
  }

  try {
    const supabase = await createClient();
    const shareToken = crypto.randomUUID();

    // Importante: não encadear .select() após .insert(), pois anon não tem permissão SELECT em birthday_leads.
    const { error } = await supabase.from("birthday_leads").insert({
      full_name: fullName,
      whatsapp: whatsappDigits,
      instagram: `@${instagramClean}`,
      birth_date: birthDate,
      event_id: eventId,
      event_label: eventLabel,
      guest_tier: guestTier,
      wants_camarote: Boolean(input.wants_camarote),
      share_token: shareToken,
    });

    if (error) {
      return {
        ok: false,
        error:
          "Não foi possível salvar no sistema agora, mas você pode finalizar direto no WhatsApp.",
      };
    }

    revalidatePath("/dashboard/admin");
    revalidatePath("/dashboard/comercial");
    revalidatePath("/dashboard/portaria");
    return { ok: true, shareToken };
  } catch {
    return {
      ok: false,
      error:
        "Falha de conexão ao registrar no banco, mas você pode finalizar direto no WhatsApp.",
    };
  }
}
