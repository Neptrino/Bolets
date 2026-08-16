-- prediction_cells was created for precomputed per-species scores, but the
-- architecture settled on request-time scoring on the Next server and the
-- table never gained a writer or a reader. Its label vocabulary ('molt
-- favorable', 'favorable', 'mixta', 'poc favorable') predates the published
-- band scale, and the table held zero rows in production at drop time.
-- Dropping the table also removes its policy, indexes and outbound foreign
-- keys; nothing references it.

drop table if exists public.prediction_cells;
