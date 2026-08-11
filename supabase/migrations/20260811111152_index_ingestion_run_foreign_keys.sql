create index if not exists cell_environment_snapshots_run_id_idx
  on public.cell_environment_snapshots (run_id)
  where run_id is not null;

create index if not exists prediction_cells_run_id_idx
  on public.prediction_cells (run_id)
  where run_id is not null;
