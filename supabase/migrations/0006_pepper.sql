-- =====================================================================
-- PEPPER — agência de influenciadores dentro do ecossistema Doca
-- Migration 0006: casting, portfólio, tabela de serviços e orçamentos
--
-- Fica no mesmo schema `public` de propósito: o login, os eventos e a
-- mídia são os mesmos do Doca. A Pepper é uma área do produto, não outro
-- banco — é isso que permite uma peça subida pelo creator aparecer no
-- portfólio dele E na galeria oficial da casa sem sincronizar nada.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. TABELAS
-- ---------------------------------------------------------------------

-- Creators agenciados. `user_id` é opcional: o casting pode ser cadastrado
-- pelo admin antes de o creator criar login.
create table if not exists public.pepper_creators (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references public.users (id) on delete set null,
  slug                text not null unique,
  name                text not null,
  handle              text,
  tiktok_handle       text,
  bio                 text,
  city                text,
  avatar_url          text,
  cover_url           text,
  tags                text[] not null default '{}',
  followers_instagram integer not null default 0,
  followers_tiktok    integer not null default 0,
  avg_views           integer not null default 0,
  engagement_rate     numeric(5,2) not null default 0,
  -- Peso do creator sobre o preço base do serviço. 1.0 = tabela cheia.
  rate_multiplier     numeric(4,2) not null default 1
                      check (rate_multiplier > 0 and rate_multiplier <= 9),
  tier                text not null default 'rising'
                      check (tier in ('rising', 'core', 'headline')),
  is_published        boolean not null default false,
  sort_order          integer not null default 0,
  created_at          timestamptz not null default now()
);

comment on table public.pepper_creators is
  'Casting da Pepper. user_id liga ao login do Doca quando o creator tem conta.';

-- Portfólio. `origin` separa material solto de material que veio de um
-- evento do Doca; quando origin = 'doca', media_id aponta para a linha
-- original em public.media e a peça vive nos dois lugares.
create table if not exists public.pepper_media (
  id            uuid primary key default gen_random_uuid(),
  creator_id    uuid not null references public.pepper_creators (id) on delete cascade,
  media_id      uuid references public.media (id) on delete set null,
  event_id      uuid references public.events (id) on delete set null,
  url           text not null,
  thumbnail_url text,
  type          text not null default 'photo' check (type in ('photo', 'video')),
  origin        text not null default 'portfolio'
                check (origin in ('portfolio', 'doca')),
  caption       text,
  status        text not null default 'pending'
                check (status in ('pending', 'approved', 'rejected')),
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  -- Coerência: material marcado como vindo do Doca precisa apontar pra lá.
  constraint pepper_media_origin_coerente
    check (origin = 'portfolio' or event_id is not null or media_id is not null)
);

comment on column public.pepper_media.origin is
  'portfolio = material solto da Pepper; doca = vinculado a evento/midia da casa.';

-- Tabela de serviços do configurador público.
create table if not exists public.pepper_services (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  description text,
  unit        text not null default 'entrega',
  base_price  numeric(10,2) not null default 0,
  lead_days   integer not null default 7,
  icon        text not null default '*',
  sort_order  integer not null default 0,
  is_active   boolean not null default true
);

-- Solicitações de orçamento vindas da calculadora pública.
create table if not exists public.pepper_quotes (
  id           uuid primary key default gen_random_uuid(),
  company      text,
  contact_name text not null,
  email        text not null,
  whatsapp     text,
  briefing     text,
  estimate_min numeric(12,2) not null default 0,
  estimate_max numeric(12,2) not null default 0,
  -- Snapshot do que foi selecionado: serviços, casting, prazo, uso.
  payload      jsonb not null default '{}'::jsonb,
  status       text not null default 'new'
               check (status in ('new', 'contacted', 'won', 'lost')),
  created_at   timestamptz not null default now()
);

create index if not exists pepper_media_creator_idx  on public.pepper_media (creator_id);
create index if not exists pepper_media_event_idx    on public.pepper_media (event_id);
create index if not exists pepper_creators_user_idx  on public.pepper_creators (user_id);
create index if not exists pepper_quotes_created_idx on public.pepper_quotes (created_at desc);

-- ---------------------------------------------------------------------
-- 2. HELPER
-- ---------------------------------------------------------------------

-- SECURITY DEFINER para não recursar na RLS de pepper_creators quando as
-- policies de pepper_media precisarem checar a dona da linha.
create or replace function public.owns_pepper_creator(p_creator_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.pepper_creators c
    where c.id = p_creator_id and c.user_id = auth.uid()
  );
$$;

