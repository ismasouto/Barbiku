-- Barbiku × Refloresta — esquema inicial (§8).
--
-- Modelo de acceso:
--   * anon (la app cliente):
--       - INSERT en refloresta_orders solo de las columnas de datos del pedido y
--         solo con status = 'pending_payment' (el resto de columnas toman su default).
--       - NO tiene SELECT directo sobre la tabla. Lee sus pedidos con la función
--         get_my_orders(app_user_id), que devuelve SOLO id, pet_local_id,
--         chapa_status y status. tree_planted no es accesible nunca para anon.
--       - SELECT sobre la vista public_stats (contador sin datos personales).
--   * service_role (Edge Functions): acceso total (webhook y panel admin).
--
-- DEMO: el app_user_id (UUID aleatorio generado en el dispositivo) actúa como
-- "secreto" para leer los propios pedidos. En producción esto iría con
-- autenticación real (Supabase Auth) y políticas basadas en auth.uid().

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------

create table public.refloresta_orders (
  id uuid primary key default gen_random_uuid(),
  app_user_id text not null,              -- appUserID de RevenueCat
  pet_local_id text not null,             -- id de la mascota en la app
  pet_name text not null,
  pet_species text not null check (pet_species in ('perro','gato')),
  engraving_text text not null check (char_length(engraving_text) between 1 and 12),
  ship_name text not null,
  ship_street text not null,
  ship_postal_code text not null,
  ship_city text not null,
  ship_province text not null,
  amount_gross numeric(10,2) not null default 20.56,
  amount_net_refloresta numeric(10,2) not null default 20.00,
  status text not null default 'pending_payment'
    check (status in ('pending_payment','paid','refunded','cancelled')),
  chapa_status text not null default 'recibido'
    check (chapa_status in ('recibido','grabando','enviado')),
  tree_planted boolean not null default false,   -- SOLO uso interno
  rc_transaction_id text unique,                 -- idempotencia del webhook
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create index refloresta_orders_user_idx
  on public.refloresta_orders (app_user_id, status, created_at desc);

-- Un pedido pagado por mascota (§9.4)
create unique index one_paid_order_per_pet
  on public.refloresta_orders (app_user_id, pet_local_id)
  where status = 'paid';

create table public.webhook_events (
  id text primary key,          -- id del evento de RevenueCat
  type text not null,
  payload jsonb not null,
  received_at timestamptz not null default now()
);

-- Vista para el contador de prueba social (sin datos personales).
-- Se ejecuta con los permisos de su dueño (security_invoker = false) para que
-- anon pueda contar sin tener SELECT sobre la tabla.
create view public.public_stats
  with (security_invoker = false) as
  select count(*)::int as trees_funded
  from public.refloresta_orders
  where status = 'paid';

-- ---------------------------------------------------------------------------
-- Permisos y RLS
-- ---------------------------------------------------------------------------

alter table public.refloresta_orders enable row level security;
alter table public.webhook_events enable row level security;

-- Partimos de cero: Supabase concede por defecto todo a anon/authenticated.
revoke all on public.refloresta_orders from anon, authenticated;
revoke all on public.webhook_events from anon, authenticated;
revoke all on public.public_stats from anon, authenticated;

-- anon: INSERT solo de columnas de datos (no status, chapa_status, tree_planted,
-- rc_transaction_id, paid_at ni importes). El id puede venir del cliente para
-- no necesitar SELECT al insertar (return=minimal).
grant insert (
  id, app_user_id, pet_local_id, pet_name, pet_species, engraving_text,
  ship_name, ship_street, ship_postal_code, ship_city, ship_province
) on public.refloresta_orders to anon;

create policy "anon_insert_pending_only"
  on public.refloresta_orders
  for insert to anon
  with check (
    status = 'pending_payment'
    and chapa_status = 'recibido'
    and tree_planted = false
    and rc_transaction_id is null
    and paid_at is null
  );

-- Sin políticas de SELECT/UPDATE/DELETE para anon: nada de lecturas directas
-- ni cambios de status desde la app. webhook_events: solo service_role.

grant select on public.public_stats to anon, authenticated;

-- Lectura de los pedidos propios: SOLO columnas permitidas.
create or replace function public.get_my_orders(p_app_user_id text)
returns table (id uuid, pet_local_id text, chapa_status text, status text)
language sql
stable
security definer
set search_path = public
as $$
  select o.id, o.pet_local_id, o.chapa_status, o.status
  from public.refloresta_orders o
  where p_app_user_id is not null
    and length(p_app_user_id) >= 8
    and o.app_user_id = p_app_user_id
  order by o.created_at desc
  limit 100;
$$;

revoke all on function public.get_my_orders(text) from public;
grant execute on function public.get_my_orders(text) to anon, authenticated;
