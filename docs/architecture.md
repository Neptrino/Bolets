# Application architecture

## Server-first data flow

1. Species profiles and their ecological/model configuration are validated from version-controlled files at build time.
2. The offline GIS worker builds authoritative 250 × 250 m static cells from ICGC elevation and land cover plus ISRIC SoilGrids.
3. Supabase stores those cells and a normalized Open-Meteo grid. Many model cells share one weather point at the provider's real resolution.
4. Scheduled Edge Functions refresh regional and provider-grid weather, recording provenance, confidence, unavailable fields, cursors, and audited runs. A daily database job then materializes current conditions for the 2.5, 5, and 10 km display levels.
5. A separate monthly pipeline reads whitelisted fungal occurrences from GBIF, quality-filters them, and maps them immediately to 10 km support cells. Exact source coordinates are never persisted.
6. Next.js server code reads bounded environmental inputs and applies the same versioned scoring model used by species pages. Historical occurrence support is joined only as independent corroborating context.
7. The browser renders the ICGC topographic base and requests a zoom-appropriate overlay: 250 m locally, then 500 m, 1 km, 2.5 km, 5 km, or 10 km summaries as the view widens.

## Architectural decisions

- Species ecology and model weights stay in version control as the scoring single source of truth; Supabase stores observations and normalized snapshots, not competing model configuration.
- The 250 m grid is the canonical static model unit. Larger map cells are prebuilt summaries of verified 250 m evidence, never mushroom occurrences or guarantees of presence. Coarse current-condition summaries are refreshed after daily weather ingestion and read directly during zoom interactions.
- Source resolution is preserved independently from display resolution. A coarse display cell therefore remains explicit about the atmospheric, soil-moisture, terrain, and land-cover resolutions behind it.
- Zoom aggregation averages representative conditions but retains safety-sensitive temporal extremes: the coldest minimum, hottest maximum, strongest wind and highest frost-hour count inside each display cell.
- Weather windows are explicit: “now” is Open-Meteo’s latest model estimate, minimum/mean/maximum values cover the trailing 24 hours, and rainfall plus frost detection cover the trailing 168 hours in the Europe/Madrid time zone. These are model values, not station observations.
- Static GIS processing runs outside Edge Functions because authoritative raster products are too large for request-bound runtimes.
- Read functions return only verified cells in bounded views. Exact sensitive ecological locations are not collected or exposed.
- Historical occurrences are presence-only evidence, not training labels or a score multiplier. A record can corroborate ecological plausibility, but missing records never reduce suitability or imply absence. FungaCAT is accessed through its GBIF dataset key so the same records cannot be ingested twice under two source names.
- Occurrence responses expose counts, year ranges, provenance, DOI, and licence only at a minimum 10 km grid. The raw GBIF coordinates exist only in the authenticated ingestion request and the database mapping function; neither the source coordinates nor public point features are stored.
- Species-page habitat maps encode static forest/altitude/pH coverage only with blue intensity. A separate purple hatch marks compatible cells whose centres fall inside a 10 km occurrence-support cell, so historical corroboration cannot be mistaken for stronger habitat. Occurrence counts do not alter habitat coverage; records outside compatible habitat remain a documented disagreement and unsampled cells are never excluded.
- Habitat reads filter generated, indexed ecology columns on the canonical 250 m cells. These columns are derived from `static_values`, keeping that verified snapshot as the source of truth while avoiding repeated JSON extraction across the full Catalonia grid.
- Predictions expose factor contributions and `modelVersion`, use 24-hour means for dynamic conditions, and are withheld or capped when evidence is incomplete, stale, severely hot/dry, recently frozen, or outside the species season. A recent frost cap applies even when the 24-hour mean is otherwise favorable, with limited tolerance only where the species profile explicitly documents it.
- The version-controlled habitat altitude range is a hard ecological envelope, not a low-weight preference. Cells outside it score zero and are omitted from the painted compatibility overlay, while the underlying verified environmental evidence remains available to the server.

Operational details, rebuild commands, and pipeline schedules are documented in [`supabase/README.md`](../supabase/README.md).
