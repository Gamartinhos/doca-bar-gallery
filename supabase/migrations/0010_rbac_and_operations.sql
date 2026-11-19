-- =====================================================================
-- Migration 0010: QG DA DOCA — RBAC Híbrido, Convites, Lista Nominal,
-- Portaria Mobile e Disponibilidade de Camarotes/Bistrôs por Evento
-- =====================================================================

-- 1. Evoluir public.users (novos cargos + array de permissões extras)
alter table public.users drop constraint if exists users_role_check;
alter table public.users
  add constraint users_role_check
  check (role in ('admin', 'promoter', 'producer', 'bar_manager', 'hostess', 'photographer', 'creator'));

alter table public.users
  add column if not exists permissions text[] not null default '{}';

-- 2. Função helper SECURITY DEFINER para checar permissão (cargo base OU permissão extra)
create or replace function public.has_permission(p_perm text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and u.is_approved = true
      and (
        u.role = 'admin'
        or p_perm = any(u.permissions)
        or (u.role = 'promoter'     and p_perm in ('vip_crm', 'camarotes', 'door_checkin'))
        or (u.role = 'producer'     and p_perm in ('events', 'media_mod', 'upload'))
        or (u.role = 'bar_manager'  and p_perm in ('menu'))
        or (u.role = 'hostess'      and p_perm in ('door_checkin'))
        or (u.role = 'photographer' and p_perm in ('upload'))
      )
  );
$$;

grant execute on function public.has_permission(text) to authenticated;

-- 3. Proteger role, is_approved e permissions nos triggers de public.users
create or replace function public.guard_user_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (
    new.role is distinct from old.role
    or new.is_approved is distinct from old.is_approved
    or new.permissions is distinct from old.permissions
  )
  and not public.is_admin()
  and coalesce(current_setting('app.bypass_user_guard', true), '') <> 'true' then
    raise exception 'Apenas administradores podem alterar role, is_approved ou permissions';
  end if;
  return new;
end;
$$;

create or replace function public.guard_user_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null
     and not public.is_admin()
     and coalesce(current_setting('app.bypass_user_guard', true), '') <> 'true'
     and (
       new.role is distinct from 'photographer'
       or new.is_approved = true
       or coalesce(array_length(new.permissions, 1), 0) > 0
     ) then
    raise exception 'Apenas administradores podem criar usuário com role ou aprovação elevada';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_user_insert_trg on public.users;
create trigger guard_user_insert_trg
  before insert on public.users
  for each row execute function public.guard_user_insert();

-- 4. Tabela de Convites da Equipe Interna (Onboarding Híbrido)
create table if not exists public.staff_invites (
  id          uuid primary key default gen_random_uuid(),
  email       text not null unique,
  full_name   text not null,
  role        text not null default 'promoter'
              check (role in ('admin', 'promoter', 'producer', 'bar_manager', 'hostess', 'photographer')),
  permissions text[] not null default '{}',
  invited_by  uuid references public.users(id) on delete set null,
  accepted_at timestamptz,
  created_at  timestamptz not null default now()
);

alter table public.staff_invites enable row level security;

drop policy if exists "staff_invites_admin_all" on public.staff_invites;
create policy "staff_invites_admin_all"
  on public.staff_invites
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Atualizar handle_new_user() para aplicar convite de staff_invites automaticamente
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_first boolean;
  assigned_role text;
  assigned_approved boolean;
  assigned_perms text[];
  assigned_name text;
  invite_row public.staff_invites%rowtype;
