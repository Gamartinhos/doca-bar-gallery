# DOCA BAR — galeria das noites

Galeria pública de fotos e vídeos dos eventos do **Doca Bar** (Lapa, Rio de Janeiro),
com área restrita para fotógrafos e painel de administração.

Estética: underground, escura, neon (roxo/azul/vermelho), texturas de grafite e
tipografia de cartaz de rua. Nada de clean.

---

## Níveis de acesso

| Nível            | O que faz                                                      |
| ---------------- | -------------------------------------------------------------- |
| **Público**      | Navega a galeria e os eventos. Sem login.                       |
| **Fotógrafo**    | Cria conta, **aguarda aprovação** e sobe fotos/vídeos.          |
| **Admin**        | Aprova/suspende fotógrafos, promove admins, abre e publica eventos. |

> O **primeiro usuário cadastrado vira admin automaticamente** (bootstrap feito
> pelo trigger `handle_new_user`). Os demais entram como fotógrafo não aprovado.

---

## Stack

- **Next.js 16.3** (App Router, Turbopack, `proxy.ts` no lugar do antigo `middleware.ts`)
- **React 19.2** (`useActionState`, `useFormStatus`, Server Actions)
- **Tailwind CSS v4** (CSS-first: `@theme` / `@layer` / `@utility` em `src/app/globals.css`)
- **Supabase** — Postgres + Auth + RLS + Storage
- **Google Drive** — destino opcional dos uploads (Service Account, JWT assinado na mão)

---

## Rodando local

```bash
npm install
cp .env.example .env.local   # preencha as variáveis do Supabase
npm run dev
```

### Banco

As migrations ficam em `supabase/migrations/` e são aplicadas pela Management API:

```bash
node scripts/supabase-sql.mjs supabase/migrations/0001_init_doca.sql
node scripts/supabase-sql.mjs supabase/migrations/0002_seed_eventos.sql
```

`0001` cria as tabelas, as políticas de RLS, os triggers e o bucket de storage.
`0002` popula as noites reais com os flyers de `public/flyers/` (idempotente).

### Conferindo a segurança

```bash
node scripts/check-rls.mjs
```

Roda uma bateria de checagens com a **chave anônima** (a mesma que vai pro browser):
confirma que o público lê o que deve ler e que não consegue escrever, escalar
privilégio, ler a tabela `users`, nem ver evento despublicado.

---

## Modelo de dados

```
users                      events                     media
─────                      ──────                     ─────
id        → auth.users     id                         id
email                      title                      event_id        → events
full_name                  slug        (único)        photographer_id → users
instagram                  description                drive_file_id
role      admin|photographer  date                    url
is_approved                cover_image                thumbnail_url
created_at                 accent  purple|blue|red|green  storage_path
                           is_published               type    photo|video
                           created_by  → users        caption
                           created_at                 status  pending|approved|rejected
                                                      created_at
```

### Como a RLS protege cada coisa

- `users` — cada um lê a si mesmo; admin lê todos. O trigger
  `guard_user_privileges` **bloqueia no banco** qualquer mudança de `role` ou
  `is_approved` feita por quem não é admin, mesmo que a policy de update passe.
- `events` — público lê só `is_published = true`; escrita só para admin.
- `media` — público lê só `status = 'approved'`; inserção exige
  `is_approved = true` **e** `photographer_id = auth.uid()`, então um fotógrafo
  não consegue publicar em nome de outro.
- As funções `is_admin()` e `is_approved_photographer()` são `SECURITY DEFINER`
  com `search_path` fixo — evitam recursão infinita de RLS na própria tabela `users`.

---

## Upload

O upload tem dois caminhos, escolhidos automaticamente:

1. **Google Drive** — quando `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`
   e `GOOGLE_DRIVE_FOLDER_ID` estão definidos. O arquivo vai por
   `POST /api/upload`, que sobe pro Drive e registra em `media`.
   Limite de ~4MB por arquivo (teto de corpo das funções serverless da Vercel).

2. **Supabase Storage** — fallback quando o Drive não está configurado. O browser
   envia direto pro bucket `media`, sem passar pelo servidor, então **não tem o
   limite de 4MB**.

`src/lib/google-drive.ts` assina o JWT da Service Account com `node:crypto` e fala
com a REST API do Drive via `fetch`, de propósito: o pacote `googleapis` adicionaria
dezenas de MB ao bundle serverless.

---

## Estrutura

```
src/
├── proxy.ts                    renova a sessão e protege /dashboard
├── app/
│   ├── page.tsx                galeria pública
│   ├── evento/[slug]/          página da noite
│   ├── login/                  entrar / pedir credencial
│   ├── dashboard/
│   │   ├── admin/              aprovar fotógrafos, abrir eventos
│   │   └── upload/             enviar mídia
│   └── api/upload/             rota do Google Drive
├── components/                 header, footer, cards, grid + lightbox
├── lib/                        auth, tipos do banco, Google Drive
└── utils/supabase/             clients SSR (browser, server, proxy)
```
