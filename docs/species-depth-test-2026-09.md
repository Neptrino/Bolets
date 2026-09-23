# Species page depth rollout — September 2026

Status: **running since 24 September 2026**. It began as a three-species test and was widened the same day, on the user’s decision, to the twenty most searched species because the text improves the species information in its own right. The clock starts from the deploy that ships this record. The measurement is now treated group against untreated group, below.

## Question

Species fitxes (`/bolets/<slug>`) rank 25–60 for their names, while the two species with a dedicated hub (`/zones/ceps`, `/zones/rovellons`) are the only species terms in the top 10. The pages are indexed and technically clean. The working diagnosis (see [SEO/GEO gap review](seo-geo-gap-review-2026-09-17.md)) is that every fitxa shares one template, with little hand-written text, and misses the name forms people search. Low domain authority is a factor we cannot change within the test.

Does hand-written text in the searched phrasing move a fitxa more than untouched fitxes move over the same weeks?

## Treatment

**Treated group:** the top 20 of `speciesBySearchDemand` (`data/species-search-demand.ts`) since 24 September, extended the same night to every edible species in the catalogue (42 species in total, including five descriptive reference-only profiles, whose text keeps to their sourced season and habitat). All carry the text below; only the first three pilots also changed their title.

### Pilot titles (three species)

| Species | Title before → after | New H2 | Local guides (map section) |
| --- | --- | --- | --- |
| Fredolic (`tricholoma-terreum`) | «Fredolic: identificació, temporada i confusions» → «Fredolic: identificació i fredolics tòxics» | On trobar fredolics a Catalunya | 2 |
| Camagroc (`craterellus-lutescens`) | «Camagroc: identificació, confusions i temporada» → «Camagroc: identificació i on trobar camagrocs» | On trobar camagrocs a Catalunya | 8 |
| Llenega (`hygrophorus-latitabundus`) | «Llenega negra: identificació, hàbitat i temporada» → «Llenega negra o llanega: com reconèixer-la» | On trobar llenegues a Catalunya | 1 |

Each treated page gains about 600 hand-written words in four places:

- **Com reconèixer** opens with two paragraphs that walk the traits in the order a reader checks them.
- **Confusions** opens with the searched safety or naming question («Fredolics tòxics: com no confondre’ls», «Camagroc, fals camagroc i trompeta de la mort», «Llenega, llanega i llenega blanca»).
- **A la cuina** adds three paragraphs after the summary on flavour and uses (naming searched dishes such as «sopa de fredolics» or «truita de camagrocs» as uses, never as invented recipes), preparation and keeping, from the culinary profile, its Canal Aliments/ACSA sources and `/conservar-bolets`. On toxic species the same slot («Es pot menjar …?») explains why not and what the site already advises after a suspected ingestion.
- **On i quan creix** takes the searched H2 («On trobar fredolics i quan surten»; toxic species keep the generic heading) and opens with three paragraphs on season, habitat and the territories the local guides describe. The species-at-place guides stay linked once, in the map section below.

The text lives in `data/species-editorial-prose.ts` and uses only facts already in the species profile, zone hubs and local guides; it names territories, never collection spots. H1s were deliberately left as `identity.commonName`.

### Shipped to every species page at the same time (both groups)

The section order changed from identify → names → kitchen → where to an outing order: 01 Com reconèixer · 02 Confusions · 03 On i quan creix · 04 Mapa d’hàbitat (heading «Mapa d’hàbitat del X a Catalunya»; its button now reads «Mapa del X avui») · 05 Cuina · 06 Noms · 07 Preguntes · 08 Targeta de camp · 09 Fonts. The trait tiles became compact (icon in the gutter, label and value stacked tightly). `SPECIES_PAGES_UPDATED_AT` moved to 2026-09-24. Because the untreated group received the same template change, the comparison still isolates the hand-written text.

## Baseline

**Untreated group:** the toxic, inedible and not-recommended species outside the top 20. Because every edible species is now treated, this group differs in search intent (safety rather than foraging), so treat the comparison as indicative and give most weight to each treated page’s own before/after movement against the October seasonal rise. Compare page-level Search Console data (impressions, average position, clicks for each `/bolets/<slug>`) for both groups: 1–24 September before, and the same number of days after the deploy.

### Pilot keywords (17 September 2026, `docs/keyword-clusters-2026-09-17.csv`)

This is the latest snapshot in the repository. At the first checkpoint, also pull Search Console for 1–24 September to confirm nothing moved between the snapshot and the restart.

Positions are Search Console averages (impressions) and SE Ranking tracked positions.

| Keyword | Volume | GSC impressions | GSC position | Tracked |
| --- | --- | --- | --- | --- |
| fredolic | 720 | 83 | 50.1 | 37 |
| fredolic bolet | 260 | 54 | 43.3 | 27 |
| fredolics toxics | 260 | 8 | 11.4 | — |
| fredolics | 0 | 14 | 54.9 | 43 |
| camagroc | 880 | 95 | 25.1 (lands on `/map/camagroc`) | 17 |
| camagrocs | 540 | 21 | 42.0 | — |
| camagroc bolet | 140 | 58 | 44.3 | 35 |
| llenega | 390 | 70 | 60.6 | 13 |
| llanega | 440 | 0 | — | — |
| llenega negra | 210 | 2 | 34.5 | — |
| llenegues | 0 | 71 | 51.7 (lands on a Solsonès place guide) | 14 |

The five species first chosen as controls (carlet, apagallums, cama de perdiu, bolet de tinta, llenega blanca) are now treated; their 17 September figures stay useful as extra before values: carlet bolet (480; GSC 34.8, tracked 25), apagallums (320; 57.8, 38), cama de perdiu (320; 26.8, 29), bolet de tinta (260; 37.9, 20), llenega blanca (170; 45.6, 24).

## Checkpoints

- **12 October 2026** (18 days): first read of page-level Search Console data for both groups. Demand for all autumn species rises in October, so compare the treated group’s movement with the untreated group’s, never the absolute change.
- **26 October 2026** (32 days): decision point. If the treated group improved clearly more than the untreated one, extend the text down the demand list. Otherwise the gap is more likely authority than depth; move the effort to outreach aimed at species pages (the text stays, since it improves the pages anyway).

Also check which URL ranks for «camagroc» and «llenegues». They should move from `/map/camagroc` and the place guide to the fitxa.