begin
  select count(*) = 0 into is_first from public.users;

  select * into invite_row
  from public.staff_invites
  where lower(email) = lower(new.email)
    and accepted_at is null
  limit 1;

  if is_first then
    assigned_role := 'admin';
    assigned_approved := true;
    assigned_perms := '{}';
    assigned_name := coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1));
  elsif invite_row.id is not null then
    assigned_role := invite_row.role;
    assigned_approved := true;
    assigned_perms := coalesce(invite_row.permissions, '{}');
    assigned_name := coalesce(new.raw_user_meta_data ->> 'full_name', invite_row.full_name, split_part(new.email, '@', 1));
    update public.staff_invites set accepted_at = now() where id = invite_row.id;
  elsif (new.raw_user_meta_data ->> 'role') = 'creator' then
    assigned_role := 'creator';
    assigned_approved := false;
    assigned_perms := '{}';
    assigned_name := coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1));
  else
    assigned_role := 'photographer';
    assigned_approved := false;
    assigned_perms := '{}';
    assigned_name := coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1));
  end if;

  insert into public.users (id, email, full_name, role, is_approved, permissions)
  values (
    new.id,
    new.email,
    assigned_name,
    assigned_role,
    assigned_approved,
    assigned_perms
  )
  on conflict (id) do nothing;

  if assigned_role = 'creator' then
    insert into public.pepper_creators (
      user_id, slug, name, handle, tiktok_handle, is_published
    ) values (
      new.id,
      coalesce(new.raw_user_meta_data ->> 'instagram_handle', new.id::text),
      assigned_name,
      new.raw_user_meta_data ->> 'instagram_handle',
      new.raw_user_meta_data ->> 'tiktok_handle',
      false
    ) on conflict do nothing;
  end if;

  return new;
end;
$$;

-- Fallback seguro para usuário já existente reivindicar convite pendente ao entrar
create or replace function public.claim_my_staff_invite()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_email text;
  invite_row public.staff_invites%rowtype;
begin
  v_uid := auth.uid();
  if v_uid is null then
    return false;
  end if;

  select email into v_email
  from auth.users
  where id = v_uid
  limit 1;

  if v_email is null then
    return false;
  end if;

  select * into invite_row
  from public.staff_invites
  where lower(email) = lower(v_email)
    and accepted_at is null
  limit 1;

  if invite_row.id is null then
    return false;
  end if;

  perform set_config('app.bypass_user_guard', 'true', true);

  insert into public.users (id, email, full_name, role, is_approved, permissions)
  values (
    v_uid,
    v_email,
    invite_row.full_name,
    invite_row.role,
    true,
    coalesce(invite_row.permissions, '{}')
  )
  on conflict (id) do update
    set role = excluded.role,
        is_approved = true,
        permissions = excluded.permissions,
        full_name = coalesce(nullif(trim(public.users.full_name), ''), excluded.full_name);

  update public.staff_invites
  set accepted_at = now()
  where id = invite_row.id;

  return true;
end;
$$;

grant execute on function public.claim_my_staff_invite() to authenticated;

-- 5. Evoluir public.birthday_leads + criar public.birthday_guests
alter table public.birthday_leads
  add column if not exists share_token uuid not null default gen_random_uuid() unique,
  add column if not exists status text not null default 'new'
    check (status in ('new', 'contacted', 'confirmed', 'attended', 'cancelled')),
  add column if not exists extra_checked_in integer not null default 0,
  add column if not exists claimed_tiers text[] not null default '{}',
  add column if not exists notes text;

