# Supabase environmental pipelines

Supabase stores normalized environmental evidence and exposes it only through server-side Edge Functions. The public map never receives database credentials, and the 250 m grid represents model units rather than mushroom observations.

## Production inventory

| Pipeline | Trigger | Purpose |
| --- | --- | --- |
| `refresh-environment` | Daily at 05:15 UTC | Refreshes Open-Meteo conditions for the 10 ecological macro-regions. |
| `import-spatial-cells` | Trusted offline/CI worker | Validates and upserts reviewed 250 m terrain, land-cover, and soil evidence. |
| `refresh-spatial-environment` | Every 2 minutes | Refreshes the shared 2.5 km AROME atmosphere grid once per day, in resumable batches. |
| `refresh-spatial-soil` | Every 5 minutes until complete | Refreshes the independent 9 km soil-moisture grid once per day in rate-limited batches. |
| `refresh-spatial-level-conditions` | Daily at 01:10 UTC | Materializes current conditions for the 2.5, 5, and 10 km display levels after provider-grid ingestion. |
| `refresh-species-occurrences` | Four monthly batches from 03:15 UTC on day 1 | Refreshes whitelisted FungaCAT records through GBIF, applies quality gates, and stores only 10 km support cells. |
| `read-environment` | Next.js server request | Returns the latest regional snapshot. |
| `read-spatial-environment` | Next.js server request | Returns verified cells in a bounded local map view. |
| `read-occurrence-support` | Next.js server request | Returns privacy-safe historical record counts and provenance for one species in a bounded view. |
| retention job | Daily at 06:30 UTC | Retains 45 days of regional weather, today plus yesterday for grid weather, 48 hours of completed `pg_cron` history, and 90 days of ingestion runs. |

Every write run is audited in `ingestion_runs`. `pipeline_sources` records source health, `pipeline_cursors` makes large refreshes resumable, and all application tables have RLS enabled without browser table grants.

## Resolution and source of truth

- Display grid: 250 × 250 m in EPSG:25831.
- Elevation: ICGC terrain WCS at 5/15 m, sampled once per model cell.
- Land cover: ICGC Cobertes del sòl 2024 at 1 m native resolution, sampled every 50 m within each cell.
- Soil: ISRIC SoilGrids WCS at 250 m for pH, clay, sand, and silt.
- Potential habitat: every recognized ICGC cover fraction sampled within each 250 m cell is retained. The database sums only the fractions compatible with the selected species, then preserves both raw cover/altitude/pH-compatible coverage and an altitude-weighted distribution intensity using the versioned 75–100 edge taper. Predictions consume the raw percentage and their separate altitude factor; the distribution map consumes the weighted intensity.
- Atmosphere: Météo-France AROME through Open-Meteo at 2.5 km native resolution, sampled on aligned 2.5 km model tiles and statistically adjusted to each tile's median terrain elevation. Temperature, air humidity, precipitation, reference evapotranspiration (ET₀) and wind use this model.
- Soil moisture: Open-Meteo's available land model at 9 km. It is retained as a separate, explicitly coarser factor and never labelled as 2.5 km data. The normalized snapshot retains the 24-hour summary plus the 7-day minimum, mean, maximum and recent-versus-prior-six-day trend.
- Time windows: the snapshot keeps the latest model estimate; trailing 24-hour temperature, air-humidity, soil-moisture and wind summaries; the trailing 24-hour maximum gust; rain and ET₀ totals for 3, 7 and 30 days; rain from days 8–30; the consecutive dry-spell length using 1 mm per rolling 24 hours as the reset threshold; and trailing 10-day minimum/mean/maximum temperature plus frost-hour count. Temperature suitability uses the 10-day mean and extremes. Rainfall suitability combines all of the hydrological windows with 7-day soil moisture and the species' versioned prior-moisture dependency. All windows use `Europe/Madrid` local time.

Weather is normalized in `weather_grid_points` and `weather_grid_snapshots`. Many 250 m terrain cells reference the same 2.5 km atmospheric point; weather is never presented as if it had 250 m precision. Atmospheric and soil-moisture resolutions are preserved independently in snapshot metadata. Species ecology and model weights remain version-controlled in the application and are the single source of truth for scoring.

## Historical occurrence evidence

FungaCAT is consumed once through its GBIF dataset key `8583f4f6-f762-11e1-a439-00145eb45e9a` (DOI `10.15468/ttivpp`). It is presence-only, historically uneven evidence and is deliberately kept outside the suitability calculation:

- records with missing or invalid coordinates, fatal GBIF taxonomic or coordinate issues, positions outside the Catalonia envelope, or coordinate uncertainty above 10 km are rejected;
- accepted coordinates are mapped directly to version-controlled 10 km land cells by `upsert_species_occurrence_batch`; longitude and latitude columns do not exist in the occurrence tables;
- an incomplete refresh or a drop below 50% of a previous non-trivial snapshot is not finalized, so the last complete snapshot remains available;
- a registered taxon with no completed synchronization is reported as unavailable; only a completed synchronization with zero accepted records is presented as “no records”;
- the public read path returns only support-cell bounds, record counts, observed-year/month summaries, source URL, DOI, licence, and last synchronization time;
- a record corroborates historical occurrence only. No record is never interpreted as species absence, and neither state changes the current environmental score.

The dataset is licensed CC BY-NC 4.0. Application code and dataset rights remain separate; raw FungaCAT data is not committed to this repository. See [`docs/data-licenses.md`](../docs/data-licenses.md).

## Rebuild and import static cells

The GIS worker writes streaming NDJSON so a country-wide rebuild does not need to fit in memory. Downloads are cached under `/tmp/bolets-spatial-cache` by default.

