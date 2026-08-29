# Supabase environmental pipelines

Supabase stores normalized environmental evidence and exposes it only through server-side Edge Functions. The public map never receives database credentials, and the 250 m grid represents model units rather than mushroom observations.

## Local development

The local stack keeps only the services the application uses: PostgreSQL,
Auth, PostgREST, private Storage, Mailpit, Kong, and the Edge runtime. This is
lighter than running Studio, Realtime, Logflare, Vector, and Supavisor beside
the application.

```bash
npm run supabase:start
npm run supabase:reset
npm run dev
```

`supabase:reset` recreates the local database and deletes its local data. It
applies every migration and then `supabase/seed.sql`. The seed contains only
the 386 fixed 10 km buckets intersecting the version-controlled ICGC Catalonia
land boundary. It makes finding-location generalization available without a
large GIS import; it is not occurrence evidence, habitat evidence, or weather
data. A reviewed 250 m spatial import safely replaces matching development
rows during its normal coarse-level refresh.

Copy `.env.example` to the ignored `.env.local`, then fill both server and
`NEXT_PUBLIC_` Supabase URL/anon variables from `npm run supabase:status -- -o
env`. The server-only local service-role value belongs only in
`SUPABASE_SERVICE_ROLE_KEY`; never copy it to a `NEXT_PUBLIC_` variable. The
usual local API URL is `http://127.0.0.1:54321`, and one-time-code emails are
visible in Mailpit at `http://127.0.0.1:54324`.

Passkeys are enabled locally and are deliberately bound to
`http://localhost:3101`; use that hostname rather than `127.0.0.1` when
enrolling or signing in with one. A user first enters with an email code, then
adds a passkey from `/compte`. Passkeys are still an experimental Supabase Auth
API, so the email code remains the recovery path.

Google sign-in requires a Web OAuth client that cannot be committed to the
repository. Add `http://localhost:3101` as an authorized JavaScript origin and
`http://127.0.0.1:54321/auth/v1/callback` as its authorized redirect URI. Then
set `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET` in the ignored repository-root
`.env` file that the Supabase CLI reads,
fill the client ID and enable `[auth.external.google]` in `config.toml`. The
Google button appears automatically when Supabase reports the provider as
enabled. The application callback is already allowlisted at
`http://localhost:3101/auth/callback`.

## Production inventory

