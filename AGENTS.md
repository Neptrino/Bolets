# Repository Guidance

## Engineering principles

- Prefer existing standard components, utilities, and project patterns before creating custom abstractions.
- Follow best practices for accessibility, maintainability, performance, security, responsive behavior, and clear naming.
- Keep changes focused and avoid unnecessary dependencies or unrelated refactors.
- Preserve the single source of truth for species ecology and prediction-model configuration.
- Build standard light content pages with `PageShell`, `PageHeader`, and `SectionHeader`; extend their narrow layout/tone variants instead of adding page-specific title, gutter, or vertical-spacing rules. Keep full-bleed home, species, map, method, and territorial heroes explicit when their composition is genuinely different.
- Document important architectural decisions and update this file when project conventions change.

## Testing and verification

- Write unit tests whenever practical, especially for schemas, scoring logic, data adapters, and reusable utilities.
- Add integration or end-to-end coverage for critical user flows and external-data boundaries when appropriate.
- After meaningful changes, run the relevant tests, type checks, linting, and build checks.
- Do not consider a change complete until failures are investigated or explicitly documented.

## Performance and optimization

- Perform periodic optimization reviews using measurements, profiling, or bundle analysis.
- Avoid premature optimization; prioritize user-visible bottlenecks and evidence-based improvements.
- Keep server-rendered content lightweight and isolate interactive client-side behavior to the components that need it.

## Project-specific architecture

- Keep species knowledge profiles in version-controlled, validated data files.
- Ensure the prediction engine consumes the same ecological configuration used by species pages.
- When an accepted profile name differs from a provider-indexed synonym, keep the accepted name in the catalogue and map the provider query name explicitly at the ingestion boundary.
- Keep `/zones` as the broad prediction-region directory and `/guies` as the curated local-guide hub. Existing local-guide detail URLs remain under `/zones/...` until an explicit redirect-backed URL migration is planned.
- Clip ecological and prediction grids to the version-controlled ICGC Catalonia land boundary before rendering.
- Keep Supabase access server-side and protect database boundaries appropriately.
- Treat external environmental data as normalized, timestamped snapshots with provenance and uncertainty.
- Do not expose exact sensitive ecological locations in public maps or interfaces.
- Treat occurrence datasets as presence-only corroboration, never absence evidence or a direct suitability-score input. Generalize them to at least 10 km before storage, retain dataset DOI/licence/provenance, and deduplicate sources by their GBIF dataset key.
- Build species-page potential-habitat maps from verified 250 m static cells using hard forest and soil gates plus the shared altitude envelope from the versioned species ecology; aggregate compatible-cell coverage for coarser zoom levels and keep this layer separate from current fruiting predictions.

## Environmental pipeline conventions

- Ingest regional and cell weather through authenticated Supabase Edge Functions; never call providers directly from the browser.
- Import 250 m static terrain, land-cover, and soil evidence only through the service-role importer with source and verification metadata.
- Treat ICGC 1:50,000 geological units as display-only contextual evidence: store their mapped coverage and provenance separately from soil scoring inputs, never interpret map scale as metre resolution, and aggregate coarse geology area-weightedly from canonical 250 m cells.
- Calculate suitability on the Next.js server with the same versioned species ecology used by profile pages.
- Withhold a suitability score when required static evidence is unverified, dynamic inputs are stale, or model completeness is below the publication threshold.
- Treat each species' version-controlled habitat altitude range as its ecological core: score 100 through the interior, taper linearly to 75 during the 100 m inside either documented limit, and decline linearly to zero across the 100 m outer uncertainty margin. Cells at or beyond the margin's zero-score edge must not be painted as compatible.
- Preserve sampled land-cover fractions in every imported 250 m cell and feed predictions the linear percentage of exact cover/altitude/pH-compatible coverage used by the habitat map. Zero compatible coverage and inactive seasonality score zero; do not infer coarse compatibility from a union of labels or promote a partial matching cover to 100%.
- Weight distribution-map blue intensity by the shared altitude edge taper, but retain the raw exact compatible-cover percentage for the prediction habitat factor so altitude is not counted twice.
- For coarse predictions, derive the altitude factor inside compatible habitat as `sum(coverage × altitude taper) / sum(coverage)` from canonical 250 m cells; never score the arithmetic mean elevation of a mixed parent cell. For every prediction cell, blend its score-band colour with the zero-score colour by the exact raw compatible-cover fraction so neither base nor zoomed-out cells overstate sparse habitat.
- Preserve 3/7/30-day rain and ET₀, days 8–30 rain, dry-spell length, and 7-day shallow-soil moisture memory end to end; do not publish rainfall suitability from a 7-day accumulation alone.
- Record provider state in `pipeline_sources` and every ingestion attempt in `ingestion_runs` so degraded and blocked sources remain visible.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
