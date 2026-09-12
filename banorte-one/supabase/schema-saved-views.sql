-- Banorte One — "Guardar vista" / "Mis vistas" (funcionalidad de vistas
-- guardadas). Ejecutar en el SQL editor de Supabase (Project > SQL Editor >
-- New query), igual que supabase/schema.sql.
--
-- Guarda el UI Schema declarativo que YA produce el agente (lib/agent/*),
-- nunca un screenshot ni solo el texto del prompt, para poder re-renderizar
-- la vista exacta despues sin volver a llamar a Claude (ver
-- lib/saved-views/repository.ts y app/api/saved-views/*).
--
-- customer_id guarda que persona demo (lib/demo-data/customers.ts) estaba
-- activa al guardar: varios componentes (account_card, transaction_list,
-- goal_progress, business_summary, card_controls) leen datos en vivo del
-- customer actual en vez de solo de sus props (ver
-- lib/components-registry/registry.tsx), asi que para reproducir la vista
-- tal cual hay que volver a seleccionar la misma persona al abrirla.

create extension if not exists pgcrypto;

create table if not exists public.saved_views (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text not null default 'General',
  description text,
  prompt text not null,
  customer_id text not null,
  ui_schema jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists saved_views_user_id_created_at_idx
  on public.saved_views (user_id, created_at desc);

-- Row Level Security: un usuario jamas puede leer, modificar o eliminar las
-- vistas guardadas de otro usuario (brief seccion "SEGURIDAD" de esta tarea).
alter table public.saved_views enable row level security;

create policy "own saved views select" on public.saved_views
  for select using (auth.uid() = user_id);

create policy "own saved views insert" on public.saved_views
  for insert with check (auth.uid() = user_id);

create policy "own saved views update" on public.saved_views
  for update using (auth.uid() = user_id);

create policy "own saved views delete" on public.saved_views
  for delete using (auth.uid() = user_id);
