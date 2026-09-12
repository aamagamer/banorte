-- Banorte One -- Ronda 2 de datos ficticios, agregada para el prototipo
-- Vite (src/components + src/context en
-- /Users/aamagod/Downloads/vitejs-vite-xpucnryz) que tambien lee de este
-- mismo proyecto Supabase. Ya se ejecuto una vez via el SQL Editor del
-- dashboard (device_bash no tiene salida de red hacia supabase.co, ver
-- docs/ARCHITECTURE.md). Se deja aqui para que el historial de schema
-- quede completo y sea reproducible si se recrea el proyecto.
--
-- savings_history: 12 meses (oct-2025..sep-2026) por cliente -- alimenta
-- graficas de "ahorro por cliente" (nominal vs. poder adquisitivo real).
-- budgets: limite mensual ficticio por cliente (el "gastado" se calcula
-- en vivo desde transactions, nunca se guarda estatico).
-- economic_indicators: catalogo publico (inflacion, tipo de cambio) que
-- antes vivia hardcodeado en lib/mcp/tools.ts (get_inflation/
-- get_exchange_rate) y ahora tambien existe como dato consultable.
-- Se agregan ademas ~22 transacciones del mes actual con mas categorias
-- (renta, transporte, seguro, servicios, restaurantes, suscripciones,
-- nomina, mantenimiento) porque el seed original solo tenia 2-3
-- movimientos por cliente.

create table if not exists public.savings_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  context text not null check (context in ('personal','business')),
  month date not null,
  balance numeric(14,2) not null,
  created_at timestamptz not null default now(),
  unique (user_id, context, month)
);

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month date not null,
  context text not null check (context in ('personal','business')) default 'personal',
  limit_amount numeric(14,2) not null,
  created_at timestamptz not null default now(),
  unique (user_id, month, context)
);

create table if not exists public.economic_indicators (
  id uuid primary key default gen_random_uuid(),
  indicator text not null unique,
  value numeric(14,4) not null,
  period text not null,
  source text not null,
  updated_at timestamptz not null default now()
);

alter table public.savings_history enable row level security;
alter table public.budgets enable row level security;
alter table public.economic_indicators enable row level security;

drop policy if exists "own savings history" on public.savings_history;
create policy "own savings history" on public.savings_history for select using (auth.uid() = user_id);

drop policy if exists "own budgets" on public.budgets;
create policy "own budgets" on public.budgets for select using (auth.uid() = user_id);

drop policy if exists "economic indicators are public read" on public.economic_indicators;
create policy "economic indicators are public read" on public.economic_indicators for select using (true);

insert into public.savings_history (user_id, context, month, balance)
select t.uid, t.ctx, (date '2025-10-01' + ((bal.idx - 1) * interval '1 month'))::date, bal.value
from (
  values
    ('1c3545ae-5e84-4cbf-8474-92840a1f9adb'::uuid, 'personal', array[800,950,1100,1300,1250,1450,1600,1800,1750,2000,2200,2450]),
    ('3f725ded-74d0-4be5-907c-641de4ea37f0'::uuid, 'personal', array[24000,24800,25600,26400,25800,27000,27800,28600,29400,30200,31000,32000]),
    ('4977a411-7b65-445d-a65c-ba08d6433c0a'::uuid, 'personal', array[60000,62500,65000,68000,70500,73000,75500,78000,79500,81500,83000,85000]),
    ('8aed2aa5-b4aa-43f0-b69c-abe0146be08b'::uuid, 'personal', array[1200,1500,1350,1700,2000,1900,2300,2600,3000,3400,3800,4200]),
    ('8aed2aa5-b4aa-43f0-b69c-abe0146be08b'::uuid, 'business', array[28000,30500,29000,32000,35000,33500,37000,39500,41000,43500,45500,47800]),
    ('9e39b4cf-9d7a-40f9-9457-451437a2a4c6'::uuid, 'business', array[95000,99000,102000,106000,110000,108000,115000,119000,123000,128000,134000,142000])
) as t(uid, ctx, balances)
cross join lateral unnest(t.balances) with ordinality as bal(value, idx)
on conflict (user_id, context, month) do update set balance = excluded.balance;

insert into public.budgets (user_id, month, context, limit_amount) values
  ('1c3545ae-5e84-4cbf-8474-92840a1f9adb', '2026-09-01', 'personal', 3500),
  ('3f725ded-74d0-4be5-907c-641de4ea37f0', '2026-09-01', 'personal', 20000),
  ('4977a411-7b65-445d-a65c-ba08d6433c0a', '2026-09-01', 'personal', 28000),
  ('8aed2aa5-b4aa-43f0-b69c-abe0146be08b', '2026-09-01', 'personal', 6000),
  ('9e39b4cf-9d7a-40f9-9457-451437a2a4c6', '2026-09-01', 'business', 40000)
