-- Companion to 20260822130000_edge_species_cover_floor: apply the same
-- edge-species cover floor to the exact 250 m branch of the weighted
-- habitat reader.
create or replace function public.read_weighted_potential_habitat_cells(
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
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if p_grid_size_m = 250 then
    return query
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
    visible_base as materialized (
      select cells.*
      from public.spatial_cells cells
      where cells.static_verified
        and cells.geom operator(extensions.&&) extensions.st_makeenvelope(
          p_west, p_south, p_east, p_north, 4326
        )
    ),
    scored as materialized (
      select
        cells.*,
        (case
          when cells.habitat_cover_counts is not null then public.habitat_edge_floor(cells.habitat_cover_counts, least(1::double precision, (
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
          else public.habitat_cover_weight_packed(
            cells.habitat_cover_counts,
            cells.habitat_cover_codes,
            cells.habitat_cover_shares,
            cells.habitat_forest_types,
            p_forest_terms
          )
        end) * public.habitat_ph_weight(cells.habitat_soil_ph, p_ph_min, p_ph_max) as cover_score
      from visible_base cells
      cross join compatibility
    )
    select
      cells.cell_id, cells.region_id, cells.west, cells.south, cells.east, cells.north,
      cells.grid_size_m, cells.cover_score, cells.cover_score * altitude.score, 1,
      cells.source_resolution_m, cells.confidence, cells.static_sources
    from scored cells
    cross join lateral (
      select public.habitat_altitude_weight(
        cells.habitat_altitude_m,
        p_altitude_min,
        p_altitude_max
      ) as score
    ) altitude
    where cells.habitat_altitude_m > p_altitude_min - 100
      and cells.habitat_altitude_m < p_altitude_max + 100
      and cells.cover_score > 0
      and altitude.score > 0
    order by cells.cell_id
    limit least(greatest(p_limit, 1), 1000);
    return;
  end if;

  return query
  select *
  from public.read_weighted_coarse_potential_habitat_cells(
    p_west, p_south, p_east, p_north, p_grid_size_m, p_forest_terms,
    p_altitude_min, p_altitude_max, p_ph_min, p_ph_max, p_limit
  );
end;
$$;
