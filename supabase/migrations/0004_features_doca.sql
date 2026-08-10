-- Migration 0004: Features Doca (Menu, Leads, Event CTAs)

-- 1. Alterar public.events
alter table public.events
  add column if not exists ticket_url text,
  add column if not exists interest_type text not null default 'none' check (interest_type in ('none', 'link', 'count', 'lead')),
  add column if not exists interest_count integer not null default 0,
  add column if not exists instagram_url text;

-- 2. Tabela Cardápio Categorias
create table if not exists public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- 3. Tabela Cardápio Itens
create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.menu_categories (id) on delete cascade,
  name text not null,
  description text,
  price numeric(10,2),
  is_available boolean not null default true,
  created_at timestamptz not null default now()
);

-- 4. Tabela Leads de Eventos
create table if not exists public.event_leads (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  name text not null,
  whatsapp text not null,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists menu_items_category_id_idx on public.menu_items (category_id);
create index if not exists event_leads_event_id_idx on public.event_leads (event_id);

-- RLS
alter table public.menu_categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.event_leads enable row level security;

-- Políticas de Cardápio (leitura pública, escrita admin)
drop policy if exists "menu_categories_select_public" on public.menu_categories;
create policy "menu_categories_select_public" on public.menu_categories for select using (true);

drop policy if exists "menu_categories_admin_all" on public.menu_categories;
create policy "menu_categories_admin_all" on public.menu_categories for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "menu_items_select_public" on public.menu_items;
create policy "menu_items_select_public" on public.menu_items for select using (true);

drop policy if exists "menu_items_admin_all" on public.menu_items;
create policy "menu_items_admin_all" on public.menu_items for all using (public.is_admin()) with check (public.is_admin());

-- Políticas de Leads (escrita pública, leitura admin)
drop policy if exists "event_leads_insert_public" on public.event_leads;
create policy "event_leads_insert_public" on public.event_leads for insert with check (true);

drop policy if exists "event_leads_select_admin" on public.event_leads;
create policy "event_leads_select_admin" on public.event_leads for select using (public.is_admin());
