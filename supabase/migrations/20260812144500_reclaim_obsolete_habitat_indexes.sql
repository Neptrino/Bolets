-- Coarse habitat is now read from coarse_species_habitat_cells. Exact 250 m
-- viewport reads still require the GiST geometry index, but no live reader
-- filters the generated legacy JSON forest array anymore.
drop index if exists public.spatial_cells_habitat_forest_idx;

analyze public.coarse_species_habitat_cells;
analyze public.species_habitat_profiles;
