-- Keep exact temperature-bin counts through the existing condition caches.
-- Generated with the CLI; ordered after the pre-existing future-dated 15:05 migration.
-- Missing point distributions remain missing, never an incomplete parent.
create or replace function public.merge_thermal_exposure(p_distributions jsonb)
returns jsonb
language plpgsql immutable security invoker set search_path = ''
as $$
begin
  return (select case
    when p_distributions is null or jsonb_typeof(p_distributions) <> 'array' then null
    when exists (
      select 1 from jsonb_array_elements(p_distributions) as item(value)
      where value = 'null'::jsonb or jsonb_typeof(value) <> 'array' or value = '[]'::jsonb
    ) then null
    else (
      select jsonb_agg(case when weighted.weight = 1 then weighted.distribution
        else weighted.distribution || jsonb_build_object('weight', weighted.weight) end)
      from (
        select point.value - 'weight' as distribution,
          sum(coalesce((point.value ->> 'weight')::integer, 1)) as weight
        from jsonb_array_elements(p_distributions) as item(value)
        cross join lateral jsonb_array_elements(item.value) as point(value)
        group by point.value - 'weight'
      ) as weighted
    )
  end);
exception when data_exception then
  -- Optional corrupt diagnostic metadata must not break condition publication.
  return null;
end;
$$;
revoke all on function public.merge_thermal_exposure(jsonb) from public, anon, authenticated;
grant execute on function public.merge_thermal_exposure(jsonb) to service_role;

-- Preserve every intervening reader/cache patch and its privileges. Fail closed
-- if the audited insertion point has moved rather than silently missing a path.
do $migration$
declare
  target regprocedure;
  definition text;
  needle text := $needle$'weatherElevationM', round(avg(nullif(latest.values ->> 'weatherElevationM', '')::numeric)),$needle$;
  addition text := $addition$
        'thermalExposure', public.merge_thermal_exposure(jsonb_agg(latest.values -> 'thermalExposure')),$addition$;
begin
  foreach target in array array[
    'public.read_aggregated_cell_environment(double precision,double precision,double precision,double precision,integer,integer)'::regprocedure,
    'public.refresh_spatial_level_conditions(integer,date)'::regprocedure
  ] loop
    definition := pg_get_functiondef(target);
    if (length(definition) - length(replace(definition, needle, ''))) / length(needle) <> 1 then
      raise exception 'Thermal exposure insertion point changed in %', target;
    end if;
    execute replace(definition, needle, needle || addition);
  end loop;
end;
$migration$;

comment on function public.merge_thermal_exposure(jsonb) is
  'Internal exact 14/20-day thermal distributions; every represented point is required. New ingestions publish them with the existing condition generations.';
