# Mushroom-hunting FAQ: question-level SEO research

Research date: **27 August 2026**. Target: Catalan-speaking mushroom hunters in Catalonia. Page: `/preguntes-frequents-bolets`. Implementation status: local changes, not pushed or deployed by this research pass.

## Usability and safety follow-up — 28 August 2026

The owner approved three follow-up improvements after the research below:

- Added contextual links from `/temporada` (and the shared monthly calendar), `/bolets-avui` and `/normativa-bolets` to the matching FAQ sections. Existing page layouts are reused; no new large introductory block pushes the species lists down.
- Added a unique fragment and accessible permalink to every answer. The fragment targets the content inside native `details`, so direct arrival reveals the answer even without JavaScript. A small, page-local client helper handles reload/back/forward inconsistencies, with cleaned-up event listeners and a strict check for FAQ answer targets. Browser-native pre-hydration changes to the `open` attribute are expected and narrowly excluded from hydration warnings. The rest of the page remains server-rendered; there is no new dependency or dynamic server route.
- Added **“Què faig si sospito una intoxicació per bolets?”**, citing [Canal Salut's poisoning guidance](https://canalsalut.gencat.cat/ca/salut-a-z/i/intoxicacio-bolets/) and linking to `/bolets-verinosos`. It prioritizes medical care, preserving mushroom remnants without delaying care and attention to other diners. This is a safety gap, not a newly measured search-volume opportunity.

The FAQ now has **15 questions**; the research snapshot and 14-question result below remain the historical 27 August findings. The FAQ's editorial and sitemap modification dates are 28 August; publication remains 27 August. With JavaScript disabled, initial deep links and manual accordions work, but browser-specific reload/history restoration is not enhanced.

Verification passed: 702 unit tests in the current workspace (8 skipped), including nine FAQ checks; all 13 FAQ browser tests; type checks; lint/source-size checks; and the production build. Browser coverage includes desktop/tablet/mobile layout, all 15 direct answer links on mobile with and without JavaScript, enhanced reload/back/forward navigation, invalid fragments and the four contextual entry points (season overview, a month, current conditions and permissions). The initial reload/history failures were resolved with the scoped helper; a test fixture's invalid numeric month was corrected to the project's `set` key. No commit, push, deployment or external account change was performed.

## Conclusion

The original 12-question FAQ covered most relevant intents, but its questions had not individually been checked against fresh demand. This pass combines SE Ranking keyword estimates, the connected Search Console query feed and six public Google searches. It is now an evidence-backed question map, **not a complete census of every question or an exact-volume measurement of all FAQ headings**.

The strongest measured clusters already have dedicated destinations: edible species, current locations/conditions, maps and seasonality. Keep the FAQ as a concise navigation hub into those pages. Do not create another landing page for each wording variant or redirect broad keywords to the FAQ.

Four focused changes follow from the research:

1. Change the location question to **“On trobar bolets avui o aquesta setmana?”**; retain weekend planning in the answer and link to `/bolets-avui` and `/zones`.
2. Explicitly include **“comestible o verinós”** and the limits of photo/app identification in the identification answer; keep the existing edible/toxic destinations.
3. Add **“És millor tallar o arrencar els bolets?”**, a recurring question in sampled search results. Its exact search volume remains unknown. Use the limited findings of a primary field study, not a universal harvesting rule.
4. Add **“Com preparar una sortida a buscar bolets amb nens?”**, supported by a small measured phrase (10 estimated searches/month), with official mountain-safety advice. Do not label ecological zone guides as certified family itineraries.

The result is **14 questions in the existing four sections**. Section anchors, layout, no-JavaScript accordions, safety attribution and specialist-page links remain intact. The order still follows the trip-planning journey rather than pretending that estimates for broad keywords are exact question rankings.

## What was actually measured

### SE Ranking

The connection initially failed; it worked after the owner reconnected it. Fresh successful requests:

- Similar keywords for `bolets`, database **Spain (`es`)**, sorted by volume: **654 unique rows**, all retrieved with `limit=1000`. This is one seed expansion, not 654 relevant questions. It includes other languages, songs, recipes, shops and unrelated uses of “bolets”.
- Question suggestions for the same seed: three irrelevant English questions, all with zero estimates. They were rejected; they do not establish an absence of Catalan question demand.
- Targeted similar-keyword checks for `bolets després de ploure`, `rovelló pinetell` and `collir bolets`: no rows. This means missing coverage, **not zero searches**.
- A planned 50-phrase exact-volume batch could not run: the connector returned `INVALID_ARGUMENT` / `DATA_exportKeywords not found`. No exact-volume output is claimed for those phrases.
- An offset request repeated the start of the result set. The final full 654-row response was checked for uniqueness instead of treating repeated rows as additional evidence.

Volumes below are the returned monthly estimates for the **exact keyword written in the table**, not for the FAQ question it informs. They are Spain-wide, not Catalonia-only. Singular/plural and overlapping phrases must not be added together as unique demand. Difficulty is SE Ranking's estimate, not a prediction that this site will rank easily. Historical values are retained in the evidence file but were not used to manufacture a seasonal traffic forecast.

The [machine-readable evidence snapshot](seo-faq-evidence-2026-08-27.json) preserves the full similar-keyword response, rejected question suggestions, failed exact-check inputs and the connected Search Console rows. It contains no account tokens or other projects.

### Connected Google Search Console

The SE Ranking project `12765494` returned **161 popular-query rows** for bolets.app. The response does **not** state its reporting date range, country, device or page filter. These are query signals at retrieval time, not a verified 28-day export, not FAQ-specific performance and not a trend against older snapshots. Absence from this feed is not proof of zero impressions.

| Query | Clicks | Impressions | Average position |
|---|---:|---:|---:|
| on trobar bolets avui | 0 | 26 | 72.54 |
| on trobar bolets aquesta setmana | 0 | 12 | 72.25 |
| on trobar bolets avui a catalunya | 0 | 10 | 72.30 |
| mapa bolets catalunya | 0 | 31 | 50.97 |
| bolets comestibles | 0 | 22 | 84.32 |
| bolets comestibles catalunya | 0 | 22 | 78.55 |
| bolets verinosos | 0 | 29 | 18.97 |
| bolets de primavera | 0 | 27 | 35.52 |
| app bolets de catalunya | 0 | 26 | 30.38 |
| rovelló vs pinetell | 0 | 2 | 56.00 |

These rows support the relevance of current-condition, safety, season and comparison links. They do not establish that the new FAQ has ranked or improved any of these queries.

## Question-to-demand and destination map

“Unknown” means no usable exact-volume measurement in this pass. Where a broad keyword is shown, it validates the topic only. “Keep” includes editorially important safety and product-interpretation questions even without a measurable search estimate.

| FAQ question / topic | Measured keyword → estimated monthly volume (difficulty) | Other evidence | Decision and main destination |
|---|---|---|---|
| Quan és temporada de bolets a Catalunya? | `temporada de bolets` → 50 (8); exact question unknown | Calendar intent in Google; spring query has 27 GSC impressions | Keep; `/temporada`, `/bolets-de-tardor`. The calendar owns year-round detail. |
| Quants dies després de ploure surten els bolets? | Unknown; targeted seed returned no rows | Dedicated timing answers in sampled Google results | Keep; `/quan-surten-els-bolets-despres-de-ploure`. No universal number of days. |
| La calor i el vent poden frenar els bolets encara que hagi plogut? | Unknown | Useful explanation of why rain alone is not enough; not separately validated as a popular question | Keep briefly; rain guide and `/bolets-avui`. |
| On trobar bolets avui o aquesta setmana? | `on trobar bolets aquesta setmana` → 140 (5); `on trobar bolets ara` → 90 (7); `on anar a buscar bolets` → 40 (6) | GSC today/weekly impressions; Google related searches | Rewrite the question; `/bolets-avui` remains the primary current-condition destination. Do not sum the variants. |
| En quins boscos creixen els rovellons i els ceps? | Exact question unknown in this pass | Species/habitat intent; existing specialist guides | Keep; `/zones/rovellons`, `/zones/ceps`. No new combined landing page. |
| Una zona favorable al mapa garanteix que hi trobaré bolets? | `mapa bolets catalunya` → 170 (5), but the exact interpretation question is unknown | GSC map query: 31 impressions; important product limitation | Keep; `/map`, `/metode`. Do not equate scores with observations or probabilities. |
| Com puc saber si un bolet és comestible o verinós? | `bolets comestibles` → 590 (8); `bolets comestibles catalunya` → 390 (9); `bolets verinosos` → 140 (8) | Google identification/safety results; GSC confirms topic impressions | Clarify question and answer; `/bolets-comestibles`, `/bolets-verinosos`. Broad volumes do not measure this exact question. |
| Photo/app identification, within the previous answer | `app bolets de catalunya` → 30 (12); `identificador de bolets` → 20 (9) | App query: 26 GSC impressions; apps visible in identification results | Integrate the safety limit, not another repetitive accordion or an unsupported app-ranking article. The app keyword is broader than identification alone. |
| Rovelló i pinetell són el mateix bolet? | Unknown; targeted phrase seed returned no rows | GSC has several comparison variants, including 2 impressions for `rovelló vs pinetell` | Keep; `/compare/rovello-vs-pinetell`, `/zones/rovellons`. |
| Els bolets comestibles es poden menjar crus? | Unknown | ACSA safety guidance, not measured popularity | Keep; `/bolets-comestibles`. No implication that cooking makes a misidentified mushroom safe. |
| Cal un permís per collir bolets? S’ha de pagar? | Unknown | Google shows jurisdiction-specific rules and permit pages | Keep; `/normativa-bolets` and its cost section. Do not turn one area's price into a Catalonia-wide rule. |
| Quants quilos de bolets puc collir? | Unknown | Google surfaced an article about rules outside Catalonia | Keep; local-rules section of `/normativa-bolets`. No universal quota. |
| És millor tallar o arrencar els bolets? | Unknown | Multiple directly relevant articles/videos in the sampled search | Add; `/normativa-bolets#collecting-care` plus the primary study. Qualitative gap, not proven high volume. |
| És millor portar un cistell o una bossa per als bolets? | `cistell bolets` → 140 (3), mainly a shopping/equipment phrase; exact question unknown | ACSA directly addresses suitable containers | Keep the short practical answer; do not attribute 140 searches to this question or create a shop page. |
| Com preparar una sortida a buscar bolets amb nens? | `anar a buscar bolets amb nens` → 10 (6) | Official mountain-safety guidance supports a useful answer | Add; `/zones`, `/normativa-bolets`. Small measured gap, not a major traffic opportunity. |

## Public Google sampling

Six searches were inspected in the browser, signed out, with Catalan interface / Spain settings (`hl=ca`, `gl=es`, `pws=0`). Google's footer still inferred **Comunitat Valenciana from the IP**; this was not a controlled Barcelona/Catalonia rank test. Optional cookies were rejected. Results are a dated qualitative sample and can vary by location and time.

| Search | What was observed | Use in the FAQ |
|---|---|---|
| `quants dies després de ploure surten els bolets` | Dedicated timing guides and an AI summary; competing fixed-day claims | Keep the question but explain conditions and uncertainty instead of copying a fixed interval. |
| `anar a buscar bolets` | Zone/equipment/safety pages; related searches included today, now, map, app and a stale year-specific weekly phrase | Make current-location wording direct and link to fresh conditions. Do not put a year in an evergreen question. |
| `com identificar bolets comestibles` | Identification/safety pages and apps | Include “comestible o verinós” and explicit photo/app limits. |
| `temporada de bolets` | Calendars and seasonal news | Keep seasonality prominent and link to the existing calendar. |
| `permís collir bolets quants quilos` | Local permit rules and a featured passage giving a quota in an article about other autonomous communities | Maintain jurisdiction/date qualifiers; never copy the featured quota as a Catalonia-wide limit. |
| `bolets tallar o arrencar` | Multiple articles/videos about the question, with differing advice | Add a concise answer grounded in primary evidence and local rules. |

No visible expandable **People Also Ask** block was captured in these six UI samples. Related searches, organic titles and AI-summary text are not PAA questions. SE Ranking reports a `people_also_ask` SERP feature for some keywords, but that does not provide the actual current questions. This pass must not be described as a complete PAA extraction or a fresh Google autocomplete study.

Examples informing search-intent interpretation (not used as authority for mushroom safety): [3Cat's harvesting interview](https://www.3cat.cat/3catinfo/trucs-i-advertencies-a-lhora-de-collir-bolets-cuinar-los-i-conservar-los/noticia-amp/3311967/), [3Cat's article about permits in other communities](https://www.3cat.cat/3catinfo/un-permis-per-collir-bolets-aixi-regulen-la-caca-comunitats-com-larago-i-el-pais-valencia/noticia/3318397/) and [Vadebolets' weekly map](https://www.vadebolets.cat/mapa-boletaire-setmanal/). A result's title, age or search snippet is not proof of current access rules or fruiting conditions.

## Answer sources and editorial limits

- [ACSA: Bolets](https://acsa.gencat.cat/ca/detall/article/Bolets): identification caution, cooking and ventilated rigid baskets. The app warning applies the safe-identification requirement; it is not a claim that ACSA evaluated named apps.
- [Agents Rurals: frequently asked questions](https://interior.gencat.cat/ca/arees_dactuacio/agents-rurals/preguntes-frequents/) and [Alt Pirineu: leisure activities](https://parcsnaturals.gencat.cat/ca/xarxa-de-parcs/alt-pirineu/gaudeix-del-parc/guia-de-visita/activitats-lleure/): location-specific rules and free/ticketed exceptions. Confirm the actual place and date before a trip.
- [Egli et al., Biological Conservation (2006)](https://doi.org/10.1016/j.biocon.2005.10.042): the accessible abstract/results describe no reduction in subsequent yields from cutting or picking in the studied Swiss forests, and fewer fruit bodies with trampling. This is not permission to harvest without limits or proof that all methods are harmless everywhere. A full independent mycological review was not performed.
- [Bombers: safety advice for mushroom hunters](https://interior.gencat.cat/ca/arees_dactuacio/bombers/seguretat_a_la_muntanya/boletaires/index.html): weather, equipment, group contact, age/fitness and returning before dark. Applying this to a family question is an editorial synthesis, not certification of an itinerary.

Sources checked on 27 August 2026. Preserve the truthful “sense revisió micològica independent” notice. Keep the existing Article/Breadcrumb metadata; no FAQ rich-result eligibility or ranking gain is promised.

## Deliberately not added

- `com congelar bolets` and `com guardar bolets a la nevera` each have a returned estimate of 10. They may justify a separate source-backed storage guide later, but this pass does not add cursory food-preservation advice or dilute the hunting FAQ.
- Basket-buying variants have shopping intent. The FAQ needs container advice, not a storefront or product recommendations.
- Spanish `setas…`, French/English matches, recipes, lyrics, restaurants and unrelated lottery terms are outside this Catalan hunting page's remit.
- Existing species/season/wood-fungi guides remain the owners of their topics. The FAQ should refer to them rather than duplicate them.
- No independent-review promise, fabricated exact occurrence locations, universal fruiting interval, Catalunya-wide permit price or harvest quota was introduced.

## Verification and follow-up

Local verification passed: all 698 unit tests in the current workspace (8 skipped), including six focused FAQ checks; type checking; lint/source-size checks; and the production build (211 generated pages). Five FAQ browser tests passed at 1280, 800 and 390 pixels, covering expansion of every answer, keyboard interaction, no horizontal overflow or overlapping answers, guide/footer navigation, internal section links and no-JavaScript navigation. The evidence JSON parses correctly and contains 654 distinct keyword rows and 161 GSC query rows. No tracking configuration, indexing requests, commit, push or deployment is part of this research pass.

After an approved deployment, inspect this page's native GSC performance with an explicit date range and page filter. Compare a complete post-indexing window against a comparable earlier window, allowing for the autumn season. Monitor clicks into the specialist pages as well as FAQ impressions. Do not interpret this connector's undated popular-query feed as a before/after measurement.

Remaining research limits: exact volumes for long-tail rain, permits, quotas and cutting questions remain unresolved; a full native GSC query export and controlled PAA sampling would improve coverage. These limitations do not require inventing zero-volume values or adding more pages now.
