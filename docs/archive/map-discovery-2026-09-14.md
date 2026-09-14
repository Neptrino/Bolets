# Map search discovery — 14 September 2026

Status: native Search Console diagnosis and small local implementation. Not deployed by this task. This follows priority 3 of the [analytics review](analytics-review-2026-09-14.md); priority 4 is the Avui/local-guide → map journey, and Instagram is priority 5.

## Finding

The map is indexed with the correct canonical. Google reports the last indexed crawl as **26 August 2026, 22:26:25**, Googlebot smartphone, successful fetch, crawling/indexing allowed. User-declared canonical is `https://bolets.app/map`; Google-selected canonical is the inspected URL. It was discovered through the sitemap and local-guide links (Rasos de Peguera fredolics and rovellons). Thus local links already support discovery; there is no evidence of a robots exclusion or a homepage canonical replacing the map.

The live Google test at **14 September 2026, 14:10** returned **URL is available to Google / Page can be indexed**, with one valid breadcrumb item. A subsequent single-page Request indexing attempt failed with **Quota Exceeded**. No recrawl request was accepted. Do not retry repeatedly; request once after the quota resets, preferably after the intended release is live. No CAPTCHA was solved and no sitemap-wide submission was made.

## Native search baseline

Source: [Search Console, queries containing mapa](https://search.google.com/search-console/performance/search-analytics?resource_id=sc-domain%3Abolets.app&num_of_days=28&breakdown=query&metrics=CLICKS%2CIMPRESSIONS%2CCTR%2CPOSITION&query=*mapa), Web, **16 August–12 September 2026**, all countries/devices. Filtered totals may be partial. This substring cohort includes an obsolete 2025 query and species-map queries; it is not a perfect classification of all map intent.

Property totals: **10 clicks, 247 impressions, 4% CTR, position 38.6**.

| Query | Clicks | Impressions | Position |
| --- | ---: | ---: | ---: |
| mapa bolets catalunya 2026 | 6 | 34 | 16.5 |
| bolets catalunya mapa | 1 | 46 | 37.7 |
| mapa bolets avui | 1 | 42 | 32.1 |
| mapa bolets catalunya | 0 | 79 | 43.5 |
| mapa bolets catalunya 2025 | 0 | 34 | 59.4 |
| mapa predicció bolets catalunya | 0 | 4 | 48.8 |

Selected page rows for the same filter:

| Page | Clicks | Impressions | Position |
| --- | ---: | ---: | ---: |
| `/` | 8 | 233 | 48.1 |
| `/zones/ceps` | 2 | 138 | 79.6 |
| `/zones` | 0 | 208 | 67.0 |
| `/map` | 0 | 148 | 60.9 |
| `/bolets-avui` | 0 | 39 | 72.7 |

Page and property aggregation differ; do not sum impressions across them or derive page shares from property totals. Ten of 26 page rows were inspected. Query and page average positions are not interchangeable. The homepage collects the observed generic map clicks, but this alone does not prove harmful cannibalization.

| Device, same query cohort | Clicks | Impressions | CTR | Position |
| --- | ---: | ---: | ---: | ---: |
| Mobile | 8 | 21 | 38.1% | 4.4 |
| Desktop | 2 | 226 | 0.9% | 41.8 |

This is a strong population difference with a very small mobile sample. It does not prove a mobile/desktop rendering defect. Do not use the aggregate position of 38.6 to describe typical mobile visibility or compare it directly to SE Ranking's desktop snapshot.

A separate `Queries containing predic` check over the same period returned **0 clicks, 11 impressions, position 53.5**, all desktop. This overlaps the mapa cohort and must not be added to it as unique demand.

## Existing implementation and changes

A direct, DNT-enabled fetch of the production map returned its descriptive title, one H1, `index, follow`, self-canonical and server-rendered reading guidance. The reading guide is present inside the interactive information panel, initially hidden. Its presence in HTML means it is not dependent on a later data fetch. This review does not infer that its collapsed presentation causes weak rankings.

Existing Avui and seasonal guides already have descriptive map links. The repository also already contains September 14 improvements to the map explanation in commit `af85f59`, which the sampled production response did not yet contain. Avoid duplicating that copy work or attributing its results to the earlier search window. Preserve the homepage H1/title, direct map action and full map workspace.

Implemented locally:

1. Added **Mapa de bolets de Catalunya** → `/map` to the existing **Mapa i territori** footer group, which previously omitted its namesake destination. Reuses `IntentLink` to preserve intent-based prefetching and the existing layout.
2. Recorded the actual September 14 map content update in the existing editorial metadata. The map's sitemap entry now reads that metadata instead of the fixed August 13 launch date. The existing map structured-data path consumes the same record. This is an explicit content date, not today's date generated on every request or the environmental publication timestamp.

These changes address a concrete navigation omission and stale modification metadata. Neither is a ranking guarantee. No new landing page, bulk snippet rewrite, scientific claim, hidden SEO text, or prediction-model change was added.

## Validation and follow-up

Relevant existing SEO/footer tests passed (22 tests across four files). After the metadata change, the map metadata and editorial/query-ownership tests passed (16 tests across four files). Focused ESLint and TypeScript checks passed. A new regression verifies that the sitemap and structured data use the same recorded map content date. No production deployment was performed.

After release, verify the footer anchor, sitemap date and map structured data on the live site; request recrawl once when quota permits. Recheck the same query cohort by page and device after 14 days and 28 days, recording the actual release and crawl dates. Success means more relevant search exposure/clicks and useful map visits across the site, not merely shifting the same clicks from `/` to `/map`. Keep brand, year-specific and species queries distinguishable. Retain the small mobile denominator in any comparison.
