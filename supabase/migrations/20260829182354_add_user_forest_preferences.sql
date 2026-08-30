-- Saved "El meu bosc" choices are private account data. Canonical species
-- and territory validation remains in the application because both catalogues
-- are version-controlled; PostgreSQL stores only their stable identifiers.

create table public.user_forest_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  favourite_species_ids text[] not null default '{}',
  territory_slugs text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_forest_preferences_species_limit
    check (cardinality(favourite_species_ids) <= 40),
  constraint user_forest_preferences_territory_limit
    check (cardinality(territory_slugs) <= 30),
  constraint user_forest_preferences_species_format
    check (
      cardinality(favourite_species_ids) = 0
      or array_to_string(favourite_species_ids, ',') ~ '^[a-z0-9-]+(,[a-z0-9-]+)*$'
    ),
  constraint user_forest_preferences_territory_format
    check (
      cardinality(territory_slugs) = 0
      or array_to_string(territory_slugs, ',') ~ '^[a-z0-9/-]+(,[a-z0-9/-]+)*$'
    )
);

alter table public.user_forest_preferences enable row level security;

revoke all on table public.user_forest_preferences from public, anon, authenticated;
grant select, insert, update, delete on table public.user_forest_preferences to authenticated;
grant select, insert, update, delete on table public.user_forest_preferences to service_role;

create policy "forest owners read their preferences"
on public.user_forest_preferences for select to authenticated
using ((select auth.uid()) = user_id);

create policy "forest owners create their preferences"
on public.user_forest_preferences for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "forest owners update their preferences"
on public.user_forest_preferences for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "forest owners delete their preferences"
on public.user_forest_preferences for delete to authenticated
using ((select auth.uid()) = user_id);

comment on table public.user_forest_preferences is
  'Private saved species and canonical territorial hubs for El meu bosc.';

-- Return only bounded owner aggregates for the private seasonal journal. The
-- function never joins the exact-location, notes, or photo tables.
create or replace function public.read_owner_journal_season(
  p_owner_id uuid,
  p_start_date date,
  p_end_date date
)
returns table (
  species_id text,
  visibility text,
  finding_count bigint,
  first_observed_on date,
  latest_observed_on date
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    findings.reported_species_id,
    findings.visibility,
    count(*)::bigint,
    min(findings.observed_on),
    max(findings.observed_on)
  from public.user_findings findings
  where findings.owner_id = p_owner_id
    and findings.publication_state <> 'hidden'
    and findings.observed_on >= p_start_date
    and findings.observed_on < p_end_date
  group by findings.reported_species_id, findings.visibility
  order by findings.reported_species_id, findings.visibility;
$$;

revoke all on function public.read_owner_journal_season(uuid, date, date)
  from public, anon, authenticated;
grant execute on function public.read_owner_journal_season(uuid, date, date)
  to service_role;

comment on function public.read_owner_journal_season(uuid, date, date) is
  'Owner-only seasonal finding counts for the server-rendered private journal; excludes exact details and hidden findings.';
