-- New nullable array columns initially have no statistics. Without this pass,
-- PostgreSQL assumes most rows are non-null and scans all 250 m cells for the
-- storage-capability check used by the habitat reader.
analyze public.spatial_cells;

-- This arithmetic helper no longer needs planner inlining: current readers
-- inline the taper expression directly. Restore the hardened empty search path.
alter function public.habitat_altitude_weight(
  double precision,
  double precision,
  double precision
) set search_path = '';

alter function public.has_compact_habitat_coverage()
  set search_path = '';
