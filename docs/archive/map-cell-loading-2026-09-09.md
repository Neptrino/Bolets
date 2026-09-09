# Map-cell loading check, 9 September 2026

Dated performance evidence. The [VPS runbook](../../deploy/vps/README.md#response-latency-and-cache-maintenance) owns the current operating guidance. [Measurements and parity hashes](map-cell-loading-2026-09-09.json) accompany this report.

## Observed delay

Thirty minutes of privacy-filtered public map-data logs contained 614 requests: median 19 ms, p95 1,360 ms, maximum 8,083 ms. Forty-three requests exceeded one second; 611 returned 200, two redirected and one returned 503. These aggregate timings do not identify a user's viewport and include differing map views and background warming.

A browser reload of the cep map recorded LCP 283 ms, TTFB 144 ms and CLS 0. Its cell data were already cached, so this does not establish cold-map latency. Direct authenticated environment reads measured 0.55–0.95 seconds for a 108-cell 250 m bucket, 0.85–1.00 seconds for 108 cells at 1 km and 1.54–1.58 seconds for 327 cells at 2.5 km. These include upstream work and transfer, without the Next.js response cache.

## Focused changes

The temperature sampler previously constructed detailed donor objects and normalized weights for every hour of every map cell, although production only needs the interpolated temperature and donor count. Index readings by station and numeric hour, prepare each target's donor adjustments once and allow production to skip detailed donor allocation. Diagnostics retain the detailed path and both paths use the same arithmetic and eligibility rules.

In a local replay of the same 327 live cells, the thermal calculation's steady iterations fell from 120–128 ms to 27–28 ms; the initial iterations were 159 ms and 52 ms. All serialized corrected values were byte-identical. Loading immutable thermal inputs still took roughly 0.4 seconds over the remote database connection, and the environment SQL read roughly 0.26 seconds. The calculation speedup is therefore not a claim of a fourfold improvement in end-to-end loading.

Current-map server caches also share simultaneous cold computations for the same semantic bucket. Identity includes the species, resolution and existing model/publication fields; different keys remain separate, and failures release the pending entry for a retry. Freshness, authorization, scientific inputs and scores are unchanged.

## Verification

The complete 4,816-cell frozen boundary replay matches every prior candidate cell and summary. The 327 live-cell serialized outputs also match exactly. Focused tests cover compact/detailed interpolation parity, missing support, simultaneous cold requests, distinct resolutions and retry after a failed computation. The release gates include the full suite, type checks, lint/source-size checks, the production build and the Edge Function type check.

Cold first visits still require environment reads. The measured fixes reduce avoidable computation and duplicate concurrent work; they do not claim to eliminate network delays or diagnose every possible panning delay.
