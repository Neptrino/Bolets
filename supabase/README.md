# Supabase environmental pipelines

Supabase stores normalized environmental evidence and exposes it only through server-side Edge Functions. The public map never receives database credentials, and the 250 m grid represents model units rather than mushroom observations.

## Production inventory

| Pipeline | Trigger | Purpose |
| --- | --- | --- |
| `refresh-environment` | Daily at 05:15 UTC | Refreshes Open-Meteo conditions for the 10 ecological macro-regions. |
| `import-spatial-cells` | Trusted offline/CI worker | Validates and upserts reviewed 250 m terrain, land-cover, and soil evidence. |
| `refresh-spatial-environment` | Every 2 minutes | Refreshes the shared 2.5 km AROME atmosphere grid once per day, in resumable batches. |
| `refresh-spatial-soil` | Every 5 minutes until complete | Refreshes the independent 9 km soil-moisture grid and its separate horizon-zero plus five-day environmental forecast once per day in rate-limited batches. Independent cursors let a transient forecast failure retry without blocking current soil ingestion. |
| `refresh-spatial-level-conditions` | After the daily observed atmosphere and soil ingestions both complete | Materializes current conditions for the 2.5, 5, and 10 km display levels. Forecast degradation cannot block current conditions, and completed ingestion invocations keep retrying the idempotent refresh gate after transient failures. |
| `refresh-species-occurrences` | Seven monthly batches from 03:15 through 04:15 UTC on day 1 | Refreshes whitelisted FungaCAT records through GBIF, applies quality gates, and stores only 10 km support cells. |
| `read-environment` | Next.js server request | Returns the latest regional snapshot. |
| `read-spatial-environment` | Next.js server request | Returns verified cells in a bounded local map view. |
| `read-occurrence-support` | Next.js server request | Returns privacy-safe historical record counts and provenance for one species in a bounded view. |
| retention job | Daily at 06:30 UTC | Retains 45 days of regional weather, a bounded week of observed grid weather, three issue dates of five-day forecasts, 48 hours of completed `pg_cron` history, and 90 days of ingestion runs. |

Every write run is audited in `ingestion_runs`. `pipeline_sources` records source health, `pipeline_cursors` makes large refreshes resumable, and all application tables have RLS enabled without browser table grants.

## Resolution and source of truth

- Display grid: 250 × 250 m in EPSG:25831.
- Elevation: ICGC terrain WCS at 5/15 m, sampled once per model cell.
- Land cover: ICGC Cobertes del sòl 2024 at 1 m native resolution, sampled every 50 m within each cell.
- Soil: ISRIC SoilGrids WCS at 250 m for pH, clay, sand, and silt. These inputs support pH and texture evidence, but do not identify geological substrate; species substrate remains ecological reference data unless a separately verified substrate source is imported.
- Geological context: ICGC Mapa geològic de Catalunya 1:50.000 v3r0, sampled across each canonical 250 m cell and stored in compact side tables with mapped/class/unit coverage. It is display-only evidence, is area-weighted from 250 m at coarse zooms, and never enters soil readiness, habitat gates, or suitability scoring.
- Potential habitat: every recognized ICGC cover fraction sampled within each 250 m cell is retained. The database sums only fractions compatible with the selected species, then preserves raw cover/altitude/pH-compatible coverage `C` and the compatible-cover-weighted altitude response `A`. Both are normalized to 0–1 before the distribution map and `hydrothermal-v1` derive effective habitat as `H = C × A`.
- Atmosphere: Météo-France AROME through Open-Meteo at 2.5 km native resolution, sampled on aligned 2.5 km model tiles and statistically adjusted to each tile's median terrain elevation. Temperature, air humidity, precipitation, reference evapotranspiration (ET₀) and wind use this model.
- Soil moisture: Open-Meteo's available land model at 9 km. It remains an explicitly coarser input and is never labelled as 2.5 km data. The 7-day mean and minimum are normalized as relative extractable water inside unified water state `W`; soil moisture is not a separate final factor.
- Five-day projection: ECMWF IFS HRES atmosphere and the existing Open-Meteo 3–9 cm soil-moisture layer, both represented at 9 km. Forecast data is normalized at the shared 9 km points and stored in `weather_grid_forecasts`, never in the latest-observation table. Every issuance stores a horizon-zero baseline and +1…+5-day targets whose complete hydrothermal windows never use hours beyond their valid time. The application applies future-minus-baseline anomalies to the latest publishable observation, reconciles physical bounds and dependent windows, and scores the corrected values. Incomplete series remain unavailable rather than being shortened silently. ECMWF atmosphere and generic soil-forecast health are recorded separately, and forecast ingestion advances on its own cursor so current-soil failures cannot suppress a successful projection batch.
- The horizon-zero rollout migration deliberately withholds projections for the remainder of its UTC deployment date. The v2 forecast stream starts with the next observed-weather cycle, preventing a late-day provider baseline from being calibrated against a many-hours-old current snapshot.
- Time windows: the snapshot keeps the latest model estimate and the sufficient statistics required by `hydrothermal-v1`. Temperature mean plus frost-hour (≤ 0 °C) and heat-hour (≥ 27 °C) counts use the configured 20-day ectomycorrhizal window or 14-day window for the other guilds. Effective rain and wet-day counts use 21 days for ectomycorrhizal and wood-decaying species, 14 days for litter/soil and grassland species, and a 26-day `Boletus edulis` override. A wet day starts at 1 mm; accumulated effective rain is `max(0, rain - wetDays × 1 mm - 0.5 × ET0)`. Water state also uses vapour-pressure deficit derived from 7-day mean temperature and humidity, dry-spell length, and 7-day mean/minimum shallow relative extractable water. Air humidity, rain, soil moisture, and drought feed `W` once rather than becoming independent scores. All windows use `Europe/Madrid` local time.

