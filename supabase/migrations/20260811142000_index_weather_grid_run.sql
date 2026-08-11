create index if not exists weather_grid_snapshots_run_id_idx
  on public.weather_grid_snapshots (run_id)
  where run_id is not null;
