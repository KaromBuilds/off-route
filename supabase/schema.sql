-- Off Route — Supabase schema
-- Run once in Supabase: SQL Editor → New query → paste → Run.

create extension if not exists pgcrypto;

create table if not exists public.off_route_reports (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid references auth.users(id) on delete cascade,
  transcript text not null check (char_length(transcript) between 1 and 280),
  type text not null check (type in ('detour', 'route_cut', 'delay')),
  segment_id text not null check (segment_id in ('S1', 'S2', 'S3', 'S4')),
  model_confidence real check (model_confidence between 0 and 1),
  simulated boolean not null default false,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '2 hours',
  constraint expiry_max_6h check (expires_at <= created_at + interval '6 hours'),
  constraint real_rows_have_driver check (simulated or driver_id is not null)
);

-- Security floor: Row Level Security. A driver sees and changes only their own real rows.
alter table public.off_route_reports enable row level security;

drop policy if exists "off_route own reports: read" on public.off_route_reports;
create policy "off_route own reports: read" on public.off_route_reports
  for select to authenticated using (driver_id = auth.uid());

drop policy if exists "off_route own reports: insert" on public.off_route_reports;
create policy "off_route own reports: insert" on public.off_route_reports
  for insert to authenticated with check (driver_id = auth.uid() and simulated = false);

drop policy if exists "off_route own reports: update" on public.off_route_reports;
create policy "off_route own reports: update" on public.off_route_reports
  for update to authenticated using (driver_id = auth.uid())
  with check (driver_id = auth.uid() and simulated = false);

drop policy if exists "off_route own reports: delete" on public.off_route_reports;
create policy "off_route own reports: delete" on public.off_route_reports
  for delete to authenticated using (driver_id = auth.uid());

-- Public notices for passengers: aggregated per segment + type.
-- Returns NO driver id, name, email or transcript (shadow clause).
create or replace function public.off_route_public_notices()
returns table (
  segment_id text,
  type text,
  reporters int,
  status text,
  first_reported timestamptz,
  expires_at timestamptz,
  has_simulated boolean
)
language sql
security definer
set search_path = public
as $$
  select
    r.segment_id,
    r.type,
    count(distinct coalesce(r.driver_id::text, r.id::text))::int as reporters,
    case when count(distinct coalesce(r.driver_id::text, r.id::text)) >= 2
         then 'confirmed' else 'unverified' end as status,
    min(r.created_at) as first_reported,
    max(r.expires_at) as expires_at,
    bool_or(r.simulated) as has_simulated
  from public.off_route_reports r
  where r.expires_at > now()
  group by r.segment_id, r.type
  order by min(r.created_at) desc;
$$;

revoke all on function public.off_route_public_notices() from public;
grant execute on function public.off_route_public_notices() to anon, authenticated;

-- Demo helper: adds a LABELED simulated second driver agreeing with a report.
-- Only signed-in users; max 10 active simulated rows to prevent abuse.
create or replace function public.off_route_simulate_peer(p_segment text, p_type text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'sign in required';
  end if;
  if (select count(*) from public.off_route_reports where simulated and expires_at > now()) >= 10 then
    raise exception 'too many active simulated reports';
  end if;
  insert into public.off_route_reports (driver_id, transcript, type, segment_id, model_confidence, simulated)
  values (null, 'SIMULATED peer driver report', p_type, p_segment, null, true);
end;
$$;

revoke all on function public.off_route_simulate_peer(text, text) from public;
grant execute on function public.off_route_simulate_peer(text, text) to authenticated;
