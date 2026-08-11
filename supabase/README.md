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
| `refresh-species-occurrences` | Monthly at 03:15 UTC on day 1 | Refreshes whitelisted FungaCAT records through GBIF, applies quality gates, and stores only 10 km support cells. |
| `read-environment` | Next.js server request | Returns the latest regional snapshot. |
| `read-spatial-environment` | Next.js server request | Returns verified cells in a bounded local map view. |
| `read-occurrence-support` | Next.js server request | Returns privacy-safe historical record counts and provenance for one species in a bounded view. |
| retention job | Daily at 06:30 UTC | Retains 45 days of regional weather, 7 days of grid weather, and 90 days of run history. |

Every write run is audited in `ingestion_runs`. `pipeline_sources` records source health, `pipeline_cursors` makes large refreshes resumable, and all application tables have RLS enabled without browser table grants.

## Resolution and source of truth

- Display grid: 250 × 250 m in EPSG:25831.
- Elevation: ICGC terrain WCS at 5/15 m, sampled once per model cell.
- Land cover: ICGC Cobertes del sòl 2024 at 1 m native resolution, sampled every 50 m within each cell.
- Soil: ISRIC SoilGrids WCS at 250 m for pH, clay, sand, and silt.
- Atmosphere: Météo-France AROME through Open-Meteo at 2.5 km native resolution, sampled on aligned 2.5 km model tiles and statistically adjusted to each tile's median terrain elevation. Temperature, air humidity, precipitation and wind use this model.
- Soil moisture: Open-Meteo's available land model at 9 km. It is retained as a separate, explicitly coarser factor and never labelled as 2.5 km data.
- Time windows: the snapshot keeps the latest model estimate, trailing 24-hour minimum/mean/maximum temperature, air humidity, soil moisture and wind, trailing 24-hour maximum gust, and trailing 168-hour rainfall, minimum temperature, and frost-hour count. All windows use `Europe/Madrid` local time.

Weather is normalized in `weather_grid_points` and `weather_grid_snapshots`. Many 250 m terrain cells reference the same 2.5 km atmospheric point; weather is never presented as if it had 250 m precision. Atmospheric and soil-moisture resolutions are preserved independently in snapshot metadata. Species ecology and model weights remain version-controlled in the application and are the single source of truth for scoring.

## Historical occurrence evidence

FungaCAT is consumed once through its GBIF dataset key `8583f4f6-f762-11e1-a439-00145eb45e9a` (DOI `10.15468/ttivpp`). It is presence-only, historically uneven evidence and is deliberately kept outside the suitability calculation:

- records with missing or invalid coordinates, fatal GBIF taxonomic or coordinate issues, positions outside the Catalonia envelope, or coordinate uncertainty above 10 km are rejected;
- accepted coordinates are mapped directly to version-controlled 10 km land cells by `upsert_species_occurrence_batch`; longitude and latitude columns do not exist in the occurrence tables;
- an incomplete refresh or a drop below 50% of a previous non-trivial snapshot is not finalized, so the last complete snapshot remains available;
- the public read path returns only support-cell bounds, record counts, observed-year/month summaries, source URL, DOI, licence, and last synchronization time;
- a record corroborates historical occurrence only. No record is never interpreted as species absence, and neither state changes the current environmental score.

The dataset is licensed CC BY-NC 4.0. Application code and dataset rights remain separate; raw FungaCAT data is not committed to this repository. See [`docs/data-licenses.md`](../docs/data-licenses.md).

## Rebuild and import static cells

The GIS worker writes streaming NDJSON so a country-wide rebuild does not need to fit in memory. Downloads are cached under `/tmp/bolets-spatial-cache` by default.

```bash
npm run spatial:build -- --output=/tmp/bolets-spatial-cells.ndjson
npm run spatial:import -- /tmp/bolets-spatial-cells.ndjson --dry-run
```

For a trusted import, configure `.env.spatial.example` values outside the repository and run the import without `--dry-run`:

```bash
npm run spatial:import -- /tmp/bolets-spatial-cells.ndjson
```

Use a publishable/anon key plus the dedicated spatial import token. A service-role key is supported for controlled CI but must never be placed in `.env.local`, a `NEXT_PUBLIC_` variable, or browser code. Imports are idempotent upserts in batches of 1,000.

Useful build options:

```bash
npm run spatial:build -- --bbox=430000,4670000,450000,4690000 --limit=5000
npm run spatial:build -- --landcover-sample=50 --tile-size=40000
```

## Publication rules

A cell is published only when terrain, land cover, and soil evidence are present, at least two authoritative sources are named, a current weather grid point is available, and completeness passes the scoring threshold. Scores use trailing 24-hour means and are capped during severe heat/dryness, after a recent frost, and outside the species season. The response includes source resolution, provenance, confidence, unavailable fields, timestamp, factor contributions, and `modelVersion`.

The map uses a zoom pyramid: exact 250 m cells locally, then prebuilt 500 m, 1 km, 2.5 km, 5 km, and 10 km display cells as the view widens. Current conditions for the three coarsest levels are refreshed once per day so zooming never performs country-scale weather aggregation during an interactive request. Display resolution remains separate from provider resolution in every response.
