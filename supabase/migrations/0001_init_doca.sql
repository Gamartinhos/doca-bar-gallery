-- =====================================================================
-- DOCA BAR — galeria de fotos e vídeos de eventos
-- Migration 0001: schema base, RLS, triggers e storage
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. TABELAS
-- ---------------------------------------------------------------------

-- Perfis de usuário, espelhando auth.users
create table if not exists public.users (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  full_name   text,
  instagram   text,
  role        text not null default 'photographer'
              check (role in ('admin', 'photographer')),
  is_approved boolean not null default false,
  created_at  timestamptz not null default now()
);

comment on table public.users is 'Perfil publico do usuario. role=admin aprova; photographer sobe midia apos is_approved=true.';

-- Eventos (noites) do bar
create table if not exists public.events (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  slug        text not null unique,
  description text,
  date        date not null,
  cover_image text,
  accent      text not null default 'purple'
              check (accent in ('purple', 'blue', 'red', 'green')),
  is_published boolean not null default true,
  created_by  uuid references public.users (id) on delete set null,
  created_at  timestamptz not null default now()
);

-- Mídias (fotos/vídeos) enviadas pelos fotógrafos
create table if not exists public.media (
  id              uuid primary key default gen_random_uuid(),
  event_id        uuid not null references public.events (id) on delete cascade,
  photographer_id uuid references public.users (id) on delete set null,
  drive_file_id   text,
  url             text not null,
  thumbnail_url   text,
  storage_path    text,
  type            text not null default 'photo' check (type in ('photo', 'video')),
  caption         text,
  width           integer,
  height          integer,
  status          text not null default 'approved'
                  check (status in ('pending', 'approved', 'rejected')),
  created_at      timestamptz not null default now()
);

create index if not exists media_event_id_idx        on public.media (event_id);
create index if not exists media_photographer_id_idx on public.media (photographer_id);
create index if not exists media_created_at_idx      on public.media (created_at desc);
create index if not exists events_date_idx           on public.events (date desc);

-- ---------------------------------------------------------------------
-- 2. HELPERS (SECURITY DEFINER para não recursar em RLS de public.users)
-- ---------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users u
    where u.id = auth.uid() and u.role = 'admin'
  );
$$;

create or replace function public.is_approved_photographer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users u
    where u.id = auth.uid() and u.is_approved = true
  );
$$;

-- Cria o perfil automaticamente no signup.
-- O PRIMEIRO usuário do sistema vira admin aprovado (bootstrap).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_first boolean;
begin
  select count(*) = 0 into is_first from public.users;

  insert into public.users (id, email, full_name, role, is_approved)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    case when is_first then 'admin' else 'photographer' end,
    is_first
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 3. RLS
-- ---------------------------------------------------------------------

alter table public.users  enable row level security;
alter table public.events enable row level security;
alter table public.media  enable row level security;

-- ---- users -----------------------------------------------------------
drop policy if exists "users_select_self"   on public.users;
drop policy if exists "users_select_admin"  on public.users;
drop policy if exists "users_update_self"   on public.users;
drop policy if exists "users_update_admin"  on public.users;
drop policy if exists "users_insert_self"   on public.users;

create policy "users_select_self" on public.users
  for select using (auth.uid() = id);

create policy "users_select_admin" on public.users
  for select using (public.is_admin());

create policy "users_insert_self" on public.users
  for insert with check (auth.uid() = id);

-- O próprio usuário edita seu nome/instagram, mas NÃO role/is_approved:
-- essas colunas são travadas pelo trigger abaixo.
create policy "users_update_self" on public.users
  for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "users_update_admin" on public.users
  for update using (public.is_admin()) with check (public.is_admin());

-- Trava escalonamento de privilégio: só admin muda role / is_approved.
create or replace function public.guard_user_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.role is distinct from old.role or new.is_approved is distinct from old.is_approved)
     and not public.is_admin() then
    raise exception 'Apenas administradores podem alterar role ou is_approved';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_user_privileges_trg on public.users;
create trigger guard_user_privileges_trg
  before update on public.users
  for each row execute function public.guard_user_privileges();

-- ---- events ----------------------------------------------------------
drop policy if exists "events_select_public" on public.events;
drop policy if exists "events_admin_all"     on public.events;

create policy "events_select_public" on public.events
  for select using (is_published = true or public.is_admin());

create policy "events_admin_all" on public.events
  for all using (public.is_admin()) with check (public.is_admin());

-- ---- media -----------------------------------------------------------
drop policy if exists "media_select_public"    on public.media;
drop policy if exists "media_insert_approved"  on public.media;
drop policy if exists "media_update_own"       on public.media;
drop policy if exists "media_delete_own"       on public.media;
drop policy if exists "media_admin_all"        on public.media;

create policy "media_select_public" on public.media
  for select using (
    status = 'approved'
    or photographer_id = auth.uid()
    or public.is_admin()
  );

create policy "media_insert_approved" on public.media
  for insert with check (
    photographer_id = auth.uid() and public.is_approved_photographer()
  );

create policy "media_update_own" on public.media
  for update using (photographer_id = auth.uid()) with check (photographer_id = auth.uid());

create policy "media_delete_own" on public.media
  for delete using (photographer_id = auth.uid());

create policy "media_admin_all" on public.media
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- 4. STORAGE (fallback quando o Google Drive não está configurado)
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do update set public = true;

drop policy if exists "media_bucket_read"   on storage.objects;
drop policy if exists "media_bucket_insert" on storage.objects;
drop policy if exists "media_bucket_delete" on storage.objects;

create policy "media_bucket_read" on storage.objects
  for select using (bucket_id = 'media');

create policy "media_bucket_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'media' and public.is_approved_photographer());

create policy "media_bucket_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'media' and (owner = auth.uid() or public.is_admin()));