on conflict (user_id, month, context) do update set limit_amount = excluded.limit_amount;

insert into public.economic_indicators (indicator, value, period, source) values
  ('inflation_annual', 4.3, 'anual', 'Demo Mode (simulado) - produccion: INEGI INPC'),
  ('usd_mxn', 18.62, 'spot', 'Demo Mode (simulado) - produccion: Banxico SIE API'),
  ('eur_mxn', 20.05, 'spot', 'Demo Mode (simulado) - produccion: Banxico SIE API')
on conflict (indicator) do update set value = excluded.value, period = excluded.period, source = excluded.source, updated_at = now();

insert into public.transactions (user_id, account_id, occurred_on, description, category, amount, context) values
  ('1c3545ae-5e84-4cbf-8474-92840a1f9adb', null, '2026-09-02', 'Renta cuarto', 'renta', -1800, 'personal'),
  ('1c3545ae-5e84-4cbf-8474-92840a1f9adb', null, '2026-09-06', 'Camion/Metro', 'transporte', -280, 'personal'),
  ('1c3545ae-5e84-4cbf-8474-92840a1f9adb', null, '2026-09-07', 'Plan celular', 'celular', -199, 'personal'),
  ('1c3545ae-5e84-4cbf-8474-92840a1f9adb', null, '2026-09-10', 'Cine', 'entretenimiento', -220, 'personal'),
  ('3f725ded-74d0-4be5-907c-641de4ea37f0', null, '2026-09-02', 'Renta', 'renta', -9500, 'personal'),
  ('3f725ded-74d0-4be5-907c-641de4ea37f0', null, '2026-09-04', 'Seguro auto', 'seguro', -1500, 'personal'),
  ('3f725ded-74d0-4be5-907c-641de4ea37f0', null, '2026-09-05', 'CFE/Agua/Internet', 'servicios', -1800, 'personal'),
  ('3f725ded-74d0-4be5-907c-641de4ea37f0', null, '2026-09-06', 'Supermercado', 'comida', -4200, 'personal'),
  ('3f725ded-74d0-4be5-907c-641de4ea37f0', null, '2026-09-08', 'Gasolina', 'transporte', -1200, 'personal'),
  ('4977a411-7b65-445d-a65c-ba08d6433c0a', null, '2026-09-02', 'Renta departamento', 'renta', -12000, 'personal'),
  ('4977a411-7b65-445d-a65c-ba08d6433c0a', null, '2026-09-05', 'Gasolina', 'transporte', -1800, 'personal'),
  ('4977a411-7b65-445d-a65c-ba08d6433c0a', null, '2026-09-07', 'Restaurante', 'restaurantes', -3200, 'personal'),
  ('4977a411-7b65-445d-a65c-ba08d6433c0a', null, '2026-09-09', 'Streaming', 'suscripciones', -600, 'personal'),
  ('8aed2aa5-b4aa-43f0-b69c-abe0146be08b', null, '2026-09-03', 'Renta cuarto', 'renta', -2800, 'personal'),
  ('8aed2aa5-b4aa-43f0-b69c-abe0146be08b', null, '2026-09-06', 'Super', 'comida', -1100, 'personal'),
  ('8aed2aa5-b4aa-43f0-b69c-abe0146be08b', null, '2026-09-07', 'Camion', 'transporte', -450, 'personal'),
  ('8aed2aa5-b4aa-43f0-b69c-abe0146be08b', null, '2026-09-09', 'Nomina cafe', 'nomina', -3800, 'business'),
  ('8aed2aa5-b4aa-43f0-b69c-abe0146be08b', null, '2026-09-12', 'Servicios cafe', 'servicios', -900, 'business'),
  ('9e39b4cf-9d7a-40f9-9457-451437a2a4c6', null, '2026-09-05', 'Nomina empleados', 'nomina', -35000, 'business'),
  ('9e39b4cf-9d7a-40f9-9457-451437a2a4c6', null, '2026-09-06', 'CFE/Internet ferreteria', 'servicios', -8000, 'business'),
  ('9e39b4cf-9d7a-40f9-9457-451437a2a4c6', null, '2026-09-08', 'Mantenimiento local', 'mantenimiento', -6000, 'business'),
  ('9e39b4cf-9d7a-40f9-9457-451437a2a4c6', null, '2026-09-12', 'Venta mostrador', 'ventas', 45000, 'business');
