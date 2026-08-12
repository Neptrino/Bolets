-- Cache exact 250 m compatibility as compact arrays keyed by every existing
-- coarse display cell. Four float values per species are much smaller than
-- duplicating the grid into a species-by-cell table, which matters on Free.

create table if not exists public.species_habitat_profiles (
  species_id text primary key,
  slot integer not null unique check (slot between 1 and 32),
  profile_key text not null,
  complete boolean not null default false,
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.coarse_species_habitat_cells (
  cell_id text primary key references public.spatial_cell_levels(cell_id) on delete cascade,
  grid_size_m integer not null check (grid_size_m in (1000, 2500, 5000, 10000)),
  coverages real[] not null,
  weighted_coverages real[] not null,
  updated_at timestamptz not null default now()
);

alter table public.species_habitat_profiles enable row level security;
alter table public.coarse_species_habitat_cells enable row level security;
revoke all on table public.species_habitat_profiles,
  public.coarse_species_habitat_cells from public, anon, authenticated;
grant select, insert, update, delete on table public.species_habitat_profiles,
  public.coarse_species_habitat_cells to service_role;

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
  if profile_count < 1 or profile_count > 32 then
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

create or replace function public.species_habitat_profile_complete(
  p_species_id text,
  p_profile_key text
)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce((
    select profile.complete
    from public.species_habitat_profiles profile
    where profile.species_id = p_species_id
      and profile.profile_key = p_profile_key
  ), false);
$$;

revoke all on function public.build_coarse_species_habitat_cache(
  jsonb, integer, integer, boolean, boolean
) from public, anon, authenticated;
revoke all on function public.read_cached_species_habitat_cells(
  text, text, double precision, double precision, double precision,
  double precision, integer, integer
) from public, anon, authenticated;
revoke all on function public.species_habitat_profile_complete(text, text)
  from public, anon, authenticated;

grant execute on function public.build_coarse_species_habitat_cache(
  jsonb, integer, integer, boolean, boolean
) to service_role;
grant execute on function public.read_cached_species_habitat_cells(
  text, text, double precision, double precision, double precision,
  double precision, integer, integer
) to service_role;
grant execute on function public.species_habitat_profile_complete(text, text)
  to service_role;

comment on column public.coarse_species_habitat_cells.coverages is
  'Raw exact compatible-cover fractions by versioned species_habitat_profiles slot.';
comment on column public.coarse_species_habitat_cells.weighted_coverages is
  'Altitude-tapered compatible-cover fractions for distribution-map intensity.';
