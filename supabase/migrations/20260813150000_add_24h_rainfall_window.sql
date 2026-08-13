-- Preserve the trailing 24-hour rainfall total alongside the existing 3/7/30
-- day windows in both live and cached coarse spatial reads.
do $$
declare
  function_definition text;
  function_signature regprocedure;
begin
  foreach function_signature in array array[
    'public.read_aggregated_cell_environment(double precision, double precision, double precision, double precision, integer, integer)'::regprocedure,
    'public.refresh_spatial_level_conditions(integer, date)'::regprocedure
  ] loop
    function_definition := pg_get_functiondef(function_signature);
    if position(
      $needle$'rainfall3dMm', avg(nullif(latest.values ->> 'rainfall3dMm', '')::double precision)$needle$
      in function_definition
    ) = 0 then
      raise exception 'Could not add rainfall24hMm to %: rainfall3dMm was not found', function_signature;
    end if;

    function_definition := replace(
      function_definition,
      $needle$'rainfall3dMm', avg(nullif(latest.values ->> 'rainfall3dMm', '')::double precision)$needle$,
      $replacement$'rainfall24hMm', avg(nullif(latest.values ->> 'rainfall24hMm', '')::double precision),
        'rainfall3dMm', avg(nullif(latest.values ->> 'rainfall3dMm', '')::double precision)$replacement$
    );
    execute function_definition;
  end loop;
end;
$$;

comment on function public.read_aggregated_cell_environment(double precision, double precision, double precision, double precision, integer, integer) is
  'Returns zoom-adaptive conditions with trailing 24-hour rainfall, 10-day temperature, 7-day air-humidity, and 30-day antecedent moisture context preserved from normalized weather snapshots.';

comment on function public.refresh_spatial_level_conditions(integer, date) is
  'Refreshes coarse current-condition caches while preserving trailing 24-hour rainfall, 10-day temperature, 7-day air-humidity, and 30-day antecedent moisture context.';
