-- Dense 40-row habitat batches can legitimately outlive the Data API role's
-- interactive statement timeout. Keep the exception scoped to the bounded
-- cache builder so ordinary public reads retain their shorter timeout.
alter function public.build_coarse_species_habitat_cache(
  jsonb, integer, integer, boolean, boolean
) set statement_timeout = '5min';
