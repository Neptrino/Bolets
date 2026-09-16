# Navigation diagnostic follow-up — 16 September 2026

Follow-up to the [evening latency investigation](evening-latency-2026-09-15.md).
Added `scripts/diagnose-navigation.mjs`, a bounded read-only synthetic probe of
the homepage, guides hub and map. It records navigation DNS, connection, TLS,
request-to-first-byte and download durations, protocol and worker-control state.
It uses isolated contexts, DNT and fixed public paths; no visitor identifiers,
credentials, private URLs, query strings or raw HARs are retained.

The final run used macOS, Firefox 153 and Chromium 151, unthrottled on the local
network: two trials × three routes × first/returning visit × two browsers = 24
successful HTTP 200 navigations. All 12 returning visits were service-worker
controlled. No 21–42 second delay reproduced. Firefox first visits negotiated
HTTP/3 and Chromium first visits HTTP/2. This does not reproduce the affected
Windows environment or establish that either protocol caused the incident.
[Full synthetic results](navigation-diagnostic-2026-09-16.json).

An earlier exploratory run reloaded before worker activation; it was superseded
by the final probe's explicit readiness wait. Synthetic first contexts do not
guarantee a cold DNS resolver or cold CDN. Do not confuse these TTFB numbers with
LCP or completed map-data readiness. Worker interception obscures some network
phases, and Firefox timing quantization produced a few slightly negative fields.

Cloudflare dashboard inspection reached its sign-in page. No authenticated edge
history was available, so edge telemetry and configuration were not inspected or
changed. The existing Umami fields cannot retroactively recover connection
phases. The next diagnostic is this probe or a network trace on affected Windows
Firefox/network, paired with authenticated Cloudflare telemetry if available.
No live analytics instrumentation, product behavior or protocol setting changed.
Syntax and focused ESLint checks passed; the probe completed against production.
