-- The expanded catalogue needs more slots in the compact per-cell habitat
-- arrays. Keep a bounded power-of-two ceiling while leaving room beyond the
-- 52 profiles published in this release.
set local lock_timeout = '5s';

alter table public.species_habitat_profiles
  drop constraint if exists species_habitat_profiles_slot_check;

alter table public.species_habitat_profiles
  add constraint species_habitat_profiles_slot_check
  check (slot between 1 and 64);

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
      select least(1::double precision, (
        case when array['pinedes', 'boscos de coniferes'] && profiles.forest_terms then ((cells.habitat_cover_counts >> 0) & 31::bigint) else 0 end
        + case when array['fagedes', 'rouredes', 'boscos de planifolis'] && profiles.forest_terms then ((cells.habitat_cover_counts >> 5) & 31::bigint) else 0 end
        + case when array['alzinars', 'suredes', 'boscos d esclerofil les'] && profiles.forest_terms then ((cells.habitat_cover_counts >> 10) & 31::bigint) else 0 end
        + case when array['matollars', 'clarianes', 'vores de bosc'] && profiles.forest_terms then ((cells.habitat_cover_counts >> 15) & 31::bigint) else 0 end
        + case when array['pinedes', 'pinedes obertes', 'boscos de coniferes'] && profiles.forest_terms then ((cells.habitat_cover_counts >> 20) & 31::bigint) else 0 end
        + case when array['fagedes', 'rouredes', 'boscos de planifolis'] && profiles.forest_terms then ((cells.habitat_cover_counts >> 25) & 31::bigint) else 0 end
        + case when array['alzinars', 'suredes', 'boscos d esclerofil les'] && profiles.forest_terms then ((cells.habitat_cover_counts >> 30) & 31::bigint) else 0 end
        + case when array['prats', 'pastures', 'gespes', 'vores de cami', 'clarianes', 'vores de bosc'] && profiles.forest_terms then ((cells.habitat_cover_counts >> 35) & 31::bigint) else 0 end
        + case when array['bosc de ribera', 'boscos humits'] && profiles.forest_terms then ((cells.habitat_cover_counts >> 40) & 31::bigint) else 0 end
      )::double precision / 25) as score
    ) cover
    where cells.static_verified
      and cells.habitat_cover_counts is not null
      and pg_catalog.split_part(cells.cell_id, ':', 4)::integer >= p_min_y
      and pg_catalog.split_part(cells.cell_id, ':', 4)::integer < p_max_y
      and cells.habitat_altitude_m > profiles.altitude_min - 100
      and cells.habitat_altitude_m < profiles.altitude_max + 100
      and cover.score > 0
      and (profiles.ph_min is null or cells.habitat_soil_ph >= profiles.ph_min)
      and (profiles.ph_max is null or cells.habitat_soil_ph <= profiles.ph_max)
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

revoke all on function public.build_coarse_species_habitat_cache(
  jsonb, integer, integer, boolean, boolean
) from public, anon, authenticated;

grant execute on function public.build_coarse_species_habitat_cache(
  jsonb, integer, integer, boolean, boolean
) to service_role;

comment on constraint species_habitat_profiles_slot_check
  on public.species_habitat_profiles is
  'Bounds compact habitat-array slots while allowing the expanded catalogue.';
