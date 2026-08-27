# SEO field-research report: bolets.app

**Market:** Catalan-language searches in Catalonia, with Spain-wide Catalan spillover
**Initial audit date:** 13 August 2026
**Status refreshed:** 25 August 2026
**Scope:** live technical crawl, repository/content inventory, public SERP sampling, Google autocomplete, competitor research, mobile Lighthouse test, domain/indexation checks, and current SE Ranking project review

> The 13 August sections below remain the launch baseline. The current-status update takes precedence wherever a metric, gap or recommendation has since changed.

## Current-status update — 25 August 2026

The project has progressed materially since launch. It is still too early to make a traffic forecast or claim a durable index-coverage outcome, but the original report should no longer be read as a list of uncompleted product or SEO tasks. The query data below comes through the connected Search Console report in SE Ranking and remains subject to Search Console's normal reporting lag.

| Area | Current status |
|---|---|
| Sitemap | Live sitemap contains **187 URLs**, up from 93. Every entry now includes a truthful `lastModified` value. |
| Core content | `/bolets-avui`, `/bolets-de-primavera`, `/temporada`, `/map`, the species hub and the rovelló–pinetell comparison are live and return HTTP 200. |
| Trust | Named author and editorial/source panels are live. Independent mycological review remains explicitly pending and is still the main trust gap. |
| Comparison content | The 14 initially thin comparison pages have been expanded with field-level traits, safety guidance and source panels. Keep reviewing their distinctiveness rather than treating the template work as finished forever. |
| SE Ranking | The project now tracks **290 keyword–engine entries**: 145 in Catalan and 145 in Spanish. Daily tracking began in mid-August, so the data is directional rather than a stable trend. |
| Search Console evidence | The connected report now shows real queries. For example, `pinetells` has 43 impressions, 1 click and an average position of 17.2; `ceps d’estiu` averages 10.9 and `matagent` 9.9. |
| Keyword coverage | Each of the 52 species profiles has at least one tracked keyword mapped to its canonical URL. On 26 August, 21 broad terms were assigned to canonical pages; one geographic term and three content gaps remain intentionally unassigned. |
| Local rank tracking | Both language configurations use the national database; no Catalonia or Barcelona region is configured yet. |
| Fresh technical crawl | SE Ranking’s 25 August crawl scored **95/100** across 549 URLs: 0 errors, no slow-loading-page warnings and no missing-favicon warning. |

### Priority actions now

1. Add descriptive alt text to the identification/gallery images. The fresh crawl finds this on 206 pages; an inspected example is the unlabelled *Russula virescens* gallery images. This is the clearest remaining scalable on-page issue.
2. Build the safety-reviewed *bolet de soca* and false-rossinyol content before assigning the three deliberately unowned high-intent terms; do not point them at a merely similar species page.
3. Set a Catalonia or Barcelona tracking location if SE Ranking supports it, while retaining the national view for comparison, and replace the stale `mapa bolets catalunya 2025` term with its 2026 equivalent.
4. Use the native Google Search Console property for coverage, URL inspection and Core Web Vitals; keep Bing Webmaster Tools verified as a separate operational check. The connected report confirms query data, but it is not a substitute for property-level diagnosis.
5. Check the six externally reported 4xx links individually before changing them. At least one is an ICGC service that returns 403 to the crawler, rather than a broken bolets.app URL.

### Current keyword evidence

Earlier SE Ranking research confirms that the strategic direction remains sound: `bolets comestibles` has 590 estimated monthly searches with difficulty 8; `bolets Catalunya` has 390 with difficulty 6; and `mapa bolets catalunya` has 170 with difficulty 5. The project has added high-confidence singular/plural and synonym variants such as `bolets de tinta`, `fredolic bolet`, `pinatell bolet`, `bolet de xop`, `carreretes bolet`, `carlets bolet` and the unaccented `rovello bolet`.

The new Search Console feed shows early, useful signals rather than a verdict: `pinetells` improved from an average position of 20.1 in the previous snapshot to 17.2 with 43 impressions; `bolets verinosos` averages 20.1; `bolets de primavera` averages 33.0; and `rovelló`, `fredolic` and `llenega` remain well below page one. Tracked visibility is only 0.218% for Catalan and 0.243% for Spanish on 25 August, with tracking only just started. Prioritize pages and snippets that receive impressions in positions 8–20; do not claim a ranking trend yet.

