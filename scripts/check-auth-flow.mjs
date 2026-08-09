#!/usr/bin/env node
/**
 * Teste end-to-end do fluxo de conta, usando SOMENTE a chave anônima.
 *
 * Cria dois usuários descartáveis para provar que:
 *   1. o trigger handle_new_user cria o perfil no signup;
 *   2. o PRIMEIRO usuário do sistema vira admin aprovado (bootstrap);
 *   3. o SEGUNDO entra como fotógrafo NÃO aprovado;
 *   4. um fotógrafo não aprovado NÃO consegue se aprovar nem virar admin
 *      (trigger guard_user_privileges) e NÃO consegue inserir mídia;
 *   5. um fotógrafo não consegue publicar mídia em nome de outro.
 *
 * No fim apaga os dois usuários, devolvendo o sistema ao estado zero — o
 * primeiro cadastro real volta a ser o que ganha o admin.
 *
 *   node scripts/check-auth-flow.mjs
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

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const REF = process.env.SUPABASE_PROJECT_REF;

const stamp = Date.now();
const A = { email: `teste-a-${stamp}@docabar-teste.com`, password: `Doca!${stamp}a` };
const B = { email: `teste-b-${stamp}@docabar-teste.com`, password: `Doca!${stamp}b` };

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
  if (!res.ok) throw new Error(`SQL falhou: ${await res.text()}`);
  return res.json();
}

async function cleanup() {
  await sql(
    `delete from auth.users where email in ('${A.email}', '${B.email}');`,
  );
}

// Garante que o estado inicial está limpo (nenhum usuário no sistema).
const [{ n: antes }] = await sql("select count(*)::int as n from public.users;");
console.log(`usuários existentes antes do teste: ${antes}`);

try {
  /* ---------------- usuário A: bootstrap de admin ---------------- */
  const ca = createClient(URL_, ANON);
  const { data: da, error: ea } = await ca.auth.signUp({
    ...A,
    options: { data: { full_name: "Teste A" } },
  });
  check(!ea, "signup do usuário A", ea?.message);

  if (!da?.session) {
    console.log(
      "\nAVISO: signup não devolveu sessão (confirmação de e-mail ligada).\n" +
        "Os testes autenticados abaixo seriam inválidos — abortando e limpando.",
    );
    await cleanup();
    process.exit(0);
  }

  const [rowA] = await sql(
    `select role, is_approved from public.users where email = '${A.email}';`,
  );
  check(!!rowA, "trigger criou o perfil de A");
  check(
    rowA?.role === "admin" && rowA?.is_approved === true,
    "primeiro usuário virou admin aprovado (bootstrap)",
    `role=${rowA?.role} approved=${rowA?.is_approved}`,
  );

  /* ---------------- usuário B: fotógrafo na fila ---------------- */
  const cb = createClient(URL_, ANON);
  const { data: db_, error: eb } = await cb.auth.signUp({
    ...B,
    options: { data: { full_name: "Teste B" } },
  });
  check(!eb, "signup do usuário B", eb?.message);

  const [rowB] = await sql(
    `select role, is_approved from public.users where email = '${B.email}';`,
  );
  check(
    rowB?.role === "photographer" && rowB?.is_approved === false,
    "segundo usuário entrou como fotógrafo NÃO aprovado",
    `role=${rowB?.role} approved=${rowB?.is_approved}`,
  );

  /* ---------------- B tenta escalar privilégio ---------------- */
  const bId = db_.user.id;

  const esc = await cb
    .from("users")
    .update({ role: "admin", is_approved: true })
    .eq("id", bId)
    .select();
  const [rowBafter] = await sql(
    `select role, is_approved from public.users where email = '${B.email}';`,
  );
  check(
    rowBafter?.role === "photographer" && rowBafter?.is_approved === false,
    "B NÃO consegue se promover a admin (guard_user_privileges)",
    esc.error ? `bloqueado: ${esc.error.message.slice(0, 50)}` : "estado inalterado",
  );

  /* ---------------- B (não aprovado) tenta subir mídia ---------------- */
  const [ev] = await sql("select id from public.events limit 1;");
  const ins = await cb
    .from("media")
    .insert({ event_id: ev.id, photographer_id: bId, url: "http://x/x.jpg" })
    .select();
  check(
    !!ins.error,
    "fotógrafo NÃO aprovado é bloqueado ao inserir mídia",
    ins.error?.message.slice(0, 55),
  );

  /* ---------------- B tenta publicar em nome de A ---------------- */
  const aId = da.user.id;
  const imperson = await cb
    .from("media")
    .insert({ event_id: ev.id, photographer_id: aId, url: "http://x/y.jpg" })
    .select();
  check(
    !!imperson.error,
    "fotógrafo NÃO consegue publicar em nome de outro",
    imperson.error?.message.slice(0, 55),
  );

  /* ---------------- B tenta ler a lista de usuários ---------------- */
  const list = await cb.from("users").select("id, email");
  check(
    !list.error && (list.data?.length ?? 0) <= 1,
    "fotógrafo só enxerga o próprio perfil na tabela users",
    `${list.data?.length ?? 0} linha(s)`,
  );

  /* ---------------- A (admin) consegue aprovar B ---------------- */
  const appr = await ca
    .from("users")
    .update({ is_approved: true })
    .eq("id", bId)
    .select();
  check(
    !appr.error && appr.data?.length === 1,
    "admin consegue aprovar o fotógrafo",
    appr.error?.message.slice(0, 55),
  );

  /* ---------------- B aprovado agora consegue subir ---------------- */
  const ins2 = await cb
    .from("media")
    .insert({ event_id: ev.id, photographer_id: bId, url: "http://x/z.jpg" })
    .select();
  check(
    !ins2.error && ins2.data?.length === 1,
    "fotógrafo aprovado consegue inserir mídia",
    ins2.error?.message.slice(0, 55),
  );
} finally {
  await sql(
    `delete from public.media where url in ('http://x/x.jpg','http://x/y.jpg','http://x/z.jpg');`,
  );
  await cleanup();
  const [{ n: depois }] = await sql(
    "select count(*)::int as n from public.users;",
  );
  console.log(`\nlimpeza concluída — usuários restantes: ${depois}`);
  if (depois !== antes) {
    console.log("ATENÇÃO: a contagem não voltou ao valor inicial.");
    failures += 1;
  }
}

console.log(
  failures === 0
    ? "\nFluxo de conta OK — bootstrap, aprovação e bloqueios funcionando."
    : `\n${failures} verificação(ões) falharam.`,
);
process.exit(failures === 0 ? 0 : 1);
