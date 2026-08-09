#!/usr/bin/env node
/**
 * Executa um arquivo .sql no projeto Supabase via Management API.
 *
 *   node scripts/supabase-sql.mjs supabase/migrations/0001_init_doca.sql
 *
 * Requer SUPABASE_ACCESS_TOKEN e SUPABASE_PROJECT_REF no ambiente
 * (carregados automaticamente de .env.local).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvLocal() {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      const value = m[2].replace(/^["']|["']$/g, "");
      if (!process.env[m[1]]) process.env[m[1]] = value;
    }
  } catch {
    /* .env.local opcional */
  }
}

loadEnvLocal();

const token = process.env.SUPABASE_ACCESS_TOKEN;
const ref = process.env.SUPABASE_PROJECT_REF;

if (!token || !ref) {
  console.error("Faltando SUPABASE_ACCESS_TOKEN ou SUPABASE_PROJECT_REF.");
  process.exit(1);
}

const target = process.argv[2];
if (!target) {
  console.error("Uso: node scripts/supabase-sql.mjs <arquivo.sql>");
  process.exit(1);
}

const query = readFileSync(resolve(process.cwd(), target), "utf8");

const res = await fetch(
  `https://api.supabase.com/v1/projects/${ref}/database/query`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  },
);

const text = await res.text();

if (!res.ok) {
  console.error(`FALHOU (HTTP ${res.status})`);
  console.error(text.slice(0, 4000));
  process.exit(1);
}

console.log(`OK (HTTP ${res.status})`);
console.log(text.slice(0, 4000));
