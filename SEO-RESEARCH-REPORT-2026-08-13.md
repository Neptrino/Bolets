# SEO field-research report: bolets.app

**Market:** Catalan-language searches in Catalonia, with Spain-wide Catalan spillover
**Audit date:** 13 August 2026
**Scope:** live technical crawl, repository/content inventory, public SERP sampling, Google autocomplete, competitor research, mobile Lighthouse test, domain/indexation checks

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

SE Ranking access was announced during the research, but the connected app exposed no callable keyword, SERP or competitor actions in this task. Therefore, inventing volume or keyword-difficulty numbers would be misleading. A quantitative appendix should be added when the connector exposes its tools or when Google Search Console/Keyword Planner exports are available. The required export is listed at the end of this report.

## Current organic status

### Indexation and domain maturity

- `bolets.app` was registered at **21:35 UTC on 12 August 2026**, according to the public [RDAP record](https://rdap.org/domain/bolets.app).
- The homepage, robots file and sitemap are live and return successful responses.
- `robots.txt` allows all public paths and blocks only `/api/`.
- The XML sitemap contains **93 indexable URLs**.
- Public `site:bolets.app` searches returned **zero results** on 13 August. For a domain less than one day old, this is expected and should be treated as a baseline, not a failure.
- No Google Search Console verification token or verification file exists in the repository.

**Required action:** verify the domain property in Search Console through DNS, submit `https://bolets.app/sitemap.xml`, inspect the homepage plus one species, one map, one comparison and one location URL, then request indexing for those representative pages. Do not manually request all 93 URLs.

### Live crawl results

| Check | Result |
|---|---:|
| Sitemap URLs crawled | 93 |
| HTTP 200 | 93 |
| Missing titles | 0 |
| Missing meta descriptions | 0 |
| Missing canonicals | 0 |
| Pages without exactly one H1 | 0 |
| Pages without JSON-LD | 0 |
| Duplicate titles | 0 |
| Duplicate descriptions | 0 |
| Orphan sitemap pages | 0 |
| Maximum click depth from home | 3 |

This is a much better launch baseline than most new editorial sites.

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
| P0 | **on trobar bolets avui/ara/aquesta setmana/aquest cap de setmana** | Fresh/local utility | `/map` plus a fresh editorial summary | Partial |
| P0 | **rovellons**, on trobar rovellons, quan surten, rovelló vs pinetell | Species/local | `/species/lactarius-sanguifluus`, `/zones/rovellons`, comparison | Strong existing coverage |
| P1 | **tipus de bolets**, tipus de bolets a Catalunya, noms de bolets | Browse/learn | Localized species hub | Weak URL/targeting |
| P1 | **bolets verinosos de Catalunya**, bolets verinosos noms | Safety | `/bolets-verinosos` | Existing; add expert trust |
| P1 | **temporada de bolets Catalunya**, temporada bolets 2026, primers bolets | Seasonal planning | `/temporada` | Existing |
| P1 | **bolets de primavera**, múrgoles, moixerons, cama-secs | Seasonal/species | New spring pillar + species pages | Gap |
| P1 | **quants dies després de ploure surten els bolets** | Conditions/explanation | New evidence-led guide linked to map | Gap |
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
- Good launch architecture: homepage, species catalogue, edible/toxic hubs, season, map, method, comparisons and areas.
- Unique metadata and canonicals across all audited pages.
- `WebSite`, `Organization`, `CollectionPage`, `ItemList`, `Article`, `BreadcrumbList` and `Taxon` structured entities are used where relevant.
- Strong internal linking: zero orphan pages; 8 URLs one click from home, 54 at depth two and 30 at depth three.
- The method page and version-controlled ecological configuration can become powerful trust assets.

### Highest-impact weaknesses

1. **No named expertise.** Add real author and scientific/mycological reviewer identities, short bios, qualifications, conflicts/disclosures, and links to profiles. Add `author`, `reviewedBy`, `datePublished` and `dateModified` where truthful. Do not fabricate credentials.
2. **Insufficient primary sourcing on safety pages.** Species claims, toxicity, confusing lookalikes and consumption conditions should cite authoritative sources close to the claim. Link prominently to ACSA’s safety and consultation service. The warning footer is good but not enough.
3. **Thin templates.** Fourteen comparison pages are around 212–276 visible words; several area/place hubs are around 216–289 words. Add genuinely distinct identification tables, decisive traits, habitat/season differences, photo annotations, safety escalation and sources. Do not pad templates with generic prose.
4. **Overlong metadata.** Thirteen comparison descriptions are approximately 266–378 characters and will be rewritten/truncated. Ten titles exceed roughly 65 characters, with one reaching 78. Write concise, benefit-led snippets; Google may still rewrite them.
5. **Weak localized hub URL.** `/species` is understandable to developers but not an ideal Catalan search URL. Because the domain is new and unindexed, this is the lowest-risk moment to move it to `/bolets` or `/especies-de-bolets`, with a permanent redirect and updated internal links/canonical/sitemap. Only change it once.
6. **No `lastModified` in the sitemap.** Add truthful modification dates from versioned content. Search engines largely ignore priority/change-frequency hints, so accurate last-modified signals are more useful than claiming that static pages change daily.
7. **No freshness landing experience.** Queries explicitly include “avui”, “ara”, “aquesta setmana”, “aquest cap de setmana” and the year. Create one canonical, server-rendered current-conditions summary—not separate near-duplicate daily URLs. Show timestamp, data freshness, model completeness and links into the map.

## Recommended content architecture

### Pillars to launch or strengthen

1. **Bolets de Catalunya / tipus de bolets** — a visual classification hub by edibility, morphology, habitat, season and family; route users to individual profiles.
2. **Bolets avui a Catalunya** — timestamped regional summary linked to the map; explain where conditions are promising without exposing exact sensitive sites.
3. **Quan surten els bolets després de ploure?** — evidence-led explanation of rain, ET₀, soil moisture memory, dry spells, temperature and species differences. This page should explain why a simplistic “X days” answer is unreliable and show how the model handles it.
4. **Bolets de primavera** — múrgola, moixeró and cama-sec cluster, published before March.
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

## 30/60/90-day action plan

### Days 0–7: discovery and measurement

- Verify Google Search Console and Bing Webmaster Tools through DNS.
- Submit the sitemap; inspect representative URLs; record discovered/crawled/indexed counts weekly.
- Add GA4 only if the product needs it and consent requirements are handled; retain Vercel Analytics for lightweight product measurement.
- Configure rank tracking for the priority keyword set on Google Spain, Catalan language, mobile and Catalonia/Barcelona where the tool supports location.
- Add sitemap `lastModified` values and correct the 13 overlong descriptions plus the longest titles.
- Decide the `/species` localization before indexation begins at scale.

### Days 8–30: trust and core landing pages

- Add genuine author/reviewer profiles and review workflow.
- Strengthen edible, poisonous and highest-demand species pages with primary sources.
- Launch/strengthen “tipus de bolets”, “bolets avui” and “després de ploure” content.
- Expand thin comparison pages, starting with rovelló vs pinetell, edible vs deadly Amanita comparisons, rossinyol vs bolet d’olivera and cep vs false/toxic lookalikes.
- Fix homepage contrast and monitor LCP/field data.

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

## Quantitative keyword appendix required from SE Ranking

Run Spain database and, if available, a Catalonia/Barcelona location on mobile. Export keyword, monthly volume, trend by month, difficulty, CPC, intent, SERP features and top-10 ranking URLs for:

`bolets`, `bolets de catalunya`, `tipus de bolets`, `bolets comestibles`, `bolets verinosos`, `mapa bolets catalunya`, `bolets catalunya avui`, `on trobar bolets`, `on trobar bolets avui`, `temporada bolets catalunya`, `rovellons`, `on trobar rovellons`, `camagrocs`, `ceps bolets`, `fredolics`, `llenegues`, `rossinyols bolets`, `trompeta de la mort`, `ou de reig`, `múrgoles`, `bolets de primavera`, `quants dies després de ploure surten els bolets`.

Also export organic competitors and top keywords for `boletaires.cat`, `micopedia.cat`, `bolets.info`, `bolets.com`, `fotosdebolets.com` and `vadebolets.cat`. That data will turn the qualitative priority tiers in this report into volume-weighted opportunity scores.
