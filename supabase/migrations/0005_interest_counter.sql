-- Migration 0005: RPC para o contador de interesse ("Vou Colar")
--
-- O botão "Vou Colar" é clicado por visitantes anônimos, mas a policy de
-- public.events não libera UPDATE pra eles — e não deveria: RLS restringe
-- linha, não coluna, então abrir esse policy deixaria qualquer visitante
-- reescrever title, date, cover_image etc., não só o contador.
--
-- Uma função SECURITY DEFINER escopada resolve isso: só incrementa
-- interest_count, só em eventos que usam esse CTA (interest_type = 'count').

create or replace function public.increment_event_interest(p_event_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count integer;
begin
  update public.events
  set interest_count = interest_count + 1
  where id = p_event_id
    and interest_type = 'count'
  returning interest_count into new_count;

  return new_count;
end;
$$;

grant execute on function public.increment_event_interest(uuid) to anon, authenticated;
