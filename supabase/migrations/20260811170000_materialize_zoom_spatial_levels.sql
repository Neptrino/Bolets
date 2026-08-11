create table if not exists public.spatial_cell_levels (
  cell_id text primary key,
  region_id text not null check (region_id in (
    'pirineus', 'prepirineus', 'catalunya-central', 'serralades-costeres',
    'serralades-prelitorals', 'emporda', 'montseny', 'ports',
    'muntanyes-interiors', 'altres'
  )),
  grid_size_m integer not null check (grid_size_m in (500, 1000, 2500, 5000, 10000)),
  west double precision not null,
  south double precision not null,
  east double precision not null,
  north double precision not null,
  geom extensions.geometry(Polygon, 4326)
    generated always as (extensions.st_makeenvelope(west, south, east, north, 4326)) stored,
  static_values jsonb not null default '{}'::jsonb,
  static_sources text[] not null default '{}',
  source_resolution_m integer not null check (source_resolution_m > 0),
  confidence text not null check (confidence in ('high', 'moderate', 'limited', 'unknown')),
  weather_point_ids text[] not null,
  soil_point_ids text[] not null,
  base_cell_count integer not null check (base_cell_count > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists spatial_cell_levels_geom_idx
  on public.spatial_cell_levels using gist (geom);

create index if not exists spatial_cell_levels_size_cell_idx
  on public.spatial_cell_levels (grid_size_m, cell_id);

alter table public.spatial_cell_levels enable row level security;
revoke all on table public.spatial_cell_levels from anon, authenticated;
grant select, insert, update, delete on table public.spatial_cell_levels to service_role;

create or replace function public.refresh_spatial_cell_level(p_grid_size_m integer)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  bucket_factor integer;
  affected_rows integer;
begin
  if p_grid_size_m not in (500, 1000, 2500, 5000, 10000) then
    raise exception 'Unsupported spatial grid size: %', p_grid_size_m;
  end if;
  bucket_factor := p_grid_size_m / 250;

  insert into public.spatial_cell_levels (
    cell_id, region_id, grid_size_m, west, south, east, north,
    static_values, static_sources, source_resolution_m, confidence,
    weather_point_ids, soil_point_ids, base_cell_count, updated_at
  )
  with base as not materialized (
    select
      cells.*,
      split_part(cells.cell_id, ':', 3)::integer / bucket_factor as bucket_x,
      split_part(cells.cell_id, ':', 4)::integer / bucket_factor as bucket_y,
      weather_point.soil_point_id
    from public.spatial_cells cells
    join public.weather_grid_points weather_point
      on weather_point.point_id = cells.weather_point_id
    where cells.static_verified
      and cells.weather_point_id is not null
  ),
  grouped as (
    select
      base.bucket_x,
      base.bucket_y,
      mode() within group (order by base.region_id) as region_id,
      min(base.west) as west,
      min(base.south) as south,
      max(base.east) as east,
      max(base.north) as north,
      max(base.source_resolution_m) as source_resolution_m,
      case min(case base.confidence when 'unknown' then 0 when 'limited' then 1 when 'moderate' then 2 else 3 end)
        when 0 then 'unknown' when 1 then 'limited' when 2 then 'moderate' else 'high'
      end as confidence,
      array_agg(distinct base.weather_point_id order by base.weather_point_id) as weather_point_ids,
      array_remove(array_agg(distinct base.soil_point_id order by base.soil_point_id), null) as soil_point_ids,
      count(*)::integer as base_cell_count,
      jsonb_strip_nulls(jsonb_build_object(
        'altitudeM', round(avg(nullif(base.static_values ->> 'altitudeM', '')::numeric)),
        'forestCompatibility', avg(nullif(base.static_values ->> 'forestCompatibility', '')::double precision),
        'soilCompatibility', avg(nullif(base.static_values ->> 'soilCompatibility', '')::double precision),
        'soilPh', round(avg(nullif(base.static_values ->> 'soilPh', '')::numeric), 1),
        'soilTexture', mode() within group (order by base.static_values ->> 'soilTexture') filter (where base.static_values ? 'soilTexture'),
        'soilSubstrate', mode() within group (order by base.static_values ->> 'soilSubstrate') filter (where base.static_values ? 'soilSubstrate')
      )) as static_values
    from base
    group by base.bucket_x, base.bucket_y
  ),
  forest_values as (
    select base.bucket_x, base.bucket_y, jsonb_agg(distinct forest_type order by forest_type) as forest_types
    from base
    cross join lateral jsonb_array_elements_text(coalesce(base.static_values -> 'forestTypes', '[]'::jsonb)) forest(forest_type)
    group by base.bucket_x, base.bucket_y
  ),
  tree_values as (
    select base.bucket_x, base.bucket_y, jsonb_agg(distinct tree_species order by tree_species) as tree_species
    from base
    cross join lateral jsonb_array_elements_text(coalesce(base.static_values -> 'treeSpecies', '[]'::jsonb)) tree(tree_species)
    group by base.bucket_x, base.bucket_y
  ),
  source_values as (
    select base.bucket_x, base.bucket_y, array_agg(distinct source_name order by source_name) as sources
    from base
    cross join lateral unnest(base.static_sources) source_value(source_name)
    group by base.bucket_x, base.bucket_y
  )
  select
    'epsg25831:' || p_grid_size_m || ':' || grouped.bucket_x || ':' || grouped.bucket_y,
    grouped.region_id,
    p_grid_size_m,
    grouped.west,
    grouped.south,
    grouped.east,
    grouped.north,
    grouped.static_values
      || case when forest_values.forest_types is null then '{}'::jsonb else jsonb_build_object('forestTypes', forest_values.forest_types) end
      || case when tree_values.tree_species is null then '{}'::jsonb else jsonb_build_object('treeSpecies', tree_values.tree_species) end,
    coalesce(source_values.sources, '{}'::text[]),
    grouped.source_resolution_m,
    grouped.confidence,
    grouped.weather_point_ids,
    grouped.soil_point_ids,
    grouped.base_cell_count,
    now()
  from grouped
  left join forest_values using (bucket_x, bucket_y)
  left join tree_values using (bucket_x, bucket_y)
  left join source_values using (bucket_x, bucket_y)
  on conflict (cell_id) do update set
    region_id = excluded.region_id,
    west = excluded.west,
    south = excluded.south,
    east = excluded.east,
    north = excluded.north,
    static_values = excluded.static_values,
    static_sources = excluded.static_sources,
    source_resolution_m = excluded.source_resolution_m,
    confidence = excluded.confidence,
    weather_point_ids = excluded.weather_point_ids,
    soil_point_ids = excluded.soil_point_ids,
    base_cell_count = excluded.base_cell_count,
    updated_at = excluded.updated_at;

  get diagnostics affected_rows = row_count;
  return affected_rows;
end;
$$;

revoke all on function public.refresh_spatial_cell_level(integer) from public, anon, authenticated;
grant execute on function public.refresh_spatial_cell_level(integer) to service_role;

comment on table public.spatial_cell_levels is
  'Precomputed zoom levels derived from verified 250 m cells. Dynamic weather remains normalized and is summarized from linked provider points at read time.';

comment on function public.refresh_spatial_cell_level(integer) is
  'Rebuilds one supported map level after the canonical 250 m static grid changes.';
