-- Serve every species' cached habitat coverage for a viewport in one read so
-- the combined all-species prediction map does not fan out into per-species
-- queries. The compact slot arrays already exist per coarse display cell;
-- this reader simply returns them whole. Slot semantics stay owned by
-- species_habitat_profiles, which callers must read alongside this function
-- to map slots back to species and to verify profile keys.

create or replace function public.read_all_cached_species_habitat_cells(
  p_west double precision,
  p_south double precision,
  p_east double precision,
  p_north double precision,
  p_grid_size_m integer,
  p_limit integer default 1000
)
returns table (
  cell_id text, region_id text, west double precision, south double precision,
  east double precision, north double precision, grid_size_m integer,
  coverages real[], weighted_coverages real[],
  confidence text, sources text[]
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    levels.cell_id, levels.region_id, levels.west, levels.south, levels.east,
    levels.north, levels.grid_size_m,
    -- Round to 3 decimals: enough precision for a 0-100 score while keeping
    -- the 52-slot arrays compact in the JSON payload.
    (select pg_catalog.array_agg(pg_catalog.round(v::numeric, 3)::real order by ord)
       from pg_catalog.unnest(cached.coverages) with ordinality u(v, ord)),
    (select pg_catalog.array_agg(pg_catalog.round(v::numeric, 3)::real order by ord)
       from pg_catalog.unnest(cached.weighted_coverages) with ordinality u(v, ord)),
    levels.confidence, levels.static_sources
  from public.coarse_species_habitat_cells cached
  join public.spatial_cell_levels levels on levels.cell_id = cached.cell_id
  where cached.grid_size_m = p_grid_size_m
    and p_grid_size_m in (1000, 2500, 5000, 10000)
    and levels.east >= p_west and levels.west <= p_east
    and levels.north >= p_south and levels.south <= p_north
  order by levels.cell_id
  limit least(greatest(p_limit, 1), 1000);
$$;

revoke all on function public.read_all_cached_species_habitat_cells(
  double precision, double precision, double precision, double precision,
  integer, integer
) from public, anon, authenticated;

grant execute on function public.read_all_cached_species_habitat_cells(
  double precision, double precision, double precision, double precision,
  integer, integer
) to service_role;

comment on function public.read_all_cached_species_habitat_cells(
  double precision, double precision, double precision, double precision,
  integer, integer
) is
  'All-species habitat coverage arrays per coarse cell for the combined prediction map; slot order defined by species_habitat_profiles.';
