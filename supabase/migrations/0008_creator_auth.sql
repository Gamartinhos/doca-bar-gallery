-- =====================================================================
-- PEPPER — Cadastro e aprovação de Creators
-- Migration 0008: Atualização de roles e triggers para Creators
-- =====================================================================

-- 1. Atualizar a constraint da coluna role na tabela public.users
-- Remove a constraint antiga e cria uma nova permitindo 'creator'
alter table public.users drop constraint users_role_check;
alter table public.users add constraint users_role_check check (role in ('admin', 'photographer', 'creator'));

-- 2. Atualizar a função handle_new_user para lidar com o signup de creators
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_first boolean;
  assigned_role text;
begin
  select count(*) = 0 into is_first from public.users;

  -- Se vier a flag no meta data dizendo que é creator, define como creator.
  -- Senão, padrão é photographer. O admin continuará sendo o primeiro usuário.
  if is_first then
    assigned_role := 'admin';
  elsif (new.raw_user_meta_data ->> 'role') = 'creator' then
    assigned_role := 'creator';
  else
    assigned_role := 'photographer';
  end if;

  insert into public.users (id, email, full_name, role, is_approved)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    assigned_role,
    is_first
  )
  on conflict (id) do nothing;

  -- Se for creator, já cria uma linha em pepper_creators aguardando aprovação
  -- (is_published = false) para facilitar o link. Apenas com informações iniciais.
  if assigned_role = 'creator' then
    insert into public.pepper_creators (
      user_id,
      slug,
      name,
      handle,
      tiktok_handle,
      is_published
    ) values (
      new.id,
      -- Slug baseado no nome do usuário para ficar limpo (pode bater conflito, usar uuid é mais seguro, mas vamos tentar higienizar)
      coalesce(new.raw_user_meta_data ->> 'instagram_handle', new.id::text),
      coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
      new.raw_user_meta_data ->> 'instagram_handle',
      new.raw_user_meta_data ->> 'tiktok_handle',
      false
    ) on conflict do nothing;
  end if;

  return new;
end;
$$;