Weather is normalized in `weather_grid_points` and `weather_grid_snapshots`; projections use the separate `weather_grid_forecasts` table with explicit issue time, valid time, and horizon. Many 250 m terrain cells reference the same 2.5 km atmospheric point, and many atmospheric points share one 9 km soil/forecast point; weather is never presented as if it had 250 m precision. Atmospheric and soil-moisture resolutions are preserved independently in snapshot metadata. Species ecology, guild priors, species overrides, response parameters, and hydrothermal exponents remain version-controlled in the application and are the single source of truth for current and projected indices. The midpoint and half-widths of each temperature response are initialized from the species' numeric temperature envelope unless an explicit species-literature override replaces them.

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

Build and import the separate ICGC geology snapshot against the exact live
canonical-cell set (the builder fails closed if a cell is missing or unmapped):

```bash
npm run spatial:export-cell-ids -- --output=/tmp/bolets-spatial-cell-ids.ndjson
npm run spatial:build-geology -- --cells=/tmp/bolets-spatial-cell-ids.ndjson --output=/tmp/bolets-spatial-geology.ndjson
npm run spatial:import -- data/geology/icgc-geology-50k-units.json --geology-units-only
npm run spatial:import -- /tmp/bolets-spatial-geology.ndjson --geology-only
```

After the exact import, refresh the 1, 2.5, 5 and 10 km geology levels with the
service-only `refresh_spatial_geology_level` database RPC from a maintenance
client. This country-wide aggregation is intentionally kept outside a
request-bound Edge Function. Re-run `spatial:update-geology-mapping` only when
adopting a new pinned ICGC dataset, then review every changed unit
classification before importing it.

## Publication rules

A cell is published only when terrain, land cover, and soil evidence are verified, at least two authoritative sources are named, a current weather grid point is available, and every required `hydrothermal-v1` input window is complete. Missing inputs withhold the result; exponents are never renormalized around an absent component. The response reports the 0–1 derived effective compatible-area fraction `H = C × A`, conditional fruiting conditions `F = 100 × P × W^α × T^(1-α) × E`, and whole-cell opportunity `O = H × F` separately, together with component diagnostics, source resolution, provenance, unavailable fields, timestamp, and `modelVersion`. `F` and `O` are 0–100 ordinal indices; `H` is not a score, and none is a probability of presence.

Selected cells can also expose five-day projected timelines that retain `F` and `O` separately; the backward-compatible `score` field and public trend chart represent `O`. Forecasts retain the selected display cell's static habitat evidence and anchor future dynamic values to its latest server-verified publishable observation with a same-issuance horizon-zero model baseline. They expire 36 hours after issuance and remain unavailable when the baseline or any required corrected window is incomplete, or when the observation and baseline are more than 8 hours apart. Horizon confidence is high at +1 day, moderate at +2/+3, and limited at +4/+5, capped by current, baseline, and target provider confidence. It communicates increasing meteorological lead-time uncertainty rather than a calibrated probability of mushroom appearance. Habitat-only species remain excluded.

