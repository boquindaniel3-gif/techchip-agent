-- TechChip Systems S.A. — historial de resoluciones
-- Pegar en Supabase → SQL Editor y ejecutar.

create table if not exists public.resoluciones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  tipo text not null default 'resolver' check (tipo in ('resolver', 'estres')),
  metodo text not null default 'all',
  a jsonb,
  b jsonb,
  x jsonb,
  diagnostico jsonb,
  semantica jsonb,
  traza jsonb not null default '[]'::jsonb,
  soluciones jsonb not null default '{}'::jsonb,
  residuos jsonb not null default '{}'::jsonb,
  abortado boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists resoluciones_user_created_idx
  on public.resoluciones (user_id, created_at desc);

alter table public.resoluciones enable row level security;

drop policy if exists "resoluciones_select_own" on public.resoluciones;
create policy "resoluciones_select_own"
  on public.resoluciones
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "resoluciones_insert_own" on public.resoluciones;
create policy "resoluciones_insert_own"
  on public.resoluciones
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "resoluciones_delete_own" on public.resoluciones;
create policy "resoluciones_delete_own"
  on public.resoluciones
  for delete
  to authenticated
  using (user_id = auth.uid());

-- PostgREST necesita los nombres de columnas accesibles.
grant select, insert, delete on public.resoluciones to authenticated;
grant usage on schema public to authenticated;
