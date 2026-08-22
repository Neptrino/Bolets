-- Edge-species cover floor. Species whose habitat vocabulary declares forest
-- edges or clearings ("clarianes", "vores de bosc") live in sub-resolution
-- features: a 250 m cell mapped as closed forest still contains paths, edges
-- and small openings the 25-sample cover histogram cannot see. For those
-- species only, and only where the cell carries real woody cover (>= 5 of 25
-- samples across the forest, scrub and riparian buckets), the matched cover
-- fraction is floored at 0.15 instead of hard-zeroing the cell. Field
-- evidence 2026-08-18: five Macrolepiota procera fruiting in a cell scored
-- F=73 with mapped coverage 0. Pure meadow species without edge terms keep
-- the strict gate: meadows are mappable, edges are not.
create or replace function public.habitat_edge_floor(
  p_cover_counts bigint,
  p_matched_fraction double precision,
  p_forest_terms text[]
)
returns double precision
language sql
immutable
set search_path = ''
as $edge$
  select case
    when p_matched_fraction >= 0.15 then p_matched_fraction
    when not (array['clarianes', 'vores de bosc'] && p_forest_terms)
      then p_matched_fraction
    when p_cover_counts is null then p_matched_fraction
    when (
      ((p_cover_counts >> 0) & 31::bigint) + ((p_cover_counts >> 5) & 31::bigint)
      + ((p_cover_counts >> 10) & 31::bigint) + ((p_cover_counts >> 15) & 31::bigint)
      + ((p_cover_counts >> 20) & 31::bigint) + ((p_cover_counts >> 25) & 31::bigint)
      + ((p_cover_counts >> 30) & 31::bigint) + ((p_cover_counts >> 40) & 31::bigint)
    ) >= 5 then greatest(p_matched_fraction, 0.15)
    else p_matched_fraction
  end
$edge$;

revoke all on function public.habitat_edge_floor(bigint, double precision, text[])
  from public, anon, authenticated;
grant execute on function public.habitat_edge_floor(bigint, double precision, text[])
  to service_role;