The map uses a compact zoom pyramid: exact 250 m cells locally, then prebuilt 1 km, 2.5 km, 5 km, and 10 km display cells as the view widens. The four coarse levels also carry compact, versioned per-species arrays of exact compatible-cover fractions, built with `npm run spatial:precompute-habitat`; interactive reads therefore never rescan the country-wide 250 m table. Run that command after deploying any species addition, removal, reordering, or ecological gate change so every catalogue profile has a complete cache entry. The cache supports up to 64 profiles; the current catalogue uses 52. The former 500 m level duplicated more than 100,000 rows for a narrow zoom band; 1 km cells remain active through that band, and the exact 250 m reader starts only at the original close-zoom threshold. Current conditions for the three coarsest levels are refreshed once per day so zooming never performs country-scale weather aggregation during an interactive request. Display resolution remains separate from provider resolution in every response. Prediction cells use the direct score-band colour of `O`; habitat coverage has already entered through `H` and is not applied again as colour opacity.

## Free-plan storage and read performance

`20260812075342_optimize_spatial_storage_and_reads.sql` keeps PostgreSQL as the system of record while removing the storage and query patterns that were exhausting the Supabase Free database allowance:

- coarse viewport reads use the four numeric bounds already stored on each row; they no longer materialize wide rows or sort stored polygons before applying the limit;
- the redundant 500 m rollup is deleted and prevented from being rebuilt;
- duplicate/unused habitat indexes and the stored land-cover-fraction projection are removed, while the measured fast habitat covering index, compact generated forest field, altitude/pH range index, primary key, and detailed 250 m GiST index remain;
- exact sampled land-cover fractions are stored as parallel small code/share arrays instead of repeated JSON objects; the importer removes the verbose JSON copy before every upsert;
- map bounds are expanded to stable resolution-aware buckets so small pans reuse the same Next.js/CDN response;
- fine-grid requests have resolution-aware area ceilings, preventing an anonymous country-wide 250 m/1 km request from consuming the database statement budget;
- map-only prediction requests ask the Edge Function for scoring fields only, while cell-detail requests retain the complete evidence payload.
- exact and coarse ICGC geology use narrow side tables (about 28 MiB at current cardinality), avoiding a rewrite and bloat of the 213 MiB canonical-cell heap;
- prediction inputs merge current environment and exact static habitat coverage inside one Edge request, then use the same five-minute server cache as the public prediction response; cache-aligned repeat views avoid both database reads.

The production application on 2026-08-12 measured 537 MB before compaction and 381 MB afterwards. `spatial_cell_levels` fell from 168 MB to 37 MB, with no loss of the canonical 343,166 exact 250 m cells. The 2026-08-13 geology rollout added about 28 MiB, bringing the database to about 409 MiB. A full-Catalonia precomputed environment read fell from about 8.3 seconds to 15–44 ms. After bounding exact habitat aggregation to the visible coarse-cell extent, a representative 1 km habitat database read takes about 96 ms and the complete warm Edge response about 0.52–0.53 seconds; cache-aligned repeats return from the Next.js server cache in roughly 7–11 ms.

After applying the migration to an existing populated database, run the following once during a quiet maintenance window. The command takes an exclusive lock while rewriting each table, but it is what returns deleted-row space to the Supabase quota rather than merely making it reusable inside PostgreSQL:

```sql
vacuum (full, analyze) public.spatial_cell_levels;
vacuum (full, analyze) public.spatial_cells;
```

Track `pg_database_size(current_database())`, the two spatial table sizes, the coarse species cache, the two-date weather window, and completed `cron.job_run_details` growth. The operating target is below 450 MB after physical compaction. If the database remains uncomfortably close to the 500 MB Free limit after retention and compaction, move the same migrations to a self-hosted Supabase/PostgreSQL Docker deployment; do not replace Postgres or split authoritative spatial evidence merely to avoid the hosted limit.

The compact-storage migration is followed by an explicit `ANALYZE` migration. Keep that step after schema-only imports or rebuilds: without fresh null-distribution statistics, PostgreSQL can scan every base cell merely to choose between legacy and compact habitat storage.

Static habitat responses can optionally be served from object storage by setting `HABITAT_ASSET_BASE_URL`. Objects use the versioned path `<model>/<species>/<resolution>/<west,south,east,north>.json`; a missing or invalid object automatically falls back to the Supabase reader. For Cloudflare R2 production traffic, use a custom domain with Cloudflare Cache enabled rather than the rate-limited `r2.dev` development URL. The database remains the source used to generate those immutable artifacts.
