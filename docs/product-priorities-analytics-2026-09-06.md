# Product priorities checked against analytics — 6 September 2026

## Decision

Prioritize the existing **ceps/local guide → current map → saved territory** journey. Preserve direct map access. Improve discovery of the existing Avui page for current-condition searches. Treat territory grouping and a different homepage primary action as usability hypotheses; defer a newsletter/alert system until there is evidence of demand and repeat use.

This revises the earlier recommendation to make Avui the main homepage destination immediately. The data supports the planning use case, but the map is already the most visited individual path in the measured complete week.

## Sources and periods

- **SE Ranking:** connected project 12765494; daily position snapshot **5 September 2026**, engine 1386756 = Google Spain, Catalan language, desktop. Matched the same keyword IDs and date for Bolets, Boletada, Trobarbolets and Va de Bolets. The engine catalogue confirmed the engine identity. Read existing reports; no ranking checks or audits were launched.
- **Native Search Console:** domain property `sc-domain:bolets.app`, Web search, **28-day selector**, no country/device/query/page filters. The available chart series runs **11 August–4 September 2026**. Read all 179 page rows and all 290 disclosed query rows. [Performance report](https://search.google.com/search-console/performance/search-analytics?resource_id=sc-domain%3Abolets.app&num_of_days=28&breakdown=page&metrics=CLICKS%2CIMPRESSIONS%2CCTR%2CPOSITION).
- **Umami:** Bolets website `ce97249f-b2de-44bd-899c-56f8fc05cb54`, custom complete week **29 August–4 September 2026**, selected through the browser calendar in the local Europe/Madrid timezone. [Traffic](https://analytics.bolets.app/websites/ce97249f-b2de-44bd-899c-56f8fc05cb54?date=range%3A1787954400000%3A1788559199999), [events](https://analytics.bolets.app/websites/ce97249f-b2de-44bd-899c-56f8fc05cb54/events?date=range%3A1787954400000%3A1788559199999), [funnels](https://analytics.bolets.app/websites/ce97249f-b2de-44bd-899c-56f8fc05cb54/funnels?date=range%3A1787954400000%3A1788559199999).

The sources measure different populations and periods. No cross-system conversion rate is calculated. No application, account, tracking, subscription or deployment settings were changed.

## 1. Search competition is strongest on our central planning queries

Positions below are one matched desktop snapshot, not universal Google positions or an estimate of competitor traffic.

| Query | Bolets | Boletada | Trobarbolets | Va de Bolets | SE Ranking estimated monthly volume, Bolets engine |
|---|---:|---:|---:|---:|---:|
| mapa bolets Catalunya | 43 | 71 | 5 | 2 | 170 |
| mapa bolets avui | 30 | 57 | 22 | — | 10 |
| on trobar bolets avui | 31 | 77 | 75 | 1 | 140 |
| on trobar bolets aquesta setmana | 31 | 81 | 79 | 1 | 140 |
| ceps bolets | 17 | — | — | — | 880 |
| bolets port del comte | 5 | — | — | — | 10 |
| bolets rasos de peguera | 7 | — | — | — | 10 |

An em dash means not reported here as a usable positive rank; it is not zero traffic or proof of absence. Competitor responses use 100 as a boundary/default value in multiple rows, often with a null URL, while own-site responses use 0. Do not rank those values as ordinary measured positions. Va de Bolets' `mapa bolets avui` result was not selected for this table. Volumes are vendor estimates and overlapping phrases must not be added as unique demand.

Bolets has 28 of the 169 tracked Catalan desktop keywords in positions 1–10 and 56 in positions 1–20. The tracked universe has expanded since earlier reports, so these counts are not a like-for-like growth comparison.

The separate **Google Mobile Catalonia** engine (1391820) reports `bolets port del comte` at 5 and `ceps bolets` at 15. Core map/today queries return 0 for Bolets and 100/null for the sampled competitor, with missing results metadata. That mobile sample is insufficient to reproduce the desktop competitive comparison; it is excluded from the table.

**Implication:** Boletada is not the leading measured SEO threat on these terms. Va de Bolets and Trobarbolets deserve more attention. Feature breadth does not establish acquisition strength.

## 2. Search Console favors the existing ceps and local-guide content

Property totals: **309 clicks, approximately 9.88k impressions, 3.1% CTR and average position 25.9**.

| Page | Clicks | Impressions | CTR | Average position |
|---|---:|---:|---:|---:|
| `/` | 81 | 969 | 8.4% | 40.0 |
| `/zones/ceps` | 59 | 1,002 | 5.9% | 14.1 |
| `/map` | 13 | 175 | 7.4% | 38.9 |
| `/zones/solsones/port-del-comte/ceps` | 10 | 84 | 11.9% | 23.3 |
| `/zones/bergueda/rasos-de-peguera/ceps` | 6 | 63 | 9.5% | 6.0 |
| `/bolets-avui` | 5 | 180 | 2.8% | 53.4 |
| `/zones/cerdanya/bellver-de-cerdanya/ceps-de-pi` | 5 | 101 | 5.0% | 30.2 |
| `/zones/ripolles/setcases/ceps-de-pi` | 5 | 48 | 10.4% | 6.6 |
| `/bolets` | 8 | 1,428 | 0.6% | 70.2 |

The 179 page rows sum to 314 clicks and 16,630 impressions; the `/zones/` rows sum to 142 clicks. These page aggregates differ from the property totals and must not be divided into property totals as if the units matched. The low catalogue CTR accompanies low average ranking; it is not evidence that its snippet alone is the problem.

The 290 disclosed query rows account for only **26 clicks**, versus 309 property clicks. They cannot classify most acquisition. The SE Ranking connected-GSC feed matched the sampled native query figures, but native Search Console establishes the period and filters.

Selected disclosed queries: `mapa bolets catalunya` has 60 impressions, zero clicks and average position 47.4; `on trobar bolets avui` has 48, zero and 70.1; `on trobar bolets aquesta setmana` has 31, zero and 69.6. Conversely, `on trobar ceps a catalunya` has 17 impressions, one click and average position 4.6. These period averages must not be compared directly with a single day's tracked positions as proof of a specific release's impact.

**Implication:** improve existing ceps/local pages and their useful next steps first. Strengthen Avui's search discovery, but do not abandon pages already acquiring relevant visitors.

## 3. Umami shows substantial map use and a small contribution funnel

Complete-week traffic: **424 visitors, 576 visits, approximately 2.44k views, 37% bounce rate and 5m 3s displayed visit duration**. These are analytics identifiers/measurements, not a verified count of distinct people. No owner/test-traffic exclusion was verified.

| Path | Reported visitors to path | Reported entry-page visitors |
|---|---:|---:|
| `/map` | 218 | 120 |
| `/` | 120 | 106 |
| `/bolets-avui` | 92 | 29 |
| `/map/cep` | 86 | 29 |
| `/zones/ceps` | 61 | 42 |
| `/bolets` | 38 | 7 |
| `/troballes` | 35 | 7 |

Path visitors overlap and must not be summed as distinct people. Google.com is the largest listed referrer at 192 visitors; its displayed 91% is a share of the listed referral distribution, not of all 424 visitors. Mobile accounts for **325 visitors, 77%**; laptop 83, desktop 15 and tablet one.

| Event | Recorded occurrences |
|---|---:|
| map-cell-click | approximately 2.42k |
| map-geolocation-success | 273 |
| map-change-species | 76 |
| homepage-map-cta-click | 39 |
| map-timeline-used | 31 |
| signup-started | 14 |
| user-signup | 7 |
| finding-draft-saved | 6 |
| finding-added | 6 |
| species-map-open | 3 |

The existing **signup funnel** reports 12 visitors starting and seven completing, **58%**. The saved-draft→published-finding funnel reports two visitors at each step; the app-install funnel reports three starters and one completion. These are small, report-defined sequences, not whole-product success rates. Repeated event occurrences differ from funnel visitor counts.

Instrumentation changed during the window: repository commits added analytics on 29 August, expanded tracking on 30 August, added install tracking on 1 September and timeline changes on 2 September. Commit dates are not verified production activation times. Do not interpret low counts, mismatched stages or week-over-week event growth as stable conversion evidence.

A separate rolling 24-hour snapshot on 6 September showed 83 Instagram-referrer visitors versus two in the earlier complete week. This signals a recent channel change worth following, but the windows are not comparable and advertising/campaign attribution was not checked.

**Implication:** protect direct map access and focus usability on mobile. Contextual save actions are a sensible experiment, but these reports do not establish why visitors do or do not register, nor prove demand for email alerts.

## Homepage card SEO follow-up

Rechecked the existing SE Ranking keyword targets and 6 September desktop positions through the same project and engine. The assigned destinations still match the 1 September keyword plan:

| Search intent | Intended destination | 6 September tracked position, selected query |
|---|---|---:|
| Broad Catalonia reference | `/` | `bolets de Catalunya`: 14 |
| Current conditions and where to go | `/bolets-avui` | `on trobar bolets avui`: 28; `on trobar bolets aquesta setmana`: 31 |
| Map and prediction | `/map` | `mapa bolets Catalunya`: 47; `mapa bolets avui`: 34 |

These ranks describe the domain's reported results, not confirmation that every intended destination ranks. Landing-page history still associates the homepage with several map/current queries; the weekly query records `/bolets-avui` on 5 September. This supports clearer contextual routing, but does not prove keyword cannibalization or that changing button prominence improves rankings. The connected GSC query feed again returned the selected figures above; it does not expose its date range, so the earlier native report remains the evidence for period and filters.

Keep the agreed homepage title/H1 unchanged. Use the section heading “Bolets avui: condicions per territori” and explain the current comparison in plain language: “Consulta les condicions actuals a Catalunya i compara zones i espècies abans de sortir al bosc.” The card’s “Bolets avui” action and preview lead to `/bolets-avui`. Its repeated map action was removed because the hero already provides the descriptive “Mapa de bolets” link to `/map`. The full “On trobar bolets avui i aquesta setmana” page title remains on the overview.

Both actions are server-rendered anchors with real destinations. The surrounding text explains the short labels, consistent with [Google's link guidance](https://developers.google.com/search/docs/crawling-indexing/links-crawlable). Removing the image footer removes a repeated link while retaining the primary link, linked preview, simulation badge and map attribution. [Google's title guidance](https://developers.google.com/search/docs/appearance/title-link) supports a clear descriptive main heading; it does not establish a ranking benefit from either CTA style. Measure search performance by destination and query cluster after any future release; these local edits cannot have affected the observed rankings.

## Revised priorities

1. **Ceps/local-guide → map:** prioritize `/zones/ceps`, Port del Comte, Rasos de Peguera, Setcases and Bellver. Surface the matching current reading and preserve species/territory in map links. Existing 6 September content work already addresses part of this; verify its release state before proposing duplicate work.
2. **Map/reading → save:** test an explicit “Desa aquesta zona a El meu bosc” action with a useful benefit and selection preserved through sign-in. Check the existing signup journey on mobile. Preserve current owner-scoped species/territory preferences rather than creating a parallel saved-location model.
3. **Search acquisition for current conditions:** improve the existing `/map` and `/bolets-avui` destinations, their contextual internal links and independently useful explanations. Verify current indexed/canonical URLs before further edits. No duplicate weekend landing page or ranking guarantee is proposed.
4. **Avui comparison clarity:** usability-test grouping repeated territories and explaining best-sector score versus favourable-area extent. Keep direct map access; the dashboard does not justify a compulsory detour through Avui.
5. **Measurement before retention infrastructure:** establish a stable event baseline and ask actual users about saved-zone updates before building a digest. Historical trend alerts require comparable stored readings. Existing privacy rules exclude private browsing context and sensitive payloads; retain them.

## What remains unproven

- Whether a new homepage primary action improves completed planning tasks.
- Whether repeated territory rows confuse visitors.
- Why five of the 12 measured signup starters did not appear as completions.
- Demand for a weekly email, reliable retention rates, or prediction superiority.
- Whether any recent release caused the observed search/traffic movements.

The original analytics check was read-only. The homepage card follow-up was implemented locally at the user's request; no deployment, external communication or recurring monitor was introduced.