| Pipeline | Trigger | Purpose |
| --- | --- | --- |
| `refresh-environment` | Daily at 05:15 UTC | Refreshes Open-Meteo conditions for the 10 ecological macro-regions. |
| `import-spatial-cells` | Trusted offline/CI worker | Validates and upserts reviewed 250 m terrain, land-cover, and soil evidence. |
| `refresh-spatial-environment` | Every minute, three leased lanes | Refreshes the shared 2.5 km atmosphere grid once per day as stable 50-point shards. Invocations leave through the VPS, one authenticated Cloudflare Worker, and one authenticated AWS Lambda Function URL. The database allows only one running shard per lane, fallback shards finish before atmosphere can start, and only the last successful shard publishes the generation cursor. If a provider update lands between phases, the atmosphere shard refreshes only its linked coarse fallback points before scoring. The exact 720-hour AROME state is retained privately, so normal runs fetch only a 72-hour overlap. `station-rain-v1` uses XEMA gauge IDW where the network allows and a separately retained seamless Météo-France fallback sampled on the existing 500-point / 9 km lattice elsewhere. |
| `refresh-spatial-soil` | Every 5 minutes until complete | Refreshes the independent 9 km soil-moisture grid and its separate horizon-zero plus five-day environmental forecast once per day in rate-limited batches. Its four independent provider reads are split two per egress lane, keeping concurrent requests below four per source IP. If both observed streams are refreshed later and move more than 8 hours beyond the stored baseline, the same-day issue is invalidated and rebuilt automatically. Independent cursors let a transient forecast failure retry without blocking current soil ingestion. |
| `import-clms-soil` | Trusted raster-staging worker | Validates and imports Copernicus CLMS 1 km surface-soil-moisture and soil-water-index samples on the existing 2.5 km atmosphere lattice. This is a private hot evaluation stream and cannot alter published scores. |
| `stage-arome-shadow` | Named-token maintenance request | Probes one authenticated Météo-France WCS field contract or stages one bounded 0.01-degree response after a single-message GRIB2 container check. Semantics remain unverified, the source stays blocked, and it cannot alter production weather or scores. |
| `import-xema-rain` | Every 3 h at minute 50 (23:50 UTC run precedes the daily refresh) | Imports a trailing 12 h of Meteocat XEMA semi-hourly gauge precipitation collapsed to station hours with completeness counts, keeping a 60-day rolling window. Each hour is covered by four runs, so a six-hour provider outage self-heals. These hours feed the promoted `station-rain-v1` past-precipitation correction in the spatial refresh. `npm run weather:backfill-xema-rain` refills the window through the same function; `npm run weather:compare-station-rain` re-runs the station-versus-model validation. |
| `refresh-spatial-level-conditions` | After the daily observed atmosphere and soil ingestions both complete | Materializes current conditions for the 2.5, 5, and 10 km display levels. Forecast degradation cannot block current conditions, and completed ingestion invocations keep retrying the idempotent refresh gate after transient failures. |
| `refresh-species-occurrences` | Seven monthly batches from 03:15 through 04:15 UTC on day 1 | Refreshes whitelisted FungaCAT records through GBIF, applies quality gates, and stores only 10 km support cells. |
| `read-environment` | Next.js server request | Returns the latest regional snapshot. |
| `read-spatial-environment` | Next.js server request | Returns verified cells in a bounded local map view. |
| `read-occurrence-support` | Next.js server request | Returns privacy-safe historical record counts and provenance for one species in a bounded view. |
| `read_operational_status` | Private Next.js/Grafana service-role request | Returns a bounded, read-only summary of source health, generation cursors, recent audited runs, rolling-state completeness, shard progress and provider-budget reservations. The `security invoker` RPC is revoked from browser roles and omits run metadata and secrets. |
| retention job | Daily at 00:00 UTC | Retains 45 days of regional weather, four complete dates of observed grid weather, the newest completed five-day issue plus any newer in-progress replacement, 24 hours of completed `pg_cron` history, and 90 days of ingestion runs. CLMS shadow imports retain the newest four completed product dates, so provider gaps do not silently shorten the hot preview. Snapshot and cron-log vacuums run at 00:02/00:03 before the observed pipelines restart at 00:05/00:06; the forecast-table vacuum remains at 06:40. |

Every write run is audited in `ingestion_runs`. `pipeline_sources` records source health, `pipeline_cursors` makes large refreshes resumable, and all application tables have RLS enabled without browser table grants.

Every Open-Meteo request first reserves a conservative weighted estimate from
one private PostgreSQL ledger shared by the VPS, Worker, and Lambda egress lanes. The
global ceilings are 550 estimated units/minute, 4,500/hour and 10,300/day.
The estimator adds 5% before reserving, so the daily ceiling represents at most
about 9,810 provider units before request rounding and remains below the
published 10,000-unit provider limit while fitting the measured 5,128-point
atmosphere and 500-point forecast workload plus a full fallback realignment at
an hour seam. Atmospheric work has a 6,500-unit consumer ceiling,
soil plus forecasts 3,600, and regional ingestion 200. Those scheduled caps
sum to 10,300, so a multi-day atmosphere bootstrap cannot consume the regional
or forecast allowance; the global ceiling still
wins if manual backfill or another consumer is active. One provider attempt is
made per reservation, and quota exhaustion defers a leased shard rather than
silently exceeding the allowance. The Worker is an HMAC-authenticated
allowlist relay for Open-Meteo only; it carries no database credentials, does
not cache provider responses and must not be cloned into extra zones to evade
provider accounting.

## Resolution and source of truth

