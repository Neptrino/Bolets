# SEO launch operations

Last updated: 2026-08-31

These account-level actions are deliberately separate from the application release. They require the domain owner's Google, Bing and SE Ranking accounts. Search Console is the source of truth for Google indexation; SE Ranking figures are directional monitoring data.

## 31 August baseline

| Signal | Baseline | Limitation |
| --- | ---: | --- |
| SE Ranking site audit | 95/100, 0 errors, 212 warnings, 953 notices, 549 crawled URLs | The crawl finished on 25 August and predates the intent-consolidation release. |
| Tracked keyword-engine entries | 290 | This is 145 keywords in each of two language settings, not 290 distinct queries. |
| Average tracked position | 44 | Tracking began in August; this is not a stable trend. |
| Top-10 rank records | 47 | Counted across both configured engines. |
| Visibility | 0.66% | Vendor metric; do not compare directly with Search Console visibility. |
| Vendor-detected Google index | 83 | Directional only; native Search Console coverage is authoritative. |
| Domain Trust | 0 | The generic backlink endpoint also returned zero for both sampled competitors, so it is not a reliable comparative link count. |

The connected Search Console feed in SE Ranking exposes query signals but does not disclose its reporting window, device, country or page filter. Do not describe those rows as a verified 28-day export.

## Query ownership

| Search intent | Target URL |
| --- | --- |
| `bolets Catalunya`, `bolets de Catalunya` | `https://bolets.app/` |
| `on trobar bolets avui`, `on trobar bolets aquesta setmana` | `https://bolets.app/bolets-avui` |
| `mapa bolets Catalunya`, `mapa bolets avui`, `predicció de bolets`, `mapa de predicció de bolets` | `https://bolets.app/map` |
| `temporada de bolets Catalunya` | `https://bolets.app/temporada` |
| `bolets al setembre` and equivalent month queries | The matching `/temporada/{mes}` page |
| Singular species names and scientific taxa | The matching `/bolets/{speciesId}` profile |
| `ceps`, `ceps de Catalunya` | `https://bolets.app/zones/ceps` |
| `rovellons`, `rovellons a Catalunya` | `https://bolets.app/zones/rovellons` |
| Explicit `X vs Y` searches | The matching `/compare/{slug}` page |

Target-URL mappings are monitoring expectations, not directives that force Google to select a landing page.

## Release checklist

### Before deployment

- [ ] Export the previous 28 days from native Search Console by query and page: clicks, impressions, CTR and average position.
- [ ] Export current SE Ranking positions and ranking URLs.
- [ ] Record Search Console submitted/indexed sitemap counts and Core Web Vitals.
- [ ] Run the repository tests, type check, lint and production build.

### After deployment

- [ ] Verify the title, description, H1, canonical and JSON-LD on `/`, `/bolets-avui`, `/temporada`, `/temporada/setembre`, the Cep, Rossinyol and Rovelló profiles, and their principal comparisons.
- [ ] Resubmit `https://bolets.app/sitemap.xml` once.
- [ ] Request indexing only for `/`, `/temporada`, `/temporada/setembre` and the three changed species profiles.
- [ ] Run a fresh SE Ranking audit. Require at least 95/100 and zero new errors.
- [ ] Confirm the sitemap URL count did not change during this URL-neutral release.

## Google Search Console and Bing

1. Maintain the DNS-verified `sc-domain:bolets.app` Search Console property.
2. Segment Page Indexing results into species, territory/local guides, comparisons, monthly season pages and editorial guides.
3. Inspect representative `Discovered – currently not indexed`, `Crawled – currently not indexed`, duplicate and alternate-canonical examples.
4. Do not prune or `noindex` a template from this review. A URL must remain excluded for at least 28 days and demonstrate duplication or insufficient value before a separate consolidation proposal.
5. Keep Bing Webmaster Tools connected and confirm the same sitemap is accepted.

## SE Ranking configuration

- Retain the existing national Catalan and Spanish engines for history.
- Add Google Spain, mobile, Catalan, located in Barcelona or Catalonia where supported.
- Add `trobarbolets.cat` and `boletada.cat` without removing the existing competitors.
- Replace `mapa bolets catalunya 2025` with `mapa bolets catalunya 2026` if the stale term is still present.
- Apply the target URLs in the query-ownership table.
- Keep the Spanish engine secondary; do not infer a need for translated content from it.

Track the existing keyword set, including `bolets`, `bolets de Catalunya`, `tipus de bolets`, `bolets comestibles`, `bolets verinosos`, `on trobar bolets avui`, `mapa bolets Catalunya`, `predicció de bolets`, `mapa de predicció de bolets`, `temporada de bolets Catalunya`, `rovellons`, `camagrocs`, `ceps bolets`, `fredolics`, and the priority species and local variants already configured.

## Measurement schedule

| Checkpoint | Indexation | Search performance | Technical | Authority |
| --- | --- | --- | --- | --- |
| Baseline | Submitted/indexed totals and exclusions by template | 28-day query-page export | Audit score and Core Web Vitals | Referring domains and live citations |
| Day 7 | Newly crawled and newly indexed changed URLs | Impressions and selected landing pages; no trend claim | New crawl errors | Outreach sent/responses |
| Day 14 | Exclusions by template and representative inspections | Compare like-for-like 14-day windows where available | Core Web Vitals changes | Follow-up status and earned links |
| Day 30 | 28-day persistent exclusions | Clicks, impressions, CTR and position by query and page | Fresh full audit | Relevant citations and referring domains |

Create a CTR/content backlog only for pages with at least 10 impressions in a comparable 28-day window, average position 8–20, CTR below the site median for the same position band, and a query matching the page's intended ownership. Do not rewrite local guides from the connector's date-ambiguous aggregate rows.

## Field-evidence backlog

Every species currently has an attributed identification-reference image. Original field photography is therefore a non-blocking quality improvement, prioritized as follows:

1. Cep
2. Rossinyol
3. Rovelló
4. Camagroc
5. Fredolic

For each species, prefer a habitat view, whole fruiting body, underside or hymenium, complete stem/base where relevant, and a diagnostic close-up. Record photographer, capture date, broad non-sensitive area, consent, licence and whether the image has independent taxonomic confirmation. Never label an image expert-verified unless a named qualified reviewer actually checked it.

## Operational boundaries

- Do not add GA4; use the existing privacy-preserving product analytics and Search Console for search acquisition.
- Do not buy links, exchange them indiscriminately or ask publishers to endorse identification or edible status.
- Do not request indexing for the full sitemap.
- Do not manufacture current-year freshness or a conditions story without dated supporting data.