Run a full static rebuild after deploying `20260812063543_weight_habitat_cover_fractions.sql` so existing dominant-cover-only cells gain sampled fractions. Until they are reimported, the database retains the former binary cover behavior for those legacy rows rather than withholding the map.

```bash
npm run spatial:build -- --output=/tmp/bolets-spatial-cells.ndjson
npm run spatial:import -- /tmp/bolets-spatial-cells.ndjson --dry-run
```

For a trusted import, configure `.env.spatial.example` values outside the repository and run the import without `--dry-run`:

```bash
npm run spatial:import -- /tmp/bolets-spatial-cells.ndjson
```

Use a publishable/anon key plus the dedicated spatial import token. A service-role key is supported for controlled CI but must never be placed in `.env.local`, a `NEXT_PUBLIC_` variable, or browser code. Imports are atomic, idempotent upserts in batches of 1,000. A replay updates only rows whose stored evidence changed; a new `updated_at` value alone does not rewrite the static grid.

Useful build options:

```bash
npm run spatial:build -- --bbox=430000,4670000,450000,4690000 --limit=5000
npm run spatial:build -- --landcover-sample=50 --tile-size=40000
```

## Publication rules

A cell is published only when terrain, land cover, and soil evidence are present, at least two authoritative sources are named, a current weather grid point is available, and completeness passes the scoring threshold. Scores use trailing 24-hour means and are capped during severe heat/dryness, after a recent frost, and outside the species season. The response includes source resolution, provenance, confidence, unavailable fields, timestamp, factor contributions, and `modelVersion`.

The map uses a compact zoom pyramid: exact 250 m cells locally, then prebuilt 1 km, 2.5 km, 5 km, and 10 km display cells as the view widens. The four coarse levels also carry compact, versioned per-species arrays of exact compatible-cover fractions, built with `npm run spatial:precompute-habitat`; interactive reads therefore never rescan the country-wide 250 m table. Run that command after deploying any species addition, removal, reordering, or ecological gate change so every catalogue profile has a complete cache entry. The cache supports up to 32 profiles; the current catalogue uses 27. The former 500 m level duplicated more than 100,000 rows for a narrow zoom band; 1 km cells remain active through that band, and the exact 250 m reader starts only at the original close-zoom threshold. Current conditions for the three coarsest levels are refreshed once per day so zooming never performs country-scale weather aggregation during an interactive request. Display resolution remains separate from provider resolution in every response.

## Free-plan storage and read performance

`20260812075342_optimize_spatial_storage_and_reads.sql` keeps PostgreSQL as the system of record while removing the storage and query patterns that were exhausting the Supabase Free database allowance:

- coarse viewport reads use the four numeric bounds already stored on each row; they no longer materialize wide rows or sort stored polygons before applying the limit;
- the redundant 500 m rollup is deleted and prevented from being rebuilt;
- duplicate/unused habitat indexes and the stored land-cover-fraction projection are removed, while the measured fast habitat covering index, compact generated forest field, altitude/pH range index, primary key, and detailed 250 m GiST index remain;
- exact sampled land-cover fractions are stored as parallel small code/share arrays instead of repeated JSON objects; the importer removes the verbose JSON copy before every upsert;
- map bounds are expanded to stable resolution-aware buckets so small pans reuse the same Next.js/CDN response;
- fine-grid requests have resolution-aware area ceilings, preventing an anonymous country-wide 250 m/1 km request from consuming the database statement budget;
- map-only prediction requests ask the Edge Function for scoring fields only, while cell-detail requests retain the complete evidence payload.
- prediction inputs merge current environment and exact static habitat coverage inside one Edge request, then use the same five-minute server cache as the public prediction response; cache-aligned repeat views avoid both database reads.

The production application on 2026-08-12 measured 537 MB before compaction and 381 MB afterwards. `spatial_cell_levels` fell from 168 MB to 37 MB, with no loss of the canonical 343,166 exact 250 m cells. A full-Catalonia precomputed environment read fell from about 8.3 seconds to 15–44 ms. After bounding exact habitat aggregation to the visible coarse-cell extent, a representative 1 km habitat database read takes about 96 ms and the complete warm Edge response about 0.52–0.53 seconds; cache-aligned repeats return from the Next.js server cache in roughly 7–11 ms.

After applying the migration to an existing populated database, run the following once during a quiet maintenance window. The command takes an exclusive lock while rewriting each table, but it is what returns deleted-row space to the Supabase quota rather than merely making it reusable inside PostgreSQL:

```sql
vacuum (full, analyze) public.spatial_cell_levels;
vacuum (full, analyze) public.spatial_cells;
```

Track `pg_database_size(current_database())`, the two spatial table sizes, the coarse species cache, the two-date weather window, and completed `cron.job_run_details` growth. The operating target is below 450 MB after physical compaction. If the database remains uncomfortably close to the 500 MB Free limit after retention and compaction, move the same migrations to a self-hosted Supabase/PostgreSQL Docker deployment; do not replace Postgres or split authoritative spatial evidence merely to avoid the hosted limit.

The compact-storage migration is followed by an explicit `ANALYZE` migration. Keep that step after schema-only imports or rebuilds: without fresh null-distribution statistics, PostgreSQL can scan every base cell merely to choose between legacy and compact habitat storage.

Static habitat responses can optionally be served from object storage by setting `HABITAT_ASSET_BASE_URL`. Objects use the versioned path `<model>/<species>/<resolution>/<west,south,east,north>.json`; a missing or invalid object automatically falls back to the Supabase reader. For Cloudflare R2 production traffic, use a custom domain with Cloudflare Cache enabled rather than the rate-limited `r2.dev` development URL. The database remains the source used to generate those immutable artifacts.
