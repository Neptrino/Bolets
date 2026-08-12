create or replace function public.read_cached_species_habitat_cells(
  p_species_id text,
  p_profile_key text,
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
  coverage double precision, altitude_weighted_coverage double precision,
  eligible_cell_count integer, source_resolution_m integer,
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
    cached.coverages[profile.slot]::double precision,
    cached.weighted_coverages[profile.slot]::double precision,
    greatest(1, round(cached.coverages[profile.slot]
      * power(p_grid_size_m / 250, 2))::integer),
    250, levels.confidence, levels.static_sources
  from public.species_habitat_profiles profile
  join public.coarse_species_habitat_cells cached on true
  join public.spatial_cell_levels levels on levels.cell_id = cached.cell_id
  where profile.species_id = p_species_id
    and profile.profile_key = p_profile_key
    and profile.complete
    and cached.grid_size_m = p_grid_size_m
    and cached.coverages[profile.slot] > 0
    and levels.east >= p_west and levels.west <= p_east
    and levels.north >= p_south and levels.south <= p_north
  order by levels.cell_id
  limit least(greatest(p_limit, 1), 1000);
$$;

revoke all on function public.read_cached_species_habitat_cells(
  text, text, double precision, double precision, double precision,
  double precision, integer, integer
) from public, anon, authenticated;
grant execute on function public.read_cached_species_habitat_cells(
  text, text, double precision, double precision, double precision,
  double precision, integer, integer
) to service_role;