- Display grid: 250 × 250 m in EPSG:25831.
- Elevation: ICGC terrain WCS at 5/15 m, sampled once per model cell.
- Land cover: ICGC Cobertes del sòl 2024 at 1 m native resolution, sampled every 50 m within each cell.
- Soil: ISRIC SoilGrids WCS at 250 m for pH, clay, sand, and silt. These inputs support pH and texture evidence, but do not identify geological substrate; species substrate remains ecological reference data unless a separately verified substrate source is imported.
- Geological context: ICGC Mapa geològic de Catalunya 1:50.000 v3r0, sampled across each canonical 250 m cell and stored in compact side tables with mapped/class/unit coverage. It is display-only evidence, is area-weighted from 250 m at coarse zooms, and never enters soil readiness, habitat gates, or suitability scoring.
- Potential habitat: every recognized ICGC cover fraction sampled within each 250 m cell is retained. The database sums only fractions compatible with the selected species, then preserves raw cover/altitude/pH-compatible coverage `C` and the compatible-cover-weighted altitude response `A`. Both are normalized to 0–1 before the distribution map and `hydrothermal-v1` derive effective habitat as `H = C × A`.
- Atmosphere: Météo-France AROME through Open-Meteo at 2.5 km native resolution, sampled on aligned 2.5 km model tiles and statistically adjusted to each tile's median terrain elevation. Temperature, air humidity, reference evapotranspiration (ET₀) and wind use this model. Past precipitation remains `station-rain-v1`: complete XEMA gauge hours are interpolated at each 2.5 km point, while uncovered hours use the seamless Météo-France blend sampled at 9 km. The coarser fallback resolution is published explicitly and never relabelled as 2.5 km rain.
- Direct atmosphere shadow: authenticated Météo-France AROME WCS metadata is checked against the pinned 0.01-degree grid, level, unit, run, forecast-lead and extent contract. At most one temperature, relative-humidity or wind request and one 0.25° × 0.25° Catalonia subset may be staged per named-token call. Returned bytes must contain exactly one complete GRIB2 message, but container framing does not prove its field, level, grid, bounds or valid time; semantic verification remains pending. Private bytes do not enter production weather or scoring.
- Soil moisture: Open-Meteo's available land model at 9 km. It remains an explicitly coarser input and is never labelled as 2.5 km data. The 7-day mean and minimum are normalized as relative extractable water inside unified water state `W`; soil moisture is not a separate final factor.
- Satellite soil shadow: Copernicus CLMS SSM v1 and SWI v2 are 1/112° daily rasters (about 1 km sampling) with explicit noise, QFLAG, mask, and surface-state fields. Raw values are sampled only at the existing 2.5 km AROME point centres to bound database size. SSM/SWI are relative percentages rather than 3–9 cm volumetric moisture, can be biased or masked in forests and steep terrain, and remain outside `hydrothermal-v1` until a versioned calibration proves a safe single-water-source bridge. PostgreSQL keeps only a four-date hot preview; seasonal calibration requires an external raster/archive backfill or sufficient-statistics export rather than pretending this window is training history.
- Five-day projection: verified Météo-France AROME atmosphere provides the history through the issue baseline, ECMWF IFS HRES provides future atmospheric hours, and the existing Open-Meteo 3–9 cm layer provides soil moisture; the forecast is represented at 9 km. The normalizer splices AROME at or before horizon zero with ECMWF after horizon zero and recalculates every complete hydrothermal window for +1…+5 days. This lets observed heat, frost, rain, and drying events age out without substituting ECMWF's different retrospective analysis. Forecast data is stored in `weather_grid_forecasts`, never in the latest-observation table. An issue is marked complete only after every configured point has all six publishable horizons. The application applies future-minus-baseline anomalies to the latest publishable observation, reconciles physical bounds and dependent windows, and scores the corrected values. Missing hours remain unavailable rather than being shortened or backfilled from the other provider. ECMWF atmosphere and generic soil-forecast health are recorded separately, and forecast ingestion advances on its own cursor so current-soil failures cannot suppress a successful projection batch. A later same-day observation cycle that crosses the 8-hour seam automatically replaces the daily issue; ordinary cursor resets cannot overwrite a completed issue silently.
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

