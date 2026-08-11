do $$
declare
  missing_snapshots integer;
  unlinked_soil_points integer;
begin
  select count(*)
  into missing_snapshots
  from public.weather_grid_points points
  where points.model = 'arome_france'
    and not exists (
      select 1
      from public.weather_grid_snapshots snapshots
      where snapshots.point_id = points.point_id
        and snapshots.snapshot_date = current_date
    );

  select count(*)
  into unlinked_soil_points
  from public.weather_grid_points
  where model = 'arome_france'
    and soil_point_id is null;

  if missing_snapshots > 0 then
    raise exception 'Cannot activate AROME grid: % atmospheric points have no current snapshot', missing_snapshots;
  end if;

  if unlinked_soil_points > 0 then
    raise exception 'Cannot activate AROME grid: % atmospheric points have no soil link', unlinked_soil_points;
  end if;
end $$;

update public.spatial_cells
set
  weather_point_id = 'open-meteo:arome-2500:' ||
    floor(split_part(cell_id, ':', 3)::integer / 10.0)::integer || ':' ||
    floor(split_part(cell_id, ':', 4)::integer / 10.0)::integer,
  updated_at = now()
where cell_id ~ '^epsg25831:250:[0-9]+:[0-9]+$';

analyze public.spatial_cells;

comment on table public.spatial_cells is
  'Verified 250 m terrain, land-cover and soil evidence. Public current conditions reference shared 2.5 km AROME atmospheric points and independent 9 km soil-moisture points.';

comment on table public.weather_grid_points is
  'Provider-scale weather locations: 2.5 km AROME atmospheric points linked to shared 9 km soil-moisture points.';
