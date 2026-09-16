# Cloudflare incident-window review — 16 September 2026

Read-only follow-up after the user restored dashboard access. Complements the
[evening visitor latency investigation](evening-latency-2026-09-15.md) and
[synthetic navigation diagnostics](navigation-diagnostic-2026-09-16.md).
No configuration, subscriptions, rules or analytics collection changed.

## Observed dashboard evidence

The Bolets zone is on the Free plan. Security → Analytics → Traffic was set to
**15 September 22:00 through 16 September 00:00 CEST**. The UI encoded that as
`date-from=2026.09.15-2000&date-to=2026.09.15-2200` (UTC).

- All-browser traffic view displayed approximately 4.02k requests, 686 served
  by Cloudflare and 3.34k by origin. These are dashboard values, not the origin
  log request counts or Umami pageviews.
- Security services/actions displayed no data and no mitigated series was
  shown for this window. There is no recorded block/challenge explaining the
  visitor delays in this view; sampling prevents treating this as exhaustive.
- Filtering Source browser equals Firefox returned only two sampled requests,
  at 22:08:14 and 23:31:19 CEST. Neither matched the four affected page/time
  combinations recorded in Umami. One was desktop/Windows and the other mobile/
  Android. They must not be identified as the affected sessions.
- The expanded sample showed mitigation, cache status and request attributes,
  but no response-duration, DNS, connection or TLS timing. No visitor IPs or raw
  user-agent records were copied into repository evidence.
- The standard Analytics → Performance page showed protocol/bandwidth breakdowns
  and directed origin performance to the Argo section. Those aggregates do not
  resolve a particular visitor's first-byte delay. No paid feature was enabled.

Source: [filtered Cloudflare traffic view](https://dash.cloudflare.com/f24bbe7f0c789944a90c8a6d05cb2f8d/bolets.app/security/analytics?browser=Firefox&date-from=2026.09.15-2000&date-to=2026.09.15-2200).

## Conclusion

Authentication is no longer the blocker; the inspected dashboard's sampling and
missing timing fields are. It provides no evidence supporting a security-rule,
HTTP/3 or cache change, but it also cannot clear Cloudflare of involvement in
the four slow loads. Fast origin responses plus high browser TTFB still leave
the client/network/edge path unresolved. Use the existing diagnostic on affected
Windows Firefox/network, or capture navigation timing during a recurrence,
before selecting a mitigation. A global protocol change is not justified by
these observations.
