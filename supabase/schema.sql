-- Trip Vault — full Phase 1 schema + Row Level Security
-- Run this in the Supabase SQL editor (Dashboard → SQL → New query).
-- Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE where possible.
--
-- Security model: single-user app, but every table is user-scoped via RLS so the
-- anon/auth key can only ever touch the signed-in user's own rows.

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";  -- gen_random_uuid()

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  destination text,
  start_date date,
  end_date date,
  cover_photo_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.flights (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  airline text,
  flight_number text,
  confirmation_code text,
  depart_airport text,
  depart_datetime timestamptz,
  depart_terminal text,
  depart_gate text,
  arrive_airport text,
  arrive_datetime timestamptz,
  arrive_terminal text,
  seat text,
  baggage text,
  ticket_class text,
  quick_tags text[] default '{}',
  notes text,
  last_status_check timestamptz,
  last_status_data jsonb,
  sort_order int default 0
);

create table if not exists public.hotels (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  name text,
  confirmation_number text,
  checkin_date date,
  checkout_date date,
  checkin_time time,
  checkout_time time,
  address text,
  phone text,
  room_type text,
  rate_per_night numeric,
  currency char(3),
  cancellation_policy text,
  whats_included text,
  quick_tags text[] default '{}',
  notes text,
  sort_order int default 0
);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  name text,
  activity_date date,
  activity_time time,
  duration text,
  confirmation_number text,
  address text,
  operator text,
  cost numeric,
  currency char(3),
  whats_included text,
  cancellation_policy text,
  quick_tags text[] default '{}',
  notes text,
  sort_order int default 0
);

create table if not exists public.restaurants (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  name text,
  reservation_date date,
  reservation_time time,
  party_size int,
  confirmation_number text,
  address text,
  phone text,
  quick_tags text[] default '{}',
  notes text,
  sort_order int default 0
);

create table if not exists public.ground_transport (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  transport_type text,
  company text,
  confirmation_number text,
  pickup_datetime timestamptz,
  pickup_location text,
  dropoff_datetime timestamptz,
  dropoff_location text,
  vehicle_class text,
  cost numeric,
  currency char(3),
  quick_tags text[] default '{}',
  notes text,
  sort_order int default 0
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  doc_type text,            -- passport | visa | insurance | other
  label text,
  file_url text,
  file_type text,           -- image/jpeg | image/png | application/pdf
  policy_number text,       -- insurance only
  provider text,            -- insurance only
  emergency_contact text,   -- insurance only
  coverage_start date,      -- insurance only
  coverage_end date,        -- insurance only
  notes text,
  sort_order int default 0
);

create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  name text,
  use_date date,
  file_url text,
  file_type text,
  quick_tags text[] default '{}',
  notes text,
  sort_order int default 0
);

create table if not exists public.budget_entries (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  amount numeric,
  currency char(3),
  category text,
  description text,
  entry_date date,
  paid_by text,
  notes text
);

create table if not exists public.trip_budgets (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  total_budget numeric,
  currency char(3),
  category_budgets jsonb default '{}'
);

create table if not exists public.share_tokens (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  token text unique not null,
  include_documents boolean default false,
  include_tickets boolean default true,
  include_budget boolean default false,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.imported_emails (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  trip_id uuid references public.trips on delete cascade,
  gmail_message_id text unique not null,
  imported_at timestamptz not null default now(),
  parse_result jsonb
);

create table if not exists public.gmail_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users on delete cascade,
  gmail_address text,
  access_token text,        -- encrypted at rest (server-side handling)
  refresh_token text,       -- encrypted at rest (server-side handling)
  token_expiry timestamptz,
  import_label text default 'Trip Vault'
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index if not exists idx_trips_user on public.trips (user_id);
create index if not exists idx_flights_trip on public.flights (trip_id);
create index if not exists idx_hotels_trip on public.hotels (trip_id);
create index if not exists idx_activities_trip on public.activities (trip_id);
create index if not exists idx_restaurants_trip on public.restaurants (trip_id);
create index if not exists idx_ground_transport_trip on public.ground_transport (trip_id);
create index if not exists idx_documents_trip on public.documents (trip_id);
create index if not exists idx_tickets_trip on public.tickets (trip_id);
create index if not exists idx_budget_entries_trip on public.budget_entries (trip_id);
create index if not exists idx_share_tokens_token on public.share_tokens (token);

-- ---------------------------------------------------------------------------
-- updated_at trigger (trips)
-- ---------------------------------------------------------------------------
drop trigger if exists trips_set_updated_at on public.trips;
create trigger trips_set_updated_at
  before update on public.trips
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security: enable + owner-only policies on every table
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
  user_tables text[] := array[
    'trips','flights','hotels','activities','restaurants','ground_transport',
    'documents','tickets','budget_entries','trip_budgets','share_tokens',
    'imported_emails','gmail_connections'
  ];
begin
  foreach t in array user_tables loop
    execute format('alter table public.%I enable row level security;', t);

    execute format('drop policy if exists %I on public.%I;', t || '_select_own', t);
    execute format(
      'create policy %I on public.%I for select using (auth.uid() = user_id);',
      t || '_select_own', t);

    execute format('drop policy if exists %I on public.%I;', t || '_insert_own', t);
    execute format(
      'create policy %I on public.%I for insert with check (auth.uid() = user_id);',
      t || '_insert_own', t);

    execute format('drop policy if exists %I on public.%I;', t || '_update_own', t);
    execute format(
      'create policy %I on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id);',
      t || '_update_own', t);

    execute format('drop policy if exists %I on public.%I;', t || '_delete_own', t);
    execute format(
      'create policy %I on public.%I for delete using (auth.uid() = user_id);',
      t || '_delete_own', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Public read access for shared trips (Phase 6 — /share/:token)
-- A separate anon-readable path is added later; for Phase 1 all access is
-- owner-only via the policies above.
-- ---------------------------------------------------------------------------