## Import the CLMS soil shadow

CLMS catalogue discovery is public, but raster downloads require a Copernicus Data Space account. Stage the nine aligned COG assets outside the repository: SSM, SSM noise, SWI002/005/010, their matching QFLAG rasters, and SSF. The manifest must preserve each official `s3://eodata/CLMS/...` asset path, checksum, and explicit `checksumAlgorithm` plus product ID, version, nominal time, content window, and publication time. The adapter accepts CDSE's `d50110<MD5>` multihash directly and verifies the staged file. Only reviewed SSM V1.2.1+ patch releases within the V1.2 line and spatial-shift-corrected SWI V2.1.1+ patches within V2.1 are accepted; a new minor or major line requires an adapter review. The snapshot date is parsed from the nominal product ID rather than STAC `datetime`.

Discover the newest complete, reviewed product pair without credentials, or stage its nine authenticated OData nodes with a CDSE Sentinel Hub OAuth client. `CDSE_CLIENT_ID` and `CDSE_CLIENT_SECRET` must be injected into the controlled local or CI process environment; managed Edge secrets are not readable by this local worker. They are exchanged once for a short-lived token and are never written to the manifest or logs. The staging directory must be an absolute path outside the repository. Every COG is checked against its STAC byte length and checksum before the manifest is created:

```bash
npm run soil:fetch-clms -- --discover-only

# After injecting CDSE_CLIENT_ID and CDSE_CLIENT_SECRET from the secret manager:
npm run soil:fetch-clms -- \
  --output-dir=/absolute/path/outside-the-repository/clms-cogs \
  --date=YYYY-MM-DD
```

The authenticated command writes `clms-manifest.json` alongside the verified COGs. Existing files are reused only when both length and checksum match; an unexpected catalogue grid, product version, band scale, QFLAG codebook or product-specific SSF codebook stops staging.

Run a local validation before uploading:

```bash
npm run soil:import-clms -- \
  --manifest=/absolute/path/clms-manifest.json \
  --asset-dir=/absolute/path/clms-cogs \
  --dry-run
```

For an authenticated import, use a service-role key in controlled CI so the local staging worker can read the canonical AROME points. An anon key plus `CLMS_SOIL_IMPORT_TOKEN` is also supported only when `--points=/absolute/path/trusted-arome-points.json` supplies a service-generated point export. The local worker samples raw UINT8 values without applying raster scale metadata and posts batches of 500 through the authenticated Edge Function:

```bash
npm run soil:import-clms -- \
  --manifest=/absolute/path/clms-manifest.json \
  --asset-dir=/absolute/path/clms-cogs
```

Moisture, noise, and QFLAG DNs `0…200` decode with a `0.5%` scale. Embedded `241…255` flag codes are never scaled or clamped. SSF is deliberately decoded without scaling using the product-specific CDSE codebook: `0` unfrozen/nominal, `1` frozen, `2` thawing, `3` frozen with snow cover, and `4` wet snow. This differs from the generic ASCAT/H SAF codebook, so only `0` is accepted as usable here. Every manifest records expected/imported counts and a completion time; a partial newer import cannot evict complete evidence. Raw rasters and exact ecological findings are not committed. A failed or late CLMS import degrades only this shadow source; it never blocks the two production weather streams or their forecast.

Private provider comparisons run against `http://localhost:3101` by default. Supplying any non-loopback `--app-url` also requires `--allow-remote`, because a prediction request contains a tight bounding box around the private field observation. Optional CLMS comparison input is a `clms-shadow-comparison-evidence-v1` external envelope containing the full generated manifest, a completed import record whose expected/imported/canonical counts agree, and a bounded sample set keyed by canonical atmosphere point. Its required `evidenceSha256` is calculated from that version marker, the normalized manifest, completion record, and normalized point-sorted samples. The comparison derives the atmosphere point from the selected 250 m cell ID, checks that the sample pixel lies within half a CLMS pixel of the cell's weather-grid coordinate, and emits only order labels plus content hashes and product provenance—not the observation coordinate, canonical point ID, or source-pixel coordinate.