create table if not exists public.birthday_guests (
  id            uuid primary key default gen_random_uuid(),
  lead_id       uuid not null references public.birthday_leads(id) on delete cascade,
  guest_name    text not null,
  document_hint text,
  checked_in    boolean not null default false,
  checked_in_at timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists birthday_guests_lead_id_idx on public.birthday_guests(lead_id);

alter table public.birthday_guests enable row level security;

-- Atualizar policies de birthday_leads e birthday_guests para equipe autorizada
drop policy if exists "birthday_leads_select_admin" on public.birthday_leads;
drop policy if exists "birthday_leads_select_staff" on public.birthday_leads;
create policy "birthday_leads_select_staff"
  on public.birthday_leads
  for select
  to authenticated
  using (public.has_permission('vip_crm') or public.has_permission('door_checkin'));

drop policy if exists "birthday_leads_update_staff" on public.birthday_leads;
create policy "birthday_leads_update_staff"
  on public.birthday_leads
  for update
  to authenticated
  using (public.has_permission('vip_crm') or public.has_permission('door_checkin'))
  with check (public.has_permission('vip_crm') or public.has_permission('door_checkin'));

drop policy if exists "birthday_leads_delete_admin" on public.birthday_leads;
create policy "birthday_leads_delete_admin"
  on public.birthday_leads
  for delete
  to authenticated
  using (public.is_admin() or public.has_permission('vip_crm'));

drop policy if exists "birthday_guests_staff_all" on public.birthday_guests;
create policy "birthday_guests_staff_all"
  on public.birthday_guests
  for all
  to authenticated
  using (public.has_permission('vip_crm') or public.has_permission('door_checkin'))
  with check (public.has_permission('vip_crm') or public.has_permission('door_checkin'));

-- RPCs SECURITY DEFINER para o aniversariante gerenciar os nomes da lista via share_token
-- (sem abrir SELECT anônimo na tabela birthday_leads!)
create or replace function public.get_birthday_list_by_token(p_token uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  lead_rec record;
  guests_json jsonb;
begin
  select id, full_name, event_label, guest_tier, status, extra_checked_in
  into lead_rec
  from public.birthday_leads
  where share_token = p_token
  limit 1;

  if lead_rec.id is null then
    return null;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', g.id,
        'guest_name', g.guest_name,
        'document_hint', g.document_hint,
        'checked_in', g.checked_in,
        'created_at', g.created_at
      ) order by g.created_at asc
    ),
    '[]'::jsonb
  )
  into guests_json
  from public.birthday_guests g
  where g.lead_id = lead_rec.id;

  return jsonb_build_object(
    'id', lead_rec.id,
    'full_name', lead_rec.full_name,
    'event_label', lead_rec.event_label,
    'guest_tier', lead_rec.guest_tier,
    'status', lead_rec.status,
    'extra_checked_in', lead_rec.extra_checked_in,
    'guests', guests_json
  );
end;
$$;

grant execute on function public.get_birthday_list_by_token(uuid) to anon, authenticated;