Track singular and plural variants separately when demand or intent differs, but route them to one canonical page. Do not create duplicate singular/plural landing pages.

### Keyword map — 26 August 2026

This was the first complete demand-to-page mapping pass: SE Ranking’s similar-keyword data and two competitor gap checks were compared with the project’s tracked terms and the live information architecture. The project now has 145 tracked keyword records in each language setting. The following actions are complete:

- **21 previously unowned terms mapped:** broad Catalonia terms to the homepage; map terms to `/map`; current-condition terms to `/bolets-avui`; identification/naming terms to `/bolets`; safety terms to `/bolets-verinosos`; and seasonal, species and comparison terms to their exact canonical pages.
- **10 existing-page variants added:** `bolets comestible`, `bolets no comestibles`, `bolets toxics`, `bolets venenosos`, `bolets toxics catalunya`, `bolet rossinyol`, `bolets ceps`, `bolet cep`, `temporada de bolets` and `bolets a Catalunya`.
- **3 intentional content gaps tracked without a target:** `bolet de soca`, `bolets de soca` and `fals rossinyol bolet`. They require new safety-led content; mapping them to an existing but different species would create a poor and potentially unsafe search result.

| Opportunity | Estimated monthly volume | Decision |
|---|---:|---|
| `bolet de soca` / `bolets de soca` | 390 each | Build an expert-reviewed profile and danger comparison with *Galerina marginata* before assigning a URL. |
| `bolets comestible` | 590 | Track as a spelling/number variant of `/bolets-comestibles`; no duplicate page. |
| `bolets no comestibles` | 140 | Target `/bolets-verinosos`; reinforce the page’s wording and internal links. |
| `bolets toxics` | 90 | Target `/bolets-verinosos`; no separate page. |
| `bolet rossinyol` / `bolets ceps` | 140 each | Track against the existing rossinyol and ceps content clusters. |
| `on trobar bolets aquesta setmana` | 140 | Target `/bolets-avui`, which should retain a prominent map path. |

The high-volume standalone `bolet` term (1,900) is too ambiguous to receive a dedicated page. Spanish `setas…` volume is also deliberately excluded from the Catalan content plan until the site has a genuine Spanish-language experience. Keep both as strategy observations, not as content obligations.

## Executive assessment

bolets.app has a strong technical and product foundation but effectively no organic visibility yet. This is not evidence of a penalty: the domain was registered on 12 August 2026, less than a day before this audit. The immediate SEO challenge is discovery, indexation, trust and authority—not repairing a fundamentally broken site.

The opportunity is attractive. “Bolets” combines a large culturally specific audience with strong annual seasonality and urgent, repeatable intents: *what is fruiting now*, *where to look*, *how to identify a species*, *is it edible*, *what can it be confused with*, and *what happens after rain*. The current site is positioned to serve this better than static editorial competitors because it combines an atlas with habitat and current-condition maps.

The key conclusions are:

1. **Indexation is priority zero.** Public `site:bolets.app` checks returned no results on the audit date. The site is crawlable, but there is no Search Console verification in the codebase and no evidence yet that the sitemap has been submitted.
2. **The technical baseline is excellent.** All 93 sitemap URLs returned 200, with a unique title, meta description, canonical, one H1 and JSON-LD. No sitemap page is orphaned; every page is reachable within three clicks.
3. **The product owns the right strategic wedge:** “mapa de bolets Catalunya”, “bolets Catalunya avui”, “on trobar bolets ara/aquesta setmana” and species-by-zone queries. Few competitors can answer these with a transparent ecological model.
4. **Trust is the largest on-page weakness.** Mushroom identification and consumption are safety-sensitive. Pages need named authors/reviewers, qualifications, review dates and stronger primary-source citations. A generic organization entity is not enough.
5. **Content breadth is good for launch but uneven.** Species pages are substantial; comparison pages and several location hubs are thin. The site lacks high-value pillars for *tipus de bolets*, *bolets de primavera*, *quan surten després de ploure*, regulations/permits and several major mushroom regions.
6. **Authority is currently near zero.** The new domain has no public index footprint and no Common Crawl captures. Institutional and legacy competitors therefore have an overwhelming trust/link advantage even when their product is less useful.

