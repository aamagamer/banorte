-- Banorte One — schema de datos (seccion 23 del brief).
-- Ejecutar en el SQL editor de Supabase (Project > SQL Editor > New query).
-- Este esquema es la capa de "produccion"; el demo en vivo del hackathon lee
-- de lib/demo-data/customers.ts por velocidad y para no depender de la red
-- durante la presentacion (ver docs/ARCHITECTURE.md "Demo Mode vs Production").

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  profile_type text not null check (profile_type in ('student','parent','professional','entrepreneur','sme')),
  business_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('checking','savings','credit','business')),
  label text not null,
  balance numeric(14,2) not null default 0,
  currency text not null default 'MXN',
  context text not null check (context in ('personal','business')),
  created_at timestamptz not null default now()
);

create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid references public.accounts(id) on delete set null,
  last4 text not null,
  label text not null,
  locked boolean not null default false,
  context text not null check (context in ('personal','business'))
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid references public.accounts(id) on delete set null,
  occurred_on date not null,
  description text not null,
  category text not null,
  amount numeric(14,2) not null,
  context text not null check (context in ('personal','business'))
);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  target numeric(14,2) not null,
  current_amount numeric(14,2) not null default 0,
  target_date date not null,
  context text not null check (context in ('personal','business'))
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('savings','credit','investment')),
  name text not null,
  description text,
  details jsonb not null default '{}'::jsonb
);

create table if not exists public.situations_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  situation_id text not null,
  message text,
  created_at timestamptz not null default now()
);

create table if not exists public.user_context (
  user_id uuid primary key references auth.users(id) on delete cascade,
  preferences jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Row Level Security: cada usuario solo puede ver/editar sus propios datos.
-- Las tools MCP de solo lectura usan el cliente con el JWT del usuario, nunca
-- la service role key, para que RLS siempre aplique (ver context/rules/security.json).
alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.cards enable row level security;
alter table public.transactions enable row level security;
alter table public.goals enable row level security;
alter table public.situations_log enable row level security;
alter table public.user_context enable row level security;

create policy "own profile" on public.profiles for select using (auth.uid() = id);
create policy "own accounts" on public.accounts for select using (auth.uid() = user_id);
create policy "own cards select" on public.cards for select using (auth.uid() = user_id);
create policy "own cards update" on public.cards for update using (auth.uid() = user_id);
create policy "own transactions" on public.transactions for select using (auth.uid() = user_id);
create policy "own goals select" on public.goals for select using (auth.uid() = user_id);
create policy "own goals update" on public.goals for update using (auth.uid() = user_id);
create policy "own situations" on public.situations_log for select using (auth.uid() = user_id);
create policy "own situations insert" on public.situations_log for insert with check (auth.uid() = user_id);
create policy "own context" on public.user_context for select using (auth.uid() = user_id);
create policy "own context upsert" on public.user_context for insert with check (auth.uid() = user_id);
create policy "own context update" on public.user_context for update using (auth.uid() = user_id);

-- products es catalogo publico de solo lectura para cualquier usuario autenticado
alter table public.products enable row level security;
create policy "products are public read" on public.products for select using (true);
