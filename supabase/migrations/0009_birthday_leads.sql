create table if not exists public.birthday_leads (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  whatsapp text not null,
  instagram text not null,
  birth_date date not null,
  event_id uuid references public.events(id) on delete set null,
  event_label text not null,
  guest_tier text not null,
  wants_camarote boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.birthday_leads enable row level security;

drop policy if exists "birthday_leads_insert_public" on public.birthday_leads;
create policy "birthday_leads_insert_public"
  on public.birthday_leads
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "birthday_leads_select_admin" on public.birthday_leads;
create policy "birthday_leads_select_admin"
  on public.birthday_leads
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists "birthday_leads_delete_admin" on public.birthday_leads;
create policy "birthday_leads_delete_admin"
  on public.birthday_leads
  for delete
  to authenticated
  using (public.is_admin());

