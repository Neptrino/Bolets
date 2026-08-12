-- Habitat reads now bound the 250 m work by the visible PostGIS extent before
-- applying altitude, soil, and packed-cover filters. The older nationwide
-- altitude covering indexes are no longer part of that plan and consume over
-- 50 MB on the Free Plan database.
drop index if exists public.spatial_cells_habitat_ranges_covering_idx;
drop index if exists public.spatial_cells_habitat_ranges_v2_idx;

analyze public.spatial_cells;
