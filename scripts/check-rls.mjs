#!/usr/bin/env node
/**
 * Verificação de RLS com a chave anônima (a mesma que vai pro browser).
 *   node scripts/check-rls.mjs
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { createClient } from "@supabase/supabase-js";

for (const line of readFileSync(resolve(process.cwd(), ".env.local"), "utf8").split(
  /\r?\n/,
)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

let failures = 0;

async function expect(label, promise, shouldAllow) {
  const { data, error } = await promise;
  const allowed = !error && data !== null;
  const rows = Array.isArray(data) ? data.length : allowed ? 1 : 0;
  const ok = shouldAllow ? allowed : !allowed || rows === 0;

  if (!ok) failures += 1;
  console.log(
    `${ok ? "PASS" : "FALHOU"}  ${label} → ${
      error ? `erro: ${error.message.slice(0, 60)}` : `${rows} linha(s)`
    }`,
  );
}

console.log("--- leitura pública (deve PASSAR) ---");
await expect("ler events publicados", sb.from("events").select("id").limit(5), true);
await expect("ler media aprovada", sb.from("media").select("id").limit(5), true);

console.log("\n--- acesso proibido para anônimo (deve ser BLOQUEADO) ---");
await expect("ler tabela users", sb.from("users").select("*").limit(5), false);
await expect(
  "inserir evento",
  sb.from("events").insert({ title: "hack", slug: `hack-${Date.now()}`, date: "2026-01-01" }).select(),
  false,
);
await expect(
  "inserir media",
  sb
    .from("media")
    .insert({ event_id: "00000000-0000-0000-0000-000000000000", url: "http://x" })
    .select(),
  false,
);
await expect(
  "apagar events",
  sb.from("events").delete().neq("id", "00000000-0000-0000-0000-000000000000").select(),
  false,
);
await expect(
  "promover qualquer um a admin",
  sb
    .from("users")
    .update({ role: "admin", is_approved: true })
    .neq("id", "00000000-0000-0000-0000-000000000000")
    .select(),
  false,
);
await expect(
  "ler media pendente/rejeitada de outros",
  sb.from("media").select("id").neq("status", "approved").limit(5),
  false,
);
await expect(
  "ler eventos despublicados",
  sb.from("events").select("id").eq("is_published", false).limit(5),
  false,
);

console.log(
  failures === 0
    ? "\nRLS OK — nenhuma brecha encontrada."
    : `\n${failures} verificação(ões) falharam.`,
);
process.exit(failures === 0 ? 0 : 1);
