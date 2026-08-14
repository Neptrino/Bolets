-- The catalogue now contains 52 versioned profiles. Keep headroom for reviewed
-- additions without changing the compact array representation of the cache.
alter table public.species_habitat_profiles
  drop constraint if exists species_habitat_profiles_slot_check;

alter table public.species_habitat_profiles
  add constraint species_habitat_profiles_slot_check
  check (slot between 1 and 64);

do $migration$
declare
  function_definition text;
  expanded_definition text;
begin
  select pg_catalog.pg_get_functiondef(procedure.oid)
  into function_definition
  from pg_catalog.pg_proc procedure
  join pg_catalog.pg_namespace namespace
    on namespace.oid = procedure.pronamespace
  where namespace.nspname = 'public'
    and procedure.proname = 'build_coarse_species_habitat_cache'
    and pg_catalog.pg_get_function_identity_arguments(procedure.oid) =
      'p_profiles jsonb, p_min_y integer, p_max_y integer, p_reset boolean, p_complete boolean';

  if function_definition is null then
    raise exception 'build_coarse_species_habitat_cache was not found';
  end if;

  if pg_catalog.strpos(function_definition, 'profile_count > 64') > 0 then
    -- Existing production projects may already carry the equivalent capacity
    -- expansion under an earlier migration version.
    expanded_definition := function_definition;
  elsif pg_catalog.strpos(function_definition, 'profile_count > 32') > 0 then
    expanded_definition := pg_catalog.replace(
      function_definition,
      'profile_count > 32',
      'profile_count > 64'
    );
  else
    raise exception 'Expected 32- or 64-profile habitat-cache guard was not found';
  end if;

  if expanded_definition <> function_definition then
    execute expanded_definition;
  end if;
end;
$migration$;

comment on column public.species_habitat_profiles.slot is
  'Stable 1-based slot in compact habitat arrays; supports up to 64 versioned catalogue profiles.';
