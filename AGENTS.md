# Repository Guidance

## Engineering principles

- Prefer existing standard components, utilities, and project patterns before creating custom abstractions.
- Follow best practices for accessibility, maintainability, performance, security, responsive behavior, and clear naming.
- Keep changes focused and avoid unnecessary dependencies or unrelated refactors.
- Preserve the single source of truth for species ecology and prediction-model configuration.
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
- Clip ecological and prediction grids to the version-controlled ICGC Catalonia land boundary before rendering.
- Keep Supabase access server-side and protect database boundaries appropriately.
- Treat external environmental data as normalized, timestamped snapshots with provenance and uncertainty.
- Do not expose exact sensitive ecological locations in public maps or interfaces.
- Treat occurrence datasets as presence-only corroboration, never absence evidence or a direct suitability-score input. Generalize them to at least 10 km before storage, retain dataset DOI/licence/provenance, and deduplicate sources by their GBIF dataset key.
- Build species-page potential-habitat maps from verified 250 m static cells using hard forest, altitude, and soil gates from the versioned species ecology; aggregate compatible-cell coverage for coarser zoom levels and keep this layer separate from current fruiting predictions.

## Environmental pipeline conventions

- Ingest regional and cell weather through authenticated Supabase Edge Functions; never call providers directly from the browser.
- Import 250 m static terrain, land-cover, and soil evidence only through the service-role importer with source and verification metadata.
- Calculate suitability on the Next.js server with the same versioned species ecology used by profile pages.
- Withhold a suitability score when required static evidence is unverified, dynamic inputs are stale, or model completeness is below the publication threshold.
- Treat each species' version-controlled habitat altitude range as a hard ecological envelope; cells outside it score zero and must not be painted as compatible.
- Record provider state in `pipeline_sources` and every ingestion attempt in `ingestion_runs` so degraded and blocked sources remain visible.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
