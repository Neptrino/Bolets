-- The weighted, tapered readers are the only habitat gate the product
-- supports. Remove the legacy binary reader (unreachable since every caller
-- sends core-altitude parameters, and the edge function now requires them)
-- and the compact cover-weight helper it left behind, which nothing has
-- referenced since the packed representation replaced it.
drop function if exists public.read_potential_habitat_cells(
  double precision, double precision, double precision, double precision,
  integer, text[], double precision, double precision,
  double precision, double precision, integer
);

drop function if exists public.habitat_cover_weight_compact(
  smallint[], real[], jsonb, text[]
);
