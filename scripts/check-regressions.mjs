#!/usr/bin/env node
/**
 * Regressões: trava as correções da revisão para não voltarem sozinhas.
 *
 *   node scripts/check-regressions.mjs
 *
 * 1. safeNext() não deixa escapar para host externo (open redirect).
 * 2. Despublicar um evento esconde as mídias dele do público.
 * 3. Fotógrafo suspenso não reescreve mais a própria mídia.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { createClient } from "@supabase/supabase-js";

import { safeNext } from "../src/lib/safe-next.ts";

for (const line of readFileSync(resolve(process.cwd(), ".env.local"), "utf8").split(
  /\r?\n/,
)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const REF = process.env.SUPABASE_PROJECT_REF;
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

let failures = 0;
const check = (ok, label, extra = "") => {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS  " : "FALHOU"} ${label}${extra ? ` → ${extra}` : ""}`);
};

async function sql(query) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${REF}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    },
  );
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/* ------------------------------------------------------------------ */
/* 1. Open redirect                                                    */
/* ------------------------------------------------------------------ */
console.log("--- safeNext (open redirect) ---");

const BASE = "https://doca-bar-gallery.vercel.app";
const ataques = [
  "/\\evil.com",
  "/\\\\evil.com",
  "/\\/evil.com",
  "//evil.com",
  "https://evil.com",
  "http://evil.com",
  "/\tevil.com",
  "/\nevil.com",
];

for (const payload of ataques) {
  const destino = new URL(safeNext(payload), BASE).href;
  check(
    destino.startsWith(BASE),
    `bloqueia ${JSON.stringify(payload)}`,
    destino.startsWith(BASE) ? "" : `VAZOU para ${destino}`,
  );
}

const legitimos = ["/dashboard", "/dashboard/admin", "/evento/x?a=1#b"];
for (const p of legitimos) {
  check(safeNext(p) === p, `preserva ${p}`, safeNext(p));
}

/* ------------------------------------------------------------------ */
/* 2 e 3. RLS                                                          */
/* ------------------------------------------------------------------ */
console.log("\n--- RLS: evento oculto e fotógrafo suspenso ---");

const stamp = Date.now();
const slug = `regressao-${stamp}`;

const [evento] = await sql(`
  insert into public.events (title, slug, date, is_published)
  values ('Regressao ${stamp}', '${slug}', '2026-01-01', false)
  returning id;
`);

await sql(`
  insert into public.media (event_id, photographer_id, url, status)
  values ('${evento.id}', null, 'http://regressao/${stamp}.jpg', 'approved');
`);

const anon = createClient(URL_, ANON);

const oculto = await anon
  .from("media")
  .select("id")
  .eq("event_id", evento.id);
check(
  (oculto.data?.length ?? 0) === 0,
  "mídia de evento despublicado fica invisível para o público",
  `${oculto.data?.length ?? 0} linha(s)`,
);

await sql(`update public.events set is_published = true where id = '${evento.id}';`);

const visivel = await anon.from("media").select("id").eq("event_id", evento.id);
check(
  (visivel.data?.length ?? 0) === 1,
  "ao publicar o evento a mídia reaparece",
  `${visivel.data?.length ?? 0} linha(s)`,
);

// Políticas de escrita agora exigem fotógrafo aprovado.
const [pol] = await sql(`
  select string_agg(policyname, ',' order by policyname) as nomes,
         bool_and(qual like '%is_approved_photographer%') as exige_aprovacao
  from pg_policies
  where schemaname = 'public' and tablename = 'media'
    and policyname in ('media_update_own', 'media_delete_own');
`);
check(
  pol?.exige_aprovacao === true,
  "media_update_own e media_delete_own exigem fotógrafo aprovado",
  pol?.nomes ?? "políticas ausentes",
);

const [ins] = await sql(`
  select count(*)::int as n from pg_trigger
  where tgname = 'guard_user_insert_trg' and not tgisinternal;
`);
check(ins?.n === 1, "trigger guard_user_insert_trg existe");

// limpeza
await sql(`delete from public.events where id = '${evento.id}';`);

console.log(
  failures === 0
    ? "\nRegressões OK — as correções continuam de pé."
    : `\n${failures} regressão(ões) detectada(s).`,
);
process.exit(failures === 0 ? 0 : 1);
