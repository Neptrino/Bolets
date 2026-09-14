# Cross-channel analytics review — 14 September 2026

Status: dated, read-only review. Recommendations are proposed, not implemented. No campaigns, tracking settings, application code or production services were changed. Evidence describes the periods below, not a causal experiment.

## Decision

Acquisition and useful map activity are growing. Keep prediction-led acquisition and the wider reference. Prioritize map search discovery and the existing Avui/local-guide journey; repair the interpretation of authentication events before treating their ratio as abandonment. Do not restart the completed main Instagram promotion under the existing €0.06-per-follower rule: its native ad detail implies approximately €0.15 per attributed follow.

Do not start another broad performance rewrite or expand the content catalogue solely from these figures. Recent map interaction performance is materially better, and reference visits can succeed without accounts or map interactions.

## Sources, periods and reproducibility

- [Native Search Console](https://search.google.com/search-console/performance/search-analytics?resource_id=sc-domain%3Abolets.app&breakdown=page&metrics=CLICKS%2CIMPRESSIONS%2CCTR%2CPOSITION&num_of_days=7&compare_date=PREV): Web, domain property, no country/device/query/page filters; **6–12 September versus 30 August–5 September**. Dates verified in the date dialog because the comparison chart accessibility label incorrectly said Invalid Date/1970. Top ten page and query rows inspected; this is not a full query/page export. Contextual 28-day snapshot: 16 August–12 September, 680 clicks, 17.5k impressions, 3.9% CTR, position 21.8.
- [SE Ranking project](https://online.seranking.com/admin.site.overview.site_id-12765494.html#/): existing connector reports, project 12765494, engine 1386756, Catalan desktop Spain per the earlier engine identification; current configuration rechecked. Same 169 keyword IDs, daily 5–13 September. No paid checks/audits launched. Project-list endpoint failed, but project-specific configuration and ranking reads succeeded. [Ranking evidence](analytics-review-2026-09-14/rankings.json).
- [Umami](https://analytics.bolets.app/websites/ce97249f-b2de-44bd-899c-56f8fc05cb54): browser login unavailable; used existing authorized SSH access for bounded `BEGIN READ ONLY` PostgreSQL aggregates. **7–13 September versus 31 August–6 September**, midnight boundaries in Europe/Madrid. [Query](analytics-review-2026-09-14/umami.sql), [aggregates](analytics-review-2026-09-14/umami.csv), [journey/performance query](analytics-review-2026-09-14/journeys.sql), [results](analytics-review-2026-09-14/journeys.csv). No identifiers, individual histories, event payloads or private finding data exported.
- [Native Instagram account insights](https://www.instagram.com/accounts/insights/?timeframe=30): Last 30 days preset at inspection; exact calendar endpoints not exposed/verified. Separate completed-ad detail and selected post reports. Do not align these totals to either weekly website window or assume they are organic-only. Meta Business Suite initially opened the standalone Facebook asset, which showed Connect Instagram; native Instagram supplied the relevant account data.

Umami visitors below are distinct analytics session IDs, not verified people. Counts overlap across pages/referrers. Owner/test traffic exclusions were not verified. No cross-system conversion rate is calculated. Autumn demand, promotion, publishing and releases changed together.

## Search: growing, with a clear map discovery gap

| Search Console property metric | Previous week | Latest week |
| --- | ---: | ---: |
| Clicks | 196 | 343 (+75%) |
| Impressions, rounded | 5.34k | 6.96k (+30%) |
| CTR | 3.7% | 4.9% |
| Average position | 21.7 | 16.4 |

| Page | Previous clicks | Latest clicks | Latest impressions | Latest position |
| --- | ---: | ---: | ---: | ---: |
| `/` | 72 | 143 | 1,088 | 18.8 |
| `/zones/ceps` | 32 | 30 | 683 | 15.8 |
| `/bolets-avui` | 8 | 21 | 280 | 16.9 |
| `/temporada` | 7 | 12 | 451 | 54.6 |
| `/map` | 9 | 10 | 159 | 41.3 |
| `/zones/solsones/port-del-comte` | 1 | 10 | 86 | 11.0 |
| `/zones/ripolles` | 0 | 8 | 156 | 6.8 |
| `/zones/ripolles/camprodon/ceps` | 0 | 8 | 81 | 18.7 |
| `/zones/ripolles/setcases/ceps-de-pi` | 5 | 8 | 66 | 8.7 |
| `/normativa-bolets` | 6 | 7 | 107 | 6.5 |

Page and property aggregation differ; do not calculate page shares of property totals. Avui improved from position 34.1 to 16.9 and CTR 6.6% to 7.5%. Ceps remains an acquisition asset, but its weekly clicks are flat, not an accelerating winner. Map search acquisition is flat despite strong on-site usage. Season's 2.7% CTR accompanies an average position of 54.6; that is not evidence of a bad snippet alone.

Disclosed queries include `on trobar bolets avui`: 0→9 clicks, 18→75 impressions, position 52.3→11.1. `bolets app` records 19 clicks versus zero. Brand demand may contribute, but the sampled query table cannot attribute most of the growth or establish an Instagram-to-branded-search causal link.

| Matched SE Ranking keyword | 5 September | 13 September |
| --- | ---: | ---: |
| bolets Catalunya | 16 | 9 |
| temporada de bolets Catalunya | 10 | 2 |
| on trobar bolets avui | 31 | 23 |
| on trobar bolets aquesta setmana | 31 | 27 |
| mapa bolets Catalunya | 43 | 48 |
| mapa bolets avui | 30 | 34 |
| ceps bolets | 17 | 25 |
| bolets de Catalunya | 14 | 51 |
| bolets port del comte | 5 | 7 |
| bolets rasos de peguera | 7 | 8 |

Within the fixed 169-keyword set, top ten positions increased **28→40** and top twenty **56→74**. However, `bolets de Catalunya` dropped from 11 on September 9 to 48–51 thereafter. Native GSC's same phrase improved over its weekly all-device population, so this is a desktop tracking concern to corroborate, not proof of a sitewide collapse. `ceps bolets` switched from the ceps hub to a comparison URL on September 12. The map/today phrases mostly still associate with the homepage rather than their intended destinations. Landing-page history also contains an implausible one-day rank-one `/col-labora` result and a malformed URL with snippet text. Treat those records as vendor-quality concerns; URL switches alone do not prove cannibalization.

**Next:** inspect native GSC query-by-page and device splits for the map cluster and the two declining phrases. Preserve the agreed homepage title/H1. Strengthen descriptive links and useful explanations on existing `/map`, `/bolets-avui` and ceps destinations only where the audit finds gaps. Do not duplicate September 9/14 navigation and explanatory work. Use the existing 28-day, position-matched CTR criteria before rewriting snippets; do not mass-create or prune local pages.

## Website: growth is reaching useful interactions

| Umami measure | Previous week | Latest week |
| --- | ---: | ---: |
| Visitors with pageviews | 662 | 1,100 (+66%) |
| Visits with pageviews | 848 | 1,425 (+68%) |
| Pageviews | 3,430 | 6,017 (+75%) |
| Mobile visitors | 559 | 951 (86% of latest total) |
| `/map` visitors | 308 | 550 |
| `/bolets-avui` visitors | 284 | 524 |
| `/bolets` visitors | 50 | 113 |
| Visitors with a map-cell click | 262 | 417 |
| Visitors using timeline | 58 | 162 |
| Visitors recording species-map-open | 10 | 65 |
| Visitors recording user-signup | 11 | 15 |
| Visitors recording finding-added | 1 | 2 |

Species-map-open is shared by species profiles and local guides. It is not an exclusive species-profile funnel. Event occurrences are much larger than visitor counts: 9,141 cell clicks do not mean 9,141 people or successful outings. Recent instrumentation/UI changes prevent attribution of event growth to a single feature.

First observed pageview referrer within each visit gives a more useful channel comparison than summing referral rows:

| Latest week entry source | Visits | Included map route | Included cell click | Included timeline |
| --- | ---: | ---: | ---: | ---: |
| Instagram | 388 | 232 (60%) | 139 (36%) | 86 (22%) |
| Google | 362 | 200 (55%) | 117 (32%) | 34 (9%) |
| Other/direct/unknown | 675 | 447 (66%) | 273 (40%) | 59 (9%) |

Instagram-entry visits increased from 195, Google-entry visits from 201. These rows describe actions within visits, not paid-ad attribution or ordered conversion funnels. A visit can span the weekly boundary; entry means its first observed pageview within that window. Instagram deserves attention as a useful website channel, even though the paid follower economics fail the earlier target.

### Authentication measurement needs correction

The latest window has 27 visitor IDs recording signup-started and 15 recording user-signup. **15/27 is not a valid signup conversion rate.** Source inspection shows signup-started fires after requesting an email code or initiating Google OAuth, including returning users; user-signup is restricted to new-account detection. Passkey sign-in uses neither start event. Events can also queue offline and flush later, so delivery timing is not exact action timing.

The same-visit ordered counts in the evidence (for example, 11 Instagram-entry visits with a start and two with a later new-account event) are descriptive only. They do not establish nine abandoned registrations. Authentication can complete in another visit/browser, and successful returning-user login does not produce user-signup.

**Next:** define neutral allowlisted authentication-start/completion measures with matching semantics and explicit new-account reporting. Preserve private-route exclusions, neutral event paths and the prohibition on account IDs, saved species/territories or finding details in telemetry. Then establish a fresh baseline and inspect mobile email/OAuth continuity. Keep contextual saving in the existing roadmap; do not infer demand for email alerts from two finding events.

### Performance work is showing useful results

Across `/map` and descendant routes, daily p75 INP was **656 ms (150 samples) on September 7**, **792 ms (166) on September 8**, then **168, 144, 160, 144 and 132 ms** on September 9–13 (171–378 observations/day). This supports retaining recent work, without isolating its causal effect. LCP p75 on September 13 was 1,818 ms from 75 samples. Different metrics have different denominators; these are not equivalent to CrUX's rolling field report or a completed-map readiness measurement. Review the new baseline after a full stable week before another broad rewrite; target reproduced mobile faults and remaining startup waits.

## Instagram: useful referral channel, expensive paid follows, limited evidence of organic discovery

Native account snapshot: **852 followers**, **71,790 views**, **18,160 viewers**, **961 interactions**, **381 accounts engaged**, **3,014 profile visits** and **772 external link taps**. The Last 30 days report shows 59.8% of views from non-followers but only 27.9% of interactions. Posts contribute 59.7% of interactions, Reels 21.9%, Stories 18.4%. These shares are not normalized for content volume, age or promotion, and the account scope is not verified organic-only.

### Correct the paid-growth assumption

Ad tools lists two completed promotions: September 7, **€7.57** spent; September 10, **€58.79** spent. Visible combined spend is **€66.36**, not a reconciled account invoice total or proof of no other commitments.

The [main ad detail](https://www.instagram.com/insights/media/3979083544433327106/1329979073526014/) explicitly reports an Ad overview: 24,837 views, reach 18,165, 1,657 profile visits, 389 external link taps and **389 follows**. Spend divided by attributed follows is **€0.151**. This exceeds the playbook's **€0.06** stop threshold by about 2.5×. The list reports 1,903 profile visits versus 1,657 in detail; retain the discrepancy and use the detailed attributed follower metric for this decision. Neither value supports substituting profile-visit cost for follower cost.

Both displayed ads are completed. Recommendation: leave the main promotion stopped under the existing rule and reconcile other campaigns/billing before any new allocation. €133.64 is merely €200 minus visible spend, not an approved or fully reconciled remaining budget. The earlier €0.05–0.06 follower estimate and linear growth scenario are not supported by this completed-ad detail. This does not negate the ad's external-link traffic value; it means follower acquisition and website acquisition need separate objectives.

### Content serves existing followers better than it proves discovery

Two high-view carousels were inspected, with artwork visually identified:

| Content | Views | Non-follower view share | External taps | Follows | Saves / shares |
| --- | ---: | ---: | ---: | ---: | ---: |
| September 7, “Abans d’anar al bosc, mira aquestes 3 coses” map-reading carousel | 1,714 | 14% | 11 | 1 | 0 / 0 |
| September 10, basket photograph / spring-memory carousel | 1,363 | 1.5% | 4 | 0 | 1 / 0 |

Sources: [map-reading carousel](https://www.instagram.com/insights/media/3980858146050952996/), [basket carousel](https://www.instagram.com/insights/media/3982977939197856429/). Each reports 33 interactions, though detailed components do not fully reconcile to that headline; retain the platform figures without inventing missing interactions. Neither report showed an ad breakdown. Counts are lifetime/current report observations for posts of different ages, not a controlled test.

The map explainer provides some site actions; the basket photo largely reaches existing followers. That is compatible with community value, but neither demonstrates a strong organic acquisition engine. Do not retire photos or illustrated lessons from two samples, and do not claim Reels lose without watch-time/completion and matched exposure data.

**Next:** give existing community/educational content an engagement role and test acquisition pieces separately. Compare a practical current-condition hook, a field observation and an educational hook at the same seven-day age, recording non-follower reach, saves/shares, follows and external taps, with promotion labelled. Use existing queued material and approved visual guidance; prepare no extra volume merely to chase views. Obtain Reel retention data before changing length or pacing. No new posts or ads were created in this review.

## Prioritized next work

| Priority | Work | Decision / success evidence |
| --- | --- | --- |
| 1 | Leave completed main boost stopped; reconcile paid attribution and spend | Respect existing €0.06 follower rule and €200 ceiling; choose a distinct website objective only through a new bounded decision |
| 2 | Correct authentication measurement semantics | Matching start/completion population, privacy-safe events, fresh stable baseline; no invented abandonment rate |
| 3 | Diagnose map search ownership and two declining tracked phrases | Native query×page×device corroboration, correct canonical/indexability and useful internal links; trend in impressions/clicks on intended destinations |
| 4 | Improve the existing Avui/local-guide→map journey where still needed | Preserve species/territory continuity, mobile usability and independently useful reference pages; assess visit-level map actions and user task completion |
| 5 | Run a small organic content comparison using planned material | Equal-age non-follower reach, meaningful engagement and external taps; keep community and acquisition roles distinct |

Use the next complete week to review stable measurements. That is a suggested checkpoint, not a created automation. Recent code/release changes and early-autumn conditions prevent strong causal claims. User interviews/usability checks are still needed for why people do or do not save, return or contribute.
