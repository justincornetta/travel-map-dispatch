create extension if not exists pgcrypto;

create table if not exists public.stops (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  location_label text not null,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  status text not null check (status in ('visited', 'current', 'upcoming')),
  arrival_date date,
  departure_date date,
  display_after timestamptz,
  teaser text not null check (char_length(teaser) <= 280),
  body text not null default '',
  is_published boolean not null default false,
  notification_sent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  stop_id uuid not null references public.stops(id) on delete cascade,
  storage_path text not null,
  alt_text text,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.subscribers (
  id uuid primary key default gen_random_uuid(),
  phone_number text not null unique,
  consented_at timestamptz not null,
  verified_at timestamptz,
  verification_token text,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  stop_id uuid not null references public.stops(id) on delete cascade,
  subscriber_id uuid not null references public.subscribers(id) on delete cascade,
  status text not null check (status in ('sent', 'failed')),
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists stops_public_status_idx on public.stops (is_published, status, arrival_date);
create index if not exists photos_stop_order_idx on public.photos (stop_id, display_order);
create index if not exists subscribers_active_idx on public.subscribers (verified_at, unsubscribed_at);
create index if not exists notification_deliveries_stop_idx on public.notification_deliveries (stop_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_stops_updated_at on public.stops;
create trigger set_stops_updated_at
before update on public.stops
for each row execute function public.set_updated_at();

drop trigger if exists set_subscribers_updated_at on public.subscribers;
create trigger set_subscribers_updated_at
before update on public.subscribers
for each row execute function public.set_updated_at();

insert into storage.buckets (id, name, public)
values ('travel-photos', 'travel-photos', true)
on conflict (id) do update set public = excluded.public;

alter table public.stops enable row level security;
alter table public.photos enable row level security;
alter table public.subscribers enable row level security;
alter table public.notification_deliveries enable row level security;

drop policy if exists "Public can read published stops" on public.stops;
create policy "Public can read published stops"
on public.stops
for select
to anon, authenticated
using (
  is_published = true
  and (display_after is null or display_after <= now())
);

drop policy if exists "Public can read photos for published stops" on public.photos;
create policy "Public can read photos for published stops"
on public.photos
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.stops
    where stops.id = photos.stop_id
      and stops.is_published = true
      and (stops.display_after is null or stops.display_after <= now())
  )
);

drop policy if exists "Public can read travel photo objects" on storage.objects;
create policy "Public can read travel photo objects"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'travel-photos');

grant usage on schema public to anon, authenticated;
grant select on public.stops, public.photos to anon, authenticated;
