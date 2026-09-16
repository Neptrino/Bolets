# Evening latency — 15 September 2026

Read-only investigation on 16 September following the user's observation of slow analytics around 22:00. All table times are Europe/Madrid (UTC+2). Source: bounded read-only aggregates from Umami's `website_event` joined to `session`, website `ce97249f-b2de-44bd-899c-56f8fc05cb54`; sanitized Caddy and Edge container logs for 20:00–22:00 UTC; deployment history and container state. No individual identifiers, IPs or private histories exported. No production changes made.

## Confirmed visitor delays

| Recorded hour | LCP samples | p75 LCP | Maximum LCP | TTFB samples | p75 TTFB |
| --- | ---: | ---: | ---: | ---: | ---: |
| 21:00 | 16 | 1.210 s | 2.124 s | 19 | 0.539 s |
| 22:00 | 6 | 16.337 s | 42.554 s | 7 | 11.143 s |
| 23:00 | 9 | 1.636 s | 41.913 s | 9 | 0.501 s |

Do not subtract independently aggregated percentiles: metric denominators differ. The four slow LCP samples in the 22:00–00:00 window also contain a slow TTFB on the same event:

| Recorded minute | Public page | LCP | TTFB |
| --- | --- | ---: | ---: |
| 22:28 | `/guies` | 21.232 s | 21.148 s |
| 22:58 | `/` | 42.554 s | 42.410 s |
| 23:14 | `/` | 21.625 s | 21.528 s |
| 23:16 | `/map` | 41.913 s | 41.821 s |

All four belong to two Firefox / Windows 10 laptop sessions. The other 11 LCP samples in that two-hour interval had no LCP over four seconds. Session identifiers are not exported. Across the full day Firefox had eight LCP samples, five over four seconds in three sessions; on 14 September it had five samples and none over four seconds. This is a small browser-associated cluster, not proof of a Firefox implementation bug or a site-wide outage. Event recording time is not an exact origin request correlation key.

## Origin evidence

Caddy's retained public timing records for 22:00–00:00 contained:

| Route group | Requests | Maximum total origin duration |
| --- | ---: | ---: |
| home | 36 | 89 ms |
| map | 70 | 114 ms |
| current | 11 | 135 ms |
| species | 316 | 199 ms |
| territory | 76 | 176 ms |
| map-data | 1,393 | 952 ms |
| field-card | 13 | 571 ms |
| static | 39 | 49 ms |

No recorded request exceeded two seconds or returned 5xx. Caddy logs cover origin work, not browser connection establishment or Cloudflare delays; they exclude DNT/private requests and do not provide session-level correlation. The guides hub has no separate group in this output. This evidence argues against a broad origin processing stall but cannot prove where a particular visitor waited.

The app started at 09:30:39 local time, with zero recorded container restarts and `OOMKilled=false`. The latest Actions deployment completed at 09:31, not during the incident. Application logs returned no lines in the inspected 21:45–00:15 interval. Edge logs had one CPU-time matching line at 23:47, after the four slow samples; it does not explain their timing and was not established as a failed request.

## Assessment and next step

The slowdown was real for these samples, predominantly before first response byte. The prior [morning spot check](performance-spot-check-2026-09-15.md) did not investigate this later incident and cannot rule it out. There is no basis here to blame images, CSS, map scoring or the SEO release.

Browser/network/Cloudflare connection delays are plausible given the Firefox concentration and fast recorded origin responses, but the cause remains unresolved. Umami's retained metrics do not break TTFB into DNS, TCP/TLS, edge and service-worker phases. The useful next diagnostic is a reproduction in Firefox on Windows, ideally on the affected network, recording navigation timing and a network waterfall; alternatively inspect available Cloudflare incident-window telemetry for connection/origin timing differences. Do not change caching, disable HTTP/3 or rewrite the frontend without that evidence. No monitoring automation was created.