## Method and important data limitation

The keyword ordering below uses live Catalan Google autocomplete (`hl=ca`, `gl=es`), recurrence across sampled SERPs, intent breadth, seasonality and fit with the product. These are demand signals, not exact monthly search volumes.

At the time of the initial audit, SE Ranking access exposed no callable keyword, SERP or competitor actions. That limitation has been resolved: the connected project is now available and its current configuration and keyword findings are recorded in the 25 August update above. The connected Search Console report now supplies query impressions, clicks and positions; use the native Search Console property for index coverage, URL inspection and the complete performance export. Keyword Planner is still useful for a more complete volume export.

## Current organic status

### Indexation and domain maturity

- `bolets.app` was registered at **21:35 UTC on 12 August 2026**, according to the public [RDAP record](https://rdap.org/domain/bolets.app).
- The homepage, robots file and sitemap are live and return successful responses.
- `robots.txt` allows all public paths and blocks only `/api/`.
- The initial audit's XML sitemap contained **93 indexable URLs**. As of 25 August, it contains **187 URLs**, each with a `lastModified` value.
- Public `site:bolets.app` searches returned **zero results** on 13 August. For a domain less than one day old, this is expected and should be treated as a baseline, not a failure.
- A Search Console verification token or file is not present in the repository, which is normal for DNS verification. The connected SE Ranking report now exposes Search Console query data; retain native property access for coverage and URL-level diagnosis.

**Required action:** maintain the domain property in Search Console, confirm the current sitemap submission, inspect the homepage plus one species, one map, one comparison and one location URL, then request indexing only for genuinely new or materially changed representative pages. Do not manually request all 187 URLs.

### Live crawl results

| Check | Result |
|---|---:|
| Sitemap URLs crawled | 93 at the 13 August baseline; the live sitemap has 187 URLs on 25 August |
| HTTP 200 | 93 at the baseline; the new 25 August audit reports 0 crawl errors across 549 crawled URLs |
| Missing titles | 0 in both audits |
| Missing meta descriptions | 0 in both audits |
| Missing canonicals | 0 in both audits |
| Pages without exactly one H1 | 0 in both audits |
| Pages without JSON-LD | 0 at the baseline |
| Duplicate titles | 0 in both audits |
| Duplicate descriptions | 0 in both audits |
| Slow-loading-page warnings | 7 on 21 August; **0** in the 25 August crawl |
| Missing favicon warning | 1 on 21 August; **0** in the 25 August crawl |
| Missing image alt text | 206 pages in the 25 August crawl; the remaining material on-page issue |
| External 4xx links | 6 in the 25 August crawl; investigate individually, as crawler access controls can cause false positives |
| Orphan sitemap pages | 0 at the 13 August baseline; not re-reported as a warning in the 25 August audit |
| Maximum click depth from home | 3 at the 13 August baseline; re-measure only if navigation structure changes |

The current technical health score is **95/100** (0 errors, 212 warnings and 953 notices). It is a much better launch baseline than most new editorial sites; the larger URL count also means raw warning totals must be interpreted by issue type, not compared in isolation.

### Performance and experience

A mobile Lighthouse 13.4.1 lab test of the homepage scored:

| Category | Score |
|---|---:|
| Performance | 93/100 |
| SEO | 100/100 |
| Best practices | 100/100 |
| Accessibility | 96/100 |

Lab metrics were FCP 1.1 s, LCP 2.9 s, TBT 10 ms and CLS 0. LCP is the only performance metric worth watching: 2.9 s is just beyond the 2.5 s “good” threshold in this one lab run. Field Core Web Vitals should replace this lab result once Search Console has enough data.

The accessibility deduction came from low contrast in species-card secondary text. This is not an indexation blocker, but improving it supports readability and usability.

## Search demand and query landscape

### Highest-priority query clusters

| Priority | Query cluster and observed variants | Intent | Recommended landing page | Status |
|---|---|---|---|---|
| P0 | **bolets de Catalunya**, bolets Catalunya, bolets catalans | Broad discovery | `/` | Existing |
| P0 | **bolets comestibles**, bolets comestibles Catalunya, tipus de bolets comestibles | Identification/safety | `/bolets-comestibles` | Existing; deepen |
| P0 | **mapa bolets Catalunya**, mapa bolets avui, bolets Catalunya mapa | Live utility | `/map` | Existing; major differentiator |
| P0 | **on trobar bolets avui/ara/aquesta setmana/aquest cap de setmana** | Fresh/local utility | `/map` plus `/bolets-avui` | Existing; assign the remaining tracked variants to their canonical targets |
| P0 | **rovellons**, on trobar rovellons, quan surten, rovelló vs pinetell | Species/local | `/bolets/lactarius-sanguifluus`, `/zones/rovellons`, comparison | Strong existing coverage |
| P1 | **tipus de bolets**, tipus de bolets a Catalunya, noms de bolets | Browse/learn | `/bolets` | Existing; assign the remaining tracked variants to this canonical hub |
| P1 | **bolets verinosos de Catalunya**, bolets verinosos noms | Safety | `/bolets-verinosos` | Existing; add expert trust |
| P1 | **temporada de bolets Catalunya**, temporada bolets 2026, primers bolets | Seasonal planning | `/temporada` | Existing |
| P1 | **bolets de primavera**, múrgoles, moixerons, cama-secs | Seasonal/species | `/bolets-de-primavera` + species pages | Existing |
| P1 | **quants dies després de ploure surten els bolets** | Conditions/explanation | `/quan-surten-els-bolets-despres-de-ploure` | Existing; assign the tracked keyword |
| P1 | **camagrocs**, camagroc bolet, on trobar camagrocs | Species/local | Species and location pages | Existing |
| P1 | **ceps bolets**, tipus de ceps, cep vs fals cep | Species/comparison | Species and comparison cluster | Existing |
| P2 | **fredolics**, fredolics bords, temporada | Species/safety | Species and comparison content | Partial |
| P2 | **llenegues**, llenega negra/blanca, temporada | Species | Species pages | Existing |
| P2 | **rossinyols bolets**, fals rossinyol, rossinyol vs bolet d’olivera | Species/safety | Species and comparison pages | Existing |
| P2 | **trompeta de la mort**, confusió, temporada | Species/safety | Species page | Existing |
| P2 | **ou de reig**, ou de reig bord/fals, identificació | Species/safety | Species and comparison pages | Existing |

Autocomplete also shows substantial recipe, preservation, translation and shopping demand: “camagrocs receptes”, “fredolics saltejats”, “rovellons en conserva”, “en castellano”, and prices. These queries are real but should not distract the first 90 days. The product’s defensible advantage is ecological and geographic utility, not becoming a generic recipe publisher.

### Seasonality

The commercial/editorial year should not be treated as flat:

- **August:** prepare evergreen pages, refresh year labels, publish season outlook methodology, begin outreach.
- **September–November:** peak campaign for current conditions, maps, areas, rovellons, ceps, camagrocs, fredolics and safety/confusion content.
- **December–February:** late species, preservation/culinary support content if strategically desired, and technical/content maintenance.
- **March–May:** spring cluster around múrgoles, moixerons and cama-secs. The current SERP has dedicated spring content from [Fotos de Bolets](https://www.fotosdebolets.com/bolets-primavera-2026/) and scientific-language material from the [Catalan Biology Society](https://scb.iec.cat/wp-content/uploads/2023/05/QCS_168_maq.pdf), confirming a distinct spring opportunity.
- **June–July:** authority building, expert review, data stories and preparation for autumn.

### Local-intent expansion

Current local coverage focuses on Ripollès, Berguedà, Montseny and Cerdanya. SERPs and official/tourism coverage repeatedly surface additional areas: Solsonès, Garrotxa, Alt Urgell, Pallars Sobirà, Prades, Maresme and Montnegre-Corredor. A current competitor list highlights Berguedà, Montseny, Ripollès, Cerdanya, Solsonès, Garrotxa, Prades and Montnegre-Corredor ([Fem Turisme](https://femturisme.cat/noticies/on-buscar-bolets-a-catalunya-millors-zones)); the Generalitat also identifies the Pre-Pyrenees and High Pyrenees as particularly rich areas ([Canal Aliments](https://canalaliments.gencat.cat/ca/coneix-aliments/bolets-tofona/bolets/)).

Expand only where the ecological data and editorial evidence justify a useful page. Avoid doorway-style combinations and never reveal sensitive exact locations.

## Competitor landscape

### Direct specialist competitors

| Competitor | What it owns | Strengths | Weakness/opportunity for bolets.app |
|---|---|---|---|
| [Boletaires.cat](https://boletaires.cat/) | Species catalogue/identification | 69 species, bilingual Catalan/Spanish, strong catalogue proposition | Static atlas; bolets.app can win current conditions, habitat modelling and transparent local utility |
| [Micopedia.cat](https://micopedia.cat/) | Catalan identification | Specialist identification focus and linguistic relevance | Less product-led and less focused on live fruiting/location intent |
| [bolets.info](https://bolets.info/) | Legacy Catalan guide | 69 species and a history dating to 2002, giving age/recognition advantages | Older presentation; opportunity in UX, structured comparisons, maps and freshness |
| [bolets.com](https://www.bolets.com/rovello.html) | Popular species and boletaire culture | Legacy relevance, practical local prose and video | Page structure and model transparency are weaker than bolets.app’s potential |
| [Fotos de Bolets](https://www.fotosdebolets.com/) | Photography, species and seasonal guides | Real-photo authority and freshness/year targeting | bolets.app can differentiate with verified datasets, uncertainty and prediction history |
| [Va de Bolets](https://www.vadebolets.cat/on-trobar-rovellons/) | Practical “where/when” queries | Directly targets post-rain timing, regions, altitude and FAQs | This is the closest content competitor to the product wedge; bolets.app needs stronger evidence and live data to beat it |

### Authority competitors

These domains may not be product competitors, but they are often harder to outrank:

- **Generalitat / Agència Catalana de Seguretat Alimentària:** institutional trust, food-safety authority and broad “bolets” visibility. Its current guidance also offers a mycological consultation service and was updated in February 2026 ([ACSA](https://acsa.gencat.cat/ca/detall/article/Bolets)).
- **Enciclopèdia Catalana:** strong entity and species/reference relevance.
- **3Cat, ARA, RTVE, El Periódico and other publishers:** dominate seasonal news, safety and trend spikes through domain authority and freshness. For example, 3Cat publishes expert-led collecting, cooking and preservation advice ([3Cat](https://www.3cat.cat/3catinfo/trucs-i-advertencies-a-lhora-de-collir-bolets-cuinar-los-i-conservar-los/noticia/3311967/)).
- **Tourism and regional publishers:** win “where to find” and area queries with destination authority, even when ecological detail is shallow.

### Competitive positioning to own

Do not present the site as merely another “guia de bolets”. The defensible category is:

> **The transparent, ecology-based atlas and current-conditions map for mushrooms in Catalonia.**

Every major page should reinforce three proof points: same versioned ecology across profiles and predictions; verified environmental evidence with provenance; and uncertainty/safety disclosed clearly.

## On-page and content audit

### What is already strong

- Clear Catalan language targeting (`lang="ca"`, Catalan copy and `ca_ES` Open Graph locale).
- Good launch architecture: homepage, species catalogue, edible/toxic hubs, season, map, method, comparisons, areas, a spring pillar and a current-conditions page.
- Unique metadata and canonicals across all audited pages.
- `WebSite`, `Organization`, `CollectionPage`, `ItemList`, `Article`, `BreadcrumbList` and `Taxon` structured entities are used where relevant.
- Strong internal linking: zero orphan pages; 8 URLs one click from home, 54 at depth two and 30 at depth three.
- The method page and version-controlled ecological configuration can become powerful trust assets.
- Named author, editorial metadata and visible sources are now present. The site describes the author’s role and limits without claiming unverified micological qualifications.

### Highest-impact weaknesses

1. **Independent mycological review remains pending.** The author and editorial source panels now exist, but safety-sensitive claims still need independent, named mycological review where the project represents that review as complete. Do not fabricate credentials or reviewer status.
2. **Insufficient primary sourcing on safety pages.** Species claims, toxicity, confusing lookalikes and consumption conditions should cite authoritative sources close to the claim. Link prominently to ACSA’s safety and consultation service. The warning footer is good but not enough.
3. **Image descriptions are incomplete.** The fresh crawl reports missing alt text on 206 pages, including identification-gallery assets. Add concise, factual descriptions that distinguish the visible specimen or diagnostic view; do not turn alt text into a keyword list.
4. **Area and comparison quality must be maintained.** The initially thin comparison pages have been expanded. Keep adding genuinely distinct identification tables, decisive traits, habitat/season differences, photo annotations, safety escalation and sources rather than generic padding.
5. **Metadata is largely resolved.** The fresh crawl finds no missing or duplicate titles/descriptions and only three long-title notices. Continue writing concise, benefit-led snippets; Google may still rewrite them.
6. **Localized hub URL is resolved.** The public catalogue is now `/bolets`; keep it stable and avoid another route change without a genuine information-architecture reason.
7. **Sitemap freshness is resolved.** The sitemap now publishes truthful `lastModified` values. Continue maintaining them; search engines largely ignore priority/change-frequency hints.
8. **Freshness landing experience is resolved.** `/bolets-avui` provides the canonical current-conditions summary. Maintain its timestamp, data freshness and model-completeness signals rather than creating duplicate daily URLs.

## Recommended content architecture

### Pillars to launch or strengthen

1. **Bolets de Catalunya / tipus de bolets** — implemented at `/bolets`; keep improving the visual classification and internal routes to individual profiles.
2. **Bolets avui a Catalunya** — implemented at `/bolets-avui`; retain the timestamped regional summary and its link to the map without exposing exact sensitive sites.
3. **Quan surten els bolets després de ploure?** — implemented; keep the explanation evidence-led and clear that a simplistic “X days” answer is unreliable.
4. **Bolets de primavera** — implemented at `/bolets-de-primavera`; refresh it ahead of the spring season.
5. **Seguretat i identificació** — a hub for poisonous species, emergency action, photo requirements, myths and expert resources. Link to 061 and current official guidance where appropriate.
6. **Regulations and responsible collecting** — rules and permits by managed area, private property, parking, collection etiquette and dated official sources. Regulations must be reviewed on a schedule.

### Species template additions

- “Resposta ràpida” summary for identity, edibility, habitat and season.
- Named reviewer and last-reviewed date.
- Key diagnostic traits by cap, underside, stem, flesh/latex, smell and habitat.
- Dangerous confusion panel with direct comparison links.
- “When and where broadly” section driven by the shared ecological profile.
- Evidence/source notes and uncertainty.
- Annotated, original or properly licensed photos showing multiple life stages and underside/base—not just attractive hero images.

## Authority and digital PR plan

The first links should come from relevance and evidence, not generic directory submissions.

1. Publish a methodology/data page that researchers, weather writers and local media can cite.
2. Produce seasonal, non-sensitive data stories: regional suitability changes after rain; how altitude shifts the season; model-vs-observation retrospectives; uncertainty and data completeness.
3. Offer expert-reviewed embeddable charts/maps to local media and tourism bodies with a canonical source link.
4. Build relationships with Catalan mycological societies, natural parks, universities, hiking/outdoor groups and regional tourism organizations.
5. Seek citations from each location page’s authoritative regional sources rather than mass outreach.
6. Create a media page with methodology, contact, reusable brand assets and clear wording about what the model can and cannot predict.

Avoid paid link schemes, exact-location bait and low-quality guest-post networks. In this safety-sensitive niche, one relevant institutional or expert citation is worth far more than many unrelated links.

## 30/60/90-day action plan — initial plan and current readout

The action plan below records the original sequencing. The following items are complete or materially progressed: the `/bolets` hub decision, `lastModified` sitemap entries, author/editorial panels, spring and current-conditions pages, deeper comparison content, self-hosted analytics, daily SE Ranking tracking, connected Search Console query reporting, and the refreshed full technical crawl. The remaining work is independent review, image-alt completion, native Search Console/Bing operational checks, a local SE Ranking location and re-validating target-URL ownership.

### Days 0–7: discovery and measurement

- Verify Google Search Console and Bing Webmaster Tools through DNS.
- Submit the sitemap; inspect representative URLs; record discovered/crawled/indexed counts weekly.
- Add GA4 only if the product needs it and consent requirements are handled; retain Vercel Analytics for lightweight product measurement.
- Configure rank tracking for the priority keyword set on Google Spain, Catalan language, mobile and Catalonia/Barcelona where the tool supports location.
- Keep sitemap `lastModified` values truthful and review the three remaining long-title notices when the associated pages are next edited.
- Decide the `/species` localization before indexation begins at scale.

### Days 8–30: trust and core landing pages

- Add genuine author/reviewer profiles and review workflow.
- Strengthen edible, poisonous and highest-demand species pages with primary sources.
- Launch/strengthen “tipus de bolets”, “bolets avui” and “després de ploure” content.
- Expand thin comparison pages, starting with rovelló vs pinetell, edible vs deadly Amanita comparisons, rossinyol vs bolet d’olivera and cep vs false/toxic lookalikes.
- Complete gallery-image alt text and monitor LCP/field data.

### Days 31–60: geographic and seasonal depth

- Add only evidence-backed area hubs for Solsonès, Garrotxa, Alt Urgell/Pallars, Prades and Montnegre-Corredor, prioritized by measured demand.
- Build spring content ahead of March and autumn refresh templates ahead of September.
- Add internal “related species / confusion / habitat / location” modules based on true relationships.
- Start expert and regional outreach around methodology and non-sensitive data stories.

### Days 61–90: optimize from real data

- Use Search Console queries to split pages only where impressions reveal distinct intent; consolidate cannibalizing pages.
- Improve titles on high-impression/low-CTR pages and content on positions 8–20.
- Compare indexed URLs against sitemap URLs and investigate “crawled/discovered, not indexed” clusters by template.
- Publish the first model retrospective with calibration, limitations and source provenance.
- Review branded search, referring domains and assisted use of the map—not rankings alone.

## KPIs and realistic expectations

For a domain launched on 12 August 2026, rankings are a lagging measure. Track:

- **Week 1–4:** sitemap discovery, indexed pages, crawl errors, branded impressions, valid structured data, field CWV availability.
- **Month 2–3:** non-branded impressions, number of queries/pages receiving impressions, top-20 keyword count, map-entry clicks from organic landings, referring domains and citations.
- **Seasonal peak:** clicks for current-condition queries, CTR for map/season pages, repeat visits, regional landing engagement and index freshness.
- **Quality safeguards:** percentage of safety pages expert-reviewed, stale-source count, pages with verified provenance, and prediction pages correctly withholding incomplete/stale scores.

Do not set a traffic forecast until SE Ranking/Keyword Planner volumes and at least 4–8 weeks of Search Console impression data exist.

## SE Ranking configuration and next data extract

SE Ranking is now configured with 290 keyword–engine entries in two language settings (`ca` and `es`), checked daily. The project is not yet location-specific: configure a Catalonia or Barcelona view if available, while retaining the national comparison. Target-URL ownership is complete for all existing pages except the deliberately held `bolets pirineu` term and the three safety-led content gaps recorded above.

Export keyword, monthly volume, trend by month, difficulty, CPC, intent, SERP features and top-10 ranking URLs for:

`bolets`, `bolets de catalunya`, `tipus de bolets`, `bolets comestibles`, `bolets verinosos`, `mapa bolets catalunya`, `bolets catalunya avui`, `on trobar bolets`, `on trobar bolets avui`, `temporada bolets catalunya`, `rovellons`, `on trobar rovellons`, `camagrocs`, `ceps bolets`, `fredolics`, `llenegues`, `rossinyols bolets`, `trompeta de la mort`, `ou de reig`, `múrgoles`, `bolets de primavera`, `quants dies després de ploure surten els bolets`.

Also export organic competitors and top keywords for `boletaires.cat`, `micopedia.cat`, `bolets.info`, `bolets.com`, `fotosdebolets.com` and `vadebolets.cat`. That data will turn the qualitative priority tiers in this report into volume-weighted opportunity scores.