## Stage a direct AROME shadow field

Deploy `20260815160509_add_arome_shadow_staging.sql` and the
`stage-arome-shadow` Edge Function only after configuring
`METEOFRANCE_AROME_API_KEY` as a Supabase Edge Function secret. Separately,
generate a high-entropy `AROME_SHADOW_STAGE_TOKEN` outside the repository, hash
it with SHA-256, and store only its 64-character lowercase hash in
`pipeline_secrets` under the name `arome-shadow-stage`. Never paste the raw
token into SQL history. The provider credential is attached inside the function
and is never accepted in request JSON, object names, responses, logs or database
metadata. The Edge gateway keeps JWT verification enabled; callers use the anon
JWT plus this least-privilege named token, never the service-role key.

For example, after calculating the hash in a controlled shell, insert only the
hash through an administrator connection:

```sql
insert into public.pipeline_secrets (name, secret_hash)
values ('arome-shadow-stage', '<64-character-lowercase-sha256>')
on conflict (name) do update set
  secret_hash = excluded.secret_hash,
  rotated_at = pg_catalog.now();
```

First probe one field's current WCS metadata. This performs GetCapabilities and
DescribeCoverage only and writes no object:

```bash
curl --fail-with-body --silent --show-error \
  "$SUPABASE_URL/functions/v1/stage-arome-shadow" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "x-arome-shadow-stage-token: $AROME_SHADOW_STAGE_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"action":"probe","variable":"temperature_2m"}'
```

After the one-field metadata probe, stage one small response. Bounds
are snapped outward to the 0.01-degree native grid, must remain inside the fixed
Catalonia envelope, and may span no more than 0.25 degrees on either axis. If
`validAt` is omitted, the function selects the latest available non-future lead
from the described run and withholds when every available lead is still in the
future:

```bash
curl --fail-with-body --silent --show-error \
  "$SUPABASE_URL/functions/v1/stage-arome-shadow" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "x-arome-shadow-stage-token: $AROME_SHADOW_STAGE_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{
    "action":"stage",
    "variable":"temperature_2m",
    "bounds":{
      "minLatitude":41.50,
      "maxLatitude":41.55,
      "minLongitude":1.50,
      "maxLongitude":1.55
    }
  }'
```

The function requires exactly one complete GRIB2 container and hashes the bytes
before an idempotent, non-overwriting upload. It does not decode GRIB sections,
so object metadata records `semantic_verification=pending`; callers must not
interpret the staged bytes as the requested field until a decoder verifies the
message semantics. Object names contain run time, requested valid time, request
field and a content-hash prefix, but no requested coordinates. Exact subset
bounds and units remain private object metadata. No signed or public URL is
created. Each authenticated attempt is recorded in `ingestion_runs`; if an
object upload succeeds but audit finalization fails, the request returns an
error and the content-addressed private object is recoverable/idempotent on the
next call. `pipeline_sources` stays `blocked` after one-field probes and stages,
pending the all-three same-run smoke and semantic decoder. Neither path
references production snapshot or prediction tables.

## Re-running a day's observed ingestion

The observed atmosphere, observed soil, and the daily forecast issue are a
coupled triple: the app refuses to splice a forecast whose baseline sits more
than 8 hours from the observed anchor, and the forecast reconciler only
rebuilds the issue once **both** observed streams have moved past it. To
re-ingest a day (for example after deploying new normalization fields), clear
both observed cursors and let the crons do the rest, in this order:

```sql
update pipeline_cursors set last_cell_id = null, updated_at = now()
where pipeline in ('spatial-atmosphere', 'spatial-soil')
  and snapshot_date = current_date;
```

