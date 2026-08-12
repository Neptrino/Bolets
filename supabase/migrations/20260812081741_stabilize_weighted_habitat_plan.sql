alter function public.read_weighted_potential_habitat_cells(
  double precision, double precision, double precision, double precision,
  integer, text[], double precision, double precision, double precision, double precision, integer
) set enable_bitmapscan = off;

alter function public.read_weighted_potential_habitat_cells(
  double precision, double precision, double precision, double precision,
  integer, text[], double precision, double precision, double precision, double precision, integer
) set plan_cache_mode = force_custom_plan;

comment on function public.read_weighted_potential_habitat_cells(
  double precision, double precision, double precision, double precision,
  integer, text[], double precision, double precision, double precision, double precision, integer
) is 'Uses the measured covering-index plan for coarse habitat aggregation; function-scoped planning settings prevent slower bitmap heap scans.';
