-- pg-safeupdate rejects unconditional DELETE statements in local development.
-- This builder is service-role-only and intentionally replaces the complete
-- derived cache, so keep that reset explicit without weakening the guard.
do $migration$
declare
  function_definition text;
  scoped_definition text;
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

  scoped_definition := pg_catalog.replace(
    function_definition,
    'delete from public.coarse_species_habitat_cells;',
    'delete from public.coarse_species_habitat_cells where true;'
  );
  scoped_definition := pg_catalog.replace(
    scoped_definition,
    'delete from public.species_habitat_profiles;',
    'delete from public.species_habitat_profiles where true;'
  );

  if scoped_definition = function_definition then
    raise exception 'Expected coarse habitat cache reset statements were not found';
  end if;

  execute scoped_definition;
end;
$migration$;
