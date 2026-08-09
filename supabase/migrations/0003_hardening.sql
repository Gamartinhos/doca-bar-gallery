-- =====================================================================
-- Migration 0003 — endurecimento da RLS
--
-- Corrige três brechas encontradas na revisão:
--   1. Despublicar um evento não escondia as mídias dele.
--   2. Fotógrafo suspenso continuava podendo reescrever/apagar a própria
--      mídia (inclusive trocar url e event_id).
--   3. O guard de privilégio cobria UPDATE mas não INSERT em public.users.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Mídia só aparece se o evento estiver publicado
-- ---------------------------------------------------------------------

-- SECURITY DEFINER para não depender da RLS de events dentro da policy
-- de media (evita acoplar as duas políticas).
create or replace function public.event_is_published(event_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.events e
    where e.id = event_uuid and e.is_published = true
  );
$$;

drop policy if exists "media_select_public" on public.media;

create policy "media_select_public" on public.media
  for select using (
    (status = 'approved' and public.event_is_published(event_id))
    or photographer_id = auth.uid()   -- o autor sempre vê o que é dele
    or public.is_admin()
  );

-- ---------------------------------------------------------------------
-- 2. Suspender um fotógrafo revoga a escrita na mídia dele
-- ---------------------------------------------------------------------

drop policy if exists "media_update_own" on public.media;
drop policy if exists "media_delete_own" on public.media;

create policy "media_update_own" on public.media
  for update
  using (photographer_id = auth.uid() and public.is_approved_photographer())
  with check (photographer_id = auth.uid() and public.is_approved_photographer());

create policy "media_delete_own" on public.media
  for delete
  using (photographer_id = auth.uid() and public.is_approved_photographer());

-- ---------------------------------------------------------------------
-- 3. Guard de privilégio também no INSERT de public.users
--
-- O trigger handle_new_user roda como SECURITY DEFINER durante o signup,
-- quando ainda não existe JWT — por isso auth.uid() é null ali e o
-- bootstrap do primeiro admin continua funcionando.
-- ---------------------------------------------------------------------

create or replace function public.guard_user_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null
     and not public.is_admin()
     and (new.role is distinct from 'photographer' or new.is_approved = true) then
    raise exception 'Apenas administradores podem criar usuário com role ou aprovação elevada';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_user_insert_trg on public.users;
create trigger guard_user_insert_trg
  before insert on public.users
  for each row execute function public.guard_user_insert();