The 2-minute atmosphere and 5-minute soil crons re-sweep their grids in
resumable batches; when both finish, `reconcile_weather_forecast_issue`
invalidates the stale issue and the forecast rebuilds anchored to the fresh
observation. Resetting only one stream leaves the reconciler blind to the
drift and the app withholding every forecast until the next natural cycle.
While a sweep is mid-flight the map mixes snapshot generations point by
point; this resolves itself at completion plus one CDN expiry.

## Publication rules

A cell is published only when terrain, land cover, and soil evidence are verified, at least two authoritative sources are named, a current weather grid point is available, and every required `hydrothermal-v1` input window is complete. Missing inputs withhold the result; exponents are never renormalized around an absent component. The response reports the 0–1 derived effective compatible-area fraction `H = C × A`, conditional fruiting conditions `F = 100 × P × W^α × T^(1-α) × E`, and whole-cell opportunity `O = H × F` separately, together with component diagnostics, source resolution, provenance, unavailable fields, timestamp, and `modelVersion`. `F` and `O` are 0–100 ordinal indices; `H` is not a score, and none is a probability of presence.

Selected cells can also expose five-day projected timelines that retain conditional fruiting conditions and whole-cell opportunity separately; the backward-compatible `score` field and public trend chart represent whole-cell opportunity. Forecasts retain the selected display cell's static habitat evidence and anchor future dynamic values to its latest server-verified publishable observation with a same-issuance horizon-zero model baseline. They expire 36 hours after issuance and remain unavailable when the baseline or any required corrected window is incomplete, or when the observation and baseline are more than 8 hours apart. When a later observation refresh causes that last condition, the pipeline rebuilds the same-day issue automatically instead of widening the safety seam. Horizon confidence is high at +1 day, moderate at +2/+3, and limited at +4/+5, capped by current, baseline, and target provider confidence. It communicates increasing meteorological lead-time uncertainty rather than a calibrated probability of mushroom appearance. Habitat-only species remain excluded.

The map uses a compact zoom pyramid: exact 250 m cells locally, then prebuilt 1 km, 2.5 km, 5 km, and 10 km display cells as the view widens. The four coarse levels also carry compact, versioned per-species arrays of exact compatible-cover fractions, built with `npm run spatial:precompute-habitat`; interactive reads therefore never rescan the country-wide 250 m table. Run that command after deploying any addition, removal, reordering, or ecological gate change among the edible species with a live prediction model so every combined-map candidate has a complete cache entry. The cache supports up to 64 profiles and follows `globalCandidateSpecies`, rather than allocating slots to catalogue species that cannot appear in live predictions. The former 500 m level duplicated more than 100,000 rows for a narrow zoom band; 1 km cells remain active through that band, and the exact 250 m reader starts only at the original close-zoom threshold. Current conditions for the three coarsest levels are refreshed once per day so zooming never performs country-scale weather aggregation during an interactive request. Display resolution remains separate from provider resolution in every response. Prediction cells use the direct score-band colour of `O`; habitat coverage has already entered through `H` and is not applied again as colour opacity.

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

Track `pg_database_size(current_database())`, the two spatial table sizes, the coarse species cache, the four-date observed weather window, and completed `cron.job_run_details` growth. The operating target is below 450 MB after physical compaction. If the database remains uncomfortably close to the 500 MB Free limit after retention and compaction, move the same migrations to a self-hosted Supabase/PostgreSQL Docker deployment; do not replace Postgres or split authoritative spatial evidence merely to avoid the hosted limit.

The compact-storage migration is followed by an explicit `ANALYZE` migration. Keep that step after schema-only imports or rebuilds: without fresh null-distribution statistics, PostgreSQL can scan every base cell merely to choose between legacy and compact habitat storage.

Static habitat responses can optionally be served from object storage by setting `HABITAT_ASSET_BASE_URL`. Objects use the versioned path `<model>/<species>/<resolution>/<west,south,east,north>.json`; a missing or invalid object automatically falls back to the Supabase reader. For Cloudflare R2 production traffic, use a custom domain with Cloudflare Cache enabled rather than the rate-limited `r2.dev` development URL. The database remains the source used to generate those immutable artifacts.