create or replace function public.add_birthday_guest_by_token(
  p_token uuid,
  p_guest_name text,
  p_document_hint text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lead_id uuid;
  v_clean_name text;
  v_new_id uuid;
begin
  v_clean_name := trim(coalesce(p_guest_name, ''));
  if length(v_clean_name) < 2 then
    raise exception 'Nome do convidado muito curto';
  end if;

  select id into v_lead_id
  from public.birthday_leads
  where share_token = p_token
  limit 1;

  if v_lead_id is null then
    raise exception 'Lista de aniversário não encontrada';
  end if;

  insert into public.birthday_guests (lead_id, guest_name, document_hint)
  values (v_lead_id, v_clean_name, nullif(trim(coalesce(p_document_hint, '')), ''))
  returning id into v_new_id;

  return jsonb_build_object('id', v_new_id, 'guest_name', v_clean_name);
end;
$$;

grant execute on function public.add_birthday_guest_by_token(uuid, text, text) to anon, authenticated;

create or replace function public.remove_birthday_guest_by_token(
  p_token uuid,
  p_guest_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lead_id uuid;
begin
  select id into v_lead_id
  from public.birthday_leads
  where share_token = p_token
  limit 1;

  if v_lead_id is null then
    return false;
  end if;

  delete from public.birthday_guests
  where id = p_guest_id
    and lead_id = v_lead_id
    and checked_in = false;

  return found;
end;
$$;

grant execute on function public.remove_birthday_guest_by_token(uuid, uuid) to anon, authenticated;

-- 6. Tabela de Disponibilidade de Camarotes (C1-C6) e Bistrôs (B1-B7) por Evento
create table if not exists public.event_space_status (
  id              uuid primary key default gen_random_uuid(),
  event_id        uuid not null references public.events(id) on delete cascade,
  space_code      text not null check (space_code in ('C1','C2','C3','C4','C5','C6','B1','B2','B3','B4','B5','B6','B7')),
  status          text not null default 'available' check (status in ('available', 'negotiating', 'reserved')),
  client_name     text,
  client_whatsapp text,
  notes           text,
  updated_at      timestamptz not null default now(),
  unique (event_id, space_code)
);

create index if not exists event_space_status_event_idx on public.event_space_status(event_id);

alter table public.event_space_status enable row level security;

drop policy if exists "event_space_status_staff_all" on public.event_space_status;
create policy "event_space_status_staff_all"
  on public.event_space_status
  for all
  to authenticated
  using (public.has_permission('camarotes') or public.has_permission('vip_crm') or public.has_permission('door_checkin'))
  with check (public.has_permission('camarotes') or public.has_permission('vip_crm'));

-- RPC pública que retorna APENAS (event_id, space_code, status) sem vazar nome/telefone do cliente
create or replace function public.get_public_event_spaces(p_event_id uuid default null)
returns table (
  event_id uuid,
  space_code text,
  status text
)
language sql
stable
security definer
set search_path = public
as $$
  select s.event_id, s.space_code, s.status
  from public.event_space_status s
  where p_event_id is null or s.event_id = p_event_id;
$$;

grant execute on function public.get_public_event_spaces(uuid) to anon, authenticated;

-- 7. Ampliar policies de events, media, menu, event_leads e pepper para os novos cargos/permissões
drop policy if exists "events_select_public" on public.events;
create policy "events_select_public" on public.events
  for select using (is_published = true or public.has_permission('events') or public.has_permission('media_mod'));

drop policy if exists "events_admin_all" on public.events;
create policy "events_admin_all" on public.events
  for all using (public.has_permission('events')) with check (public.has_permission('events'));

drop policy if exists "media_select_public" on public.media;
create policy "media_select_public" on public.media
  for select using (
    (status = 'approved' and public.event_is_published(event_id))
    or photographer_id = auth.uid()
    or public.has_permission('media_mod')
  );

drop policy if exists "media_admin_all" on public.media;
create policy "media_admin_all" on public.media
  for all using (public.has_permission('media_mod')) with check (public.has_permission('media_mod'));

drop policy if exists "media_bucket_delete" on storage.objects;
create policy "media_bucket_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'media'
    and (owner = auth.uid() or public.has_permission('media_mod') or public.has_permission('events'))
  );

drop policy if exists "menu_categories_admin_all" on public.menu_categories;
create policy "menu_categories_admin_all" on public.menu_categories
  for all using (public.has_permission('menu')) with check (public.has_permission('menu'));

drop policy if exists "menu_items_admin_all" on public.menu_items;
create policy "menu_items_admin_all" on public.menu_items
  for all using (public.has_permission('menu')) with check (public.has_permission('menu'));

drop policy if exists "event_leads_select_admin" on public.event_leads;
create policy "event_leads_select_admin" on public.event_leads
  for select using (public.has_permission('events') or public.has_permission('vip_crm'));

-- Policies da Pepper para suportar permissão explícita 'pepper' além de 'admin'
drop policy if exists "pepper_creators_select_public" on public.pepper_creators;
create policy "pepper_creators_select_public" on public.pepper_creators
  for select using (is_published = true or user_id = auth.uid() or public.has_permission('pepper'));

drop policy if exists "pepper_creators_admin_all" on public.pepper_creators;
create policy "pepper_creators_admin_all" on public.pepper_creators
  for all using (public.has_permission('pepper')) with check (public.has_permission('pepper'));

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
    or public.has_permission('pepper')
  );

drop policy if exists "pepper_media_admin_all" on public.pepper_media;
create policy "pepper_media_admin_all" on public.pepper_media
  for all using (public.has_permission('pepper')) with check (public.has_permission('pepper'));

drop policy if exists "pepper_services_select_public" on public.pepper_services;
create policy "pepper_services_select_public" on public.pepper_services
  for select using (is_active = true or public.has_permission('pepper'));

drop policy if exists "pepper_services_admin_all" on public.pepper_services;
create policy "pepper_services_admin_all" on public.pepper_services
  for all using (public.has_permission('pepper')) with check (public.has_permission('pepper'));

drop policy if exists "pepper_quotes_select_admin" on public.pepper_quotes;
create policy "pepper_quotes_select_admin" on public.pepper_quotes
  for select using (public.has_permission('pepper'));

drop policy if exists "pepper_quotes_admin_all" on public.pepper_quotes;
create policy "pepper_quotes_admin_all" on public.pepper_quotes
  for all using (public.has_permission('pepper')) with check (public.has_permission('pepper'));

drop policy if exists "pepper_creator_services_admin_all" on public.pepper_creator_services;
create policy "pepper_creator_services_admin_all" on public.pepper_creator_services
  for all using (public.has_permission('pepper')) with check (public.has_permission('pepper'));

