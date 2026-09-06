# Bolets performance dashboard

Live dashboard: https://grafana.bolets.app/d/bolets-performance/bolets-performance

`bolets-performance.json` is the portable classic Grafana dashboard definition.
It contains no credentials or observed request data. It is scoped to the existing
`bolets-vps-1` telemetry instance and refreshes every minute.

To restore or install it, open Grafana **Dashboards → New → Import**, upload the
JSON or paste its contents, then choose:

- **DS_PROMETHEUS**: `grafanacloud-rubystingray1626-prom`
- **DS_LOKI**: `grafanacloud-rubystingray1626-logs`

The stable UID is `bolets-performance`. Importing over an existing dashboard
updates that dashboard; use a different UID for a separate copy.

The 16 panels cover runtime collection, event-loop delay and utilization,
application and host memory, host CPU, public response duration and upstream
first-byte p95, measured request rate, 5xx counts, telemetry freshness, and
sanitized slow-request logs. Use **Public route** to narrow the response charts
and logs; process and host metrics remain global.

After enabling Cloudflare, these are origin measurements: edge cache hits do
not reach Caddy. Proxy durations include transfer to Cloudflare, not necessarily
the visitor. Use Cloudflare Cache Analytics for edge traffic and hits.
These are not browser page-load times.
Log panels cover only the instrumented public subset, excluding private routes,
Do Not Track and private referrers. Direct static responses do not have upstream
application timing. Empty panels mean no matching samples, not zero latency or
proof of health. The event-loop sampler has an idle baseline near 20 ms.

Verified against live Grafana on 2026-09-05: both scrape-health series reported
1; runtime and host charts showed values; route p95 and rate queries returned
series; the slow-request log panel returned sanitized records; no 5xx records
matched the sampled interval. No new collector or application deployment is
required to use this dashboard.
