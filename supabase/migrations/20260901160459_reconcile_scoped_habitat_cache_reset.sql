-- Reconcile the cache-reset guard after production adopts a migration ledger.
-- The earlier migration was not part of the former manual VPS allowlist, so
-- accept either its original or corrected state and converge on the latter.

do $migration$
declare
  function_definition text;
  scoped_definition text;
  cells_delete text := 'delete from public.coarse_species_habitat_cells;';
  profiles_delete text := 'delete from public.species_habitat_profiles;';
  scoped_cells_delete text := 'delete from public.coarse_species_habitat_cells where true;';
  scoped_profiles_delete text := 'delete from public.species_habitat_profiles where true;';
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

  if pg_catalog.strpos(function_definition, scoped_cells_delete) > 0
    and pg_catalog.strpos(function_definition, scoped_profiles_delete) > 0
  then
    return;
  end if;

  if pg_catalog.strpos(function_definition, cells_delete) = 0
    or pg_catalog.strpos(function_definition, profiles_delete) = 0
  then
    raise exception 'Expected coarse habitat cache reset statements were not found';
  end if;

  scoped_definition := pg_catalog.replace(
    function_definition,
    cells_delete,
    scoped_cells_delete
  );
  scoped_definition := pg_catalog.replace(
    scoped_definition,
    profiles_delete,
    scoped_profiles_delete
  );

  execute scoped_definition;
end;
$migration$;