-- habitat_soil_ph and habitat_cover_counts are carried in the INCLUDE list of
-- spatial_cells_habitat_grid_covering_idx, and habitat_edge_floor is an
-- immutable inline SQL function over those included columns, so the wide
-- coarse aggregation keeps its index-only plan.
create or replace function public.read_weighted_coarse_potential_habitat_cells(
  p_west double precision,
  p_south double precision,
  p_east double precision,
  p_north double precision,
  p_grid_size_m integer,
  p_forest_terms text[],
  p_altitude_min double precision,
  p_altitude_max double precision,
  p_ph_min double precision default null,
  p_ph_max double precision default null,
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
  with compatibility as materialized (
    select
      array['pinedes', 'boscos de coniferes'] && p_forest_terms as c221,
      array['fagedes', 'rouredes', 'boscos de planifolis'] && p_forest_terms as c222,
      array['alzinars', 'suredes', 'boscos d esclerofil les'] && p_forest_terms as c223,
      array['matollars', 'clarianes', 'vores de bosc'] && p_forest_terms as c224,
      array['pinedes', 'pinedes obertes', 'boscos de coniferes'] && p_forest_terms as c225,
      array['fagedes', 'rouredes', 'boscos de planifolis'] && p_forest_terms as c226,
      array['alzinars', 'suredes', 'boscos d esclerofil les'] && p_forest_terms as c227,
      array['prats', 'pastures', 'gespes', 'vores de cami', 'clarianes', 'vores de bosc'] && p_forest_terms as c228,
      array['bosc de ribera', 'boscos humits'] && p_forest_terms as c229
  ),
  query_grid_extent as materialized (
    select
      floor(extensions.st_xmin(projected.geom) / p_grid_size_m)::integer as min_x,
      floor(extensions.st_xmax(projected.geom) / p_grid_size_m)::integer as max_x,
      floor(extensions.st_ymin(projected.geom) / p_grid_size_m)::integer as min_y,
      floor(extensions.st_ymax(projected.geom) / p_grid_size_m)::integer as max_y
    from (
      select extensions.st_transform(
        extensions.st_makeenvelope(p_west, p_south, p_east, p_north, 4326),
        25831
      ) as geom
    ) projected
  ),
  visible_levels as materialized (
    select
      levels.cell_id, levels.region_id, levels.west, levels.south, levels.east,
      levels.north, levels.grid_size_m, levels.source_resolution_m,
      levels.confidence, levels.static_sources,
      pg_catalog.split_part(levels.cell_id, ':', 3)::integer as bucket_x,
      pg_catalog.split_part(levels.cell_id, ':', 4)::integer as bucket_y
    from public.spatial_cell_levels levels
    cross join query_grid_extent extent
    where levels.grid_size_m = p_grid_size_m
      and pg_catalog.split_part(levels.cell_id, ':', 3)::integer between extent.min_x and extent.max_x
      and pg_catalog.split_part(levels.cell_id, ':', 4)::integer between extent.min_y and extent.max_y
      and levels.east >= p_west and levels.west <= p_east
      and levels.north >= p_south and levels.south <= p_north
  ),
  coarse_grouped as materialized (
    select
      pg_catalog.split_part(cells.cell_id, ':', 3)::integer / (p_grid_size_m / 250) as bucket_x,
      pg_catalog.split_part(cells.cell_id, ':', 4)::integer / (p_grid_size_m / 250) as bucket_y,
      count(*)::integer as eligible_cell_count,
      sum(cover.score) as compatible_cover_cell_count,
      sum(cover.score * altitude.score) as altitude_weighted_cell_count
    from public.spatial_cells cells
    cross join query_grid_extent extent
    cross join compatibility
    cross join lateral (
      select public.habitat_edge_floor(cells.habitat_cover_counts, least(1::double precision, (
        case when compatibility.c221 then ((cells.habitat_cover_counts >> 0) & 31::bigint) else 0 end
        + case when compatibility.c222 then ((cells.habitat_cover_counts >> 5) & 31::bigint) else 0 end
        + case when compatibility.c223 then ((cells.habitat_cover_counts >> 10) & 31::bigint) else 0 end
        + case when compatibility.c224 then ((cells.habitat_cover_counts >> 15) & 31::bigint) else 0 end
        + case when compatibility.c225 then ((cells.habitat_cover_counts >> 20) & 31::bigint) else 0 end
        + case when compatibility.c226 then ((cells.habitat_cover_counts >> 25) & 31::bigint) else 0 end
        + case when compatibility.c227 then ((cells.habitat_cover_counts >> 30) & 31::bigint) else 0 end
        + case when compatibility.c228 then ((cells.habitat_cover_counts >> 35) & 31::bigint) else 0 end
        + case when compatibility.c229 then ((cells.habitat_cover_counts >> 40) & 31::bigint) else 0 end
      )::double precision / 25), p_forest_terms)
        * public.habitat_ph_weight(cells.habitat_soil_ph, p_ph_min, p_ph_max) as score
    ) cover
    cross join lateral (
      select public.habitat_altitude_weight(
        cells.habitat_altitude_m,
        p_altitude_min,
        p_altitude_max
      ) as score
    ) altitude
    where cells.static_verified
      and cells.habitat_cover_counts is not null
      and pg_catalog.split_part(cells.cell_id, ':', 4)::integer between
        extent.min_y * (p_grid_size_m / 250)
        and (extent.max_y + 1) * (p_grid_size_m / 250) - 1
      and pg_catalog.split_part(cells.cell_id, ':', 3)::integer between
        extent.min_x * (p_grid_size_m / 250)
        and (extent.max_x + 1) * (p_grid_size_m / 250) - 1
      and cells.habitat_altitude_m > p_altitude_min - 100
      and cells.habitat_altitude_m < p_altitude_max + 100
      and cover.score > 0
      and altitude.score > 0
    group by 1, 2
  )
  select
    levels.cell_id, levels.region_id, levels.west, levels.south, levels.east,
    levels.north, levels.grid_size_m,
    least(1::double precision,
      grouped.compatible_cover_cell_count / power(p_grid_size_m / 250, 2)),
    least(1::double precision,
      grouped.altitude_weighted_cell_count / power(p_grid_size_m / 250, 2)),
    grouped.eligible_cell_count, levels.source_resolution_m, levels.confidence,
    levels.static_sources
  from coarse_grouped grouped
  join visible_levels levels on levels.bucket_x = grouped.bucket_x
    and levels.bucket_y = grouped.bucket_y
  order by 9 desc, levels.cell_id
  limit least(greatest(p_limit, 1), 1000);
$$;

create or replace function public.build_coarse_species_habitat_cache(
  p_profiles jsonb,
  p_min_y integer,
  p_max_y integer,
  p_reset boolean default false,
  p_complete boolean default false
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  updated_rows integer;
  profile_count integer;
begin
  if jsonb_typeof(p_profiles) <> 'array'
    or p_min_y >= p_max_y
    or p_min_y % 40 <> 0
    or p_max_y % 40 <> 0 then
    raise exception 'Invalid habitat cache batch';
  end if;

  select count(*) into profile_count from jsonb_array_elements(p_profiles);
  if profile_count < 1 or profile_count > 64 then
    raise exception 'Invalid habitat profile count';
  end if;

  if p_reset then
    delete from public.coarse_species_habitat_cells;
    delete from public.species_habitat_profiles;
    insert into public.species_habitat_profiles (
      species_id, slot, profile_key, complete, completed_at, updated_at
    )
    select
      profile.value->>'speciesId',
      (profile.value->>'slot')::integer,
      profile.value->>'profileKey',
      false,
      null,
      now()
    from jsonb_array_elements(p_profiles) profile(value);
  end if;

  with profiles as materialized (
    select
      profile.value->>'speciesId' as species_id,
      (profile.value->>'slot')::integer as slot,
      array(
        select jsonb_array_elements_text(profile.value->'forestTerms')
      ) as forest_terms,
      (profile.value->>'altitudeMin')::double precision as altitude_min,
      (profile.value->>'altitudeMax')::double precision as altitude_max,
      nullif(profile.value->>'phMin', '')::double precision as ph_min,
      nullif(profile.value->>'phMax', '')::double precision as ph_max
    from jsonb_array_elements(p_profiles) profile(value)
  ),
  scored_base as materialized (
    select
      pg_catalog.split_part(cells.cell_id, ':', 3)::integer as base_x,
      pg_catalog.split_part(cells.cell_id, ':', 4)::integer as base_y,
      profiles.slot,
      cover.score as cover_score,
      public.habitat_altitude_weight(
        cells.habitat_altitude_m,
        profiles.altitude_min,
        profiles.altitude_max
      ) as altitude_score
    from public.spatial_cells cells
    cross join profiles
    cross join lateral (
      select public.habitat_edge_floor(cells.habitat_cover_counts, least(1::double precision, (
        case when array['pinedes', 'boscos de coniferes'] && profiles.forest_terms then ((cells.habitat_cover_counts >> 0) & 31::bigint) else 0 end
        + case when array['fagedes', 'rouredes', 'boscos de planifolis'] && profiles.forest_terms then ((cells.habitat_cover_counts >> 5) & 31::bigint) else 0 end
        + case when array['alzinars', 'suredes', 'boscos d esclerofil les'] && profiles.forest_terms then ((cells.habitat_cover_counts >> 10) & 31::bigint) else 0 end
        + case when array['matollars', 'clarianes', 'vores de bosc'] && profiles.forest_terms then ((cells.habitat_cover_counts >> 15) & 31::bigint) else 0 end
        + case when array['pinedes', 'pinedes obertes', 'boscos de coniferes'] && profiles.forest_terms then ((cells.habitat_cover_counts >> 20) & 31::bigint) else 0 end
        + case when array['fagedes', 'rouredes', 'boscos de planifolis'] && profiles.forest_terms then ((cells.habitat_cover_counts >> 25) & 31::bigint) else 0 end
        + case when array['alzinars', 'suredes', 'boscos d esclerofil les'] && profiles.forest_terms then ((cells.habitat_cover_counts >> 30) & 31::bigint) else 0 end
        + case when array['prats', 'pastures', 'gespes', 'vores de cami', 'clarianes', 'vores de bosc'] && profiles.forest_terms then ((cells.habitat_cover_counts >> 35) & 31::bigint) else 0 end
        + case when array['bosc de ribera', 'boscos humits'] && profiles.forest_terms then ((cells.habitat_cover_counts >> 40) & 31::bigint) else 0 end
      )::double precision / 25), profiles.forest_terms)
        * public.habitat_ph_weight(cells.habitat_soil_ph, profiles.ph_min, profiles.ph_max) as score
    ) cover
    where cells.static_verified
      and cells.habitat_cover_counts is not null
      and pg_catalog.split_part(cells.cell_id, ':', 4)::integer >= p_min_y
      and pg_catalog.split_part(cells.cell_id, ':', 4)::integer < p_max_y
      and cells.habitat_altitude_m > profiles.altitude_min - 100
      and cells.habitat_altitude_m < profiles.altitude_max + 100
      and cover.score > 0
  ),
  grouped as materialized (
    select
      resolution.grid_size_m,
      scored.base_x / resolution.factor as bucket_x,
      scored.base_y / resolution.factor as bucket_y,
      scored.slot,
      least(1::double precision,
        sum(scored.cover_score) / power(resolution.factor, 2)) as coverage,
      least(1::double precision,
        sum(scored.cover_score * scored.altitude_score) / power(resolution.factor, 2)) as weighted_coverage
    from scored_base scored
    cross join (values (1000, 4), (2500, 10), (5000, 20), (10000, 40))
      resolution(grid_size_m, factor)
    where scored.altitude_score > 0
    group by 1, 2, 3, 4, resolution.factor
  ),
  level_values as materialized (
    select
      levels.cell_id,
      levels.grid_size_m,
      array_agg(coalesce(grouped.coverage, 0)::real order by profiles.slot) as coverages,
      array_agg(coalesce(grouped.weighted_coverage, 0)::real order by profiles.slot) as weighted_coverages
    from public.spatial_cell_levels levels
    cross join profiles
    left join grouped on grouped.grid_size_m = levels.grid_size_m
      and grouped.bucket_x = pg_catalog.split_part(levels.cell_id, ':', 3)::integer
      and grouped.bucket_y = pg_catalog.split_part(levels.cell_id, ':', 4)::integer
      and grouped.slot = profiles.slot
    where levels.grid_size_m in (1000, 2500, 5000, 10000)
      and pg_catalog.split_part(levels.cell_id, ':', 4)::integer
        * (levels.grid_size_m / 250) >= p_min_y
      and pg_catalog.split_part(levels.cell_id, ':', 4)::integer
        * (levels.grid_size_m / 250) < p_max_y
    group by levels.cell_id
  )
  insert into public.coarse_species_habitat_cells (
    cell_id, grid_size_m, coverages, weighted_coverages, updated_at
  )
  select cell_id, grid_size_m, coverages, weighted_coverages, now()
  from level_values
  on conflict (cell_id) do update set
    grid_size_m = excluded.grid_size_m,
    coverages = excluded.coverages,
    weighted_coverages = excluded.weighted_coverages,
    updated_at = now();

  get diagnostics updated_rows = row_count;

  if p_complete then
    update public.species_habitat_profiles profile set
      complete = true,
      completed_at = now(),
      updated_at = now()
    where exists (
      select 1 from jsonb_array_elements(p_profiles) input(value)
      where input.value->>'speciesId' = profile.species_id
        and input.value->>'profileKey' = profile.profile_key
        and (input.value->>'slot')::integer = profile.slot
    );
  end if;

  return updated_rows;
end;
$$;
