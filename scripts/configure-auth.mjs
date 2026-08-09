#!/usr/bin/env node
/**
 * Ajusta a configuração de Auth do projeto Supabase para o fluxo do Doca Bar.
 *
 *   node scripts/configure-auth.mjs
 *
 * Por que autoconfirm ligado:
 * o portão de segurança deste app é a APROVAÇÃO PELO ADMIN
 * (users.is_approved), não a confirmação de e-mail. Com confirmação
 * obrigatória e sem SMTP próprio, o SMTP compartilhado do Supabase é
 * limitado a pouquíssimos e-mails por hora e só entrega para membros da
 * organização — na prática, nenhum fotógrafo conseguiria se cadastrar.
 *
 * Se um dia configurarem um SMTP próprio, basta voltar
 * mailer_autoconfirm para false.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

for (const line of readFileSync(resolve(process.cwd(), ".env.local"), "utf8").split(
  /\r?\n/,
)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const REF = process.env.SUPABASE_PROJECT_REF;
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const SITE = process.env.SITE_URL ?? "https://doca-bar-gallery.vercel.app";

const body = {
  site_url: SITE,
  uri_allow_list: [
    `${SITE}/auth/callback`,
    `${SITE}/**`,
    "http://localhost:3000/auth/callback",
    "http://localhost:3000/**",
  ].join(","),
  mailer_autoconfirm: true,
};

const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/config/auth`, {
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${TOKEN}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(body),
});

if (!res.ok) {
  console.error(`FALHOU (HTTP ${res.status})`);
  console.error((await res.text()).slice(0, 1000));
  process.exit(1);
}

const j = await res.json();
console.log("Auth configurado:");
console.log("  site_url           =", j.site_url);
console.log("  mailer_autoconfirm =", j.mailer_autoconfirm);
console.log("  uri_allow_list     =", j.uri_allow_list);