grant execute on function public.owns_pepper_creator(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 3. RLS
-- ---------------------------------------------------------------------

alter table public.pepper_creators enable row level security;
alter table public.pepper_media    enable row level security;
alter table public.pepper_services enable row level security;
alter table public.pepper_quotes   enable row level security;

-- Casting: público vê só quem está publicado; o creator vê e edita a
-- própria ficha; admin faz tudo.
drop policy if exists "pepper_creators_select_public" on public.pepper_creators;
create policy "pepper_creators_select_public" on public.pepper_creators
  for select using (is_published = true or user_id = auth.uid() or public.is_admin());

drop policy if exists "pepper_creators_update_own" on public.pepper_creators;
create policy "pepper_creators_update_own" on public.pepper_creators
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "pepper_creators_admin_all" on public.pepper_creators;
create policy "pepper_creators_admin_all" on public.pepper_creators
  for all using (public.is_admin()) with check (public.is_admin());

-- Portfólio: público vê só aprovado de creator publicado. Espelha a regra
-- do Doca — despublicar o creator tem que esconder a mídia dele também,
-- senão a peça continua acessível por link direto.
drop policy if exists "pepper_media_select_public" on public.pepper_media;
create policy "pepper_media_select_public" on public.pepper_media
  for select using (
    (
      status = 'approved'
      and exists (
        select 1 from public.pepper_creators c
        where c.id = pepper_media.creator_id and c.is_published = true
      )
    )
    or public.owns_pepper_creator(creator_id)
    or public.is_admin()
  );

drop policy if exists "pepper_media_insert_own" on public.pepper_media;
create policy "pepper_media_insert_own" on public.pepper_media
  for insert with check (public.owns_pepper_creator(creator_id));

drop policy if exists "pepper_media_update_own" on public.pepper_media;
create policy "pepper_media_update_own" on public.pepper_media
  for update using (public.owns_pepper_creator(creator_id))
  with check (public.owns_pepper_creator(creator_id));

drop policy if exists "pepper_media_delete_own" on public.pepper_media;
create policy "pepper_media_delete_own" on public.pepper_media
  for delete using (public.owns_pepper_creator(creator_id));

drop policy if exists "pepper_media_admin_all" on public.pepper_media;
create policy "pepper_media_admin_all" on public.pepper_media
  for all using (public.is_admin()) with check (public.is_admin());

-- Serviços: leitura pública, escrita só admin.
drop policy if exists "pepper_services_select_public" on public.pepper_services;
create policy "pepper_services_select_public" on public.pepper_services
  for select using (is_active = true or public.is_admin());

drop policy if exists "pepper_services_admin_all" on public.pepper_services;
create policy "pepper_services_admin_all" on public.pepper_services
  for all using (public.is_admin()) with check (public.is_admin());

-- Orçamentos: qualquer visitante envia, só admin lê. Mesma forma do
-- event_leads do Doca.
drop policy if exists "pepper_quotes_insert_public" on public.pepper_quotes;
create policy "pepper_quotes_insert_public" on public.pepper_quotes
  for insert with check (true);

drop policy if exists "pepper_quotes_select_admin" on public.pepper_quotes;
create policy "pepper_quotes_select_admin" on public.pepper_quotes
  for select using (public.is_admin());

drop policy if exists "pepper_quotes_admin_all" on public.pepper_quotes;
create policy "pepper_quotes_admin_all" on public.pepper_quotes
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- 4. SEED — tabela de serviços
-- ---------------------------------------------------------------------

insert into public.pepper_services
  (slug, name, description, unit, base_price, lead_days, icon, sort_order)
values
  ('tiktok', 'Video TikTok',
   'Roteiro, gravacao e publicacao no perfil do creator. Corte vertical, trilha do momento.',
   'video', 1800, 7, '>', 1),
  ('reels', 'Reels Instagram',
   'Reels de ate 60s com edicao da casa, legenda e call-to-action fechado com a marca.',
   'reels', 2100, 7, 'o', 2),
  ('stories', 'Sequencia de Stories',
   'Tres a cinco stories no mesmo dia, com link e caixinha.',
   'sequencia', 950, 4, '>', 3),
  ('presenca-vip', 'Presenca VIP',
   'O creator vai ao evento, fica no minimo tres horas e entrega cobertura ao vivo.',
   'noite', 3400, 10, '*', 4),
  ('cobertura', 'Cobertura de evento',
   'Fotografo credenciado do Doca + creator. O material cai na galeria oficial e no portfolio.',
   'evento', 4200, 14, '@', 5),
  ('embaixador', 'Embaixador mensal',
   'Quatro entregas por mes, presenca em dois eventos e direito de uso estendido.',
   'mes', 9800, 21, '#', 6)
on conflict (slug) do nothing;
