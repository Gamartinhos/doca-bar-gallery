-- =====================================================================
-- PEPPER — precos customizados por creator
-- Migration 0007: pepper_creator_services
--
-- Cada creator pode ajustar o preco de um servico da tabela publica sem
-- mexer no preco base (pepper_services.base_price), que continua sendo o
-- fallback de quem nao personalizou nada.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. TABELA
-- ---------------------------------------------------------------------

create table if not exists public.pepper_creator_services (
  creator_id   uuid not null references public.pepper_creators (id) on delete cascade,
  service_id   uuid not null references public.pepper_services (id) on delete cascade,
  custom_price numeric(10,2) not null,
  is_active    boolean not null default true,
  primary key (creator_id, service_id)
);

comment on table public.pepper_creator_services is
  'Preco customizado do creator para um servico. Sem linha (ou is_active = false) cai no base_price de pepper_services.';

create index if not exists pepper_creator_services_service_idx
  on public.pepper_creator_services (service_id);

-- ---------------------------------------------------------------------
-- 2. RLS
-- ---------------------------------------------------------------------

alter table public.pepper_creator_services enable row level security;

-- Leitura pública: o configurador exclusivo do creator (sublink de
-- orçamento) roda no server para qualquer visitante, sem login.
drop policy if exists "pepper_creator_services_select_public" on public.pepper_creator_services;
create policy "pepper_creator_services_select_public" on public.pepper_creator_services
  for select using (true);

drop policy if exists "pepper_creator_services_insert_own" on public.pepper_creator_services;
create policy "pepper_creator_services_insert_own" on public.pepper_creator_services
  for insert with check (public.owns_pepper_creator(creator_id));

drop policy if exists "pepper_creator_services_update_own" on public.pepper_creator_services;
create policy "pepper_creator_services_update_own" on public.pepper_creator_services
  for update using (public.owns_pepper_creator(creator_id))
  with check (public.owns_pepper_creator(creator_id));

drop policy if exists "pepper_creator_services_delete_own" on public.pepper_creator_services;
create policy "pepper_creator_services_delete_own" on public.pepper_creator_services
  for delete using (public.owns_pepper_creator(creator_id));

drop policy if exists "pepper_creator_services_admin_all" on public.pepper_creator_services;
create policy "pepper_creator_services_admin_all" on public.pepper_creator_services
  for all using (public.is_admin()) with check (public.is_admin());
