-- Both SQL readers fully qualify application relations. Pin their lookup path
-- as an additional defence against objects created in a mutable schema.
alter function public.read_weighted_coarse_potential_habitat_cells(
  double precision, double precision, double precision, double precision,
  integer, text[], double precision, double precision,
  double precision, double precision, integer
) set search_path = '';

alter function public.read_weighted_legacy_coarse_potential_habitat_cells(
  double precision, double precision, double precision, double precision,
  integer, text[], double precision, double precision,
  double precision, double precision, integer
) set search_path = '';
