# Map-search competitor review — 14 September 2026

Historical research, not an implementation or deployment receipt. Follow-up to [map discovery](map-discovery-2026-09-14.md). Scope: the exact query `mapa bolets Catalunya`, concentrating on the two leaders in the supplied SE Ranking screenshot. Public competitor pages were read on 14 September; their product/model claims were not independently validated.

## Ranking evidence

SE Ranking project 12765494, keyword 149902650, Catalan desktop engine 1386756:

| Site | 13 September | 14 September | Last returned landing URL |
| --- | ---: | ---: | --- |
| Va de Bolets | 1 | 1 | Homepage, 13 September |
| Trobarbolets | 3 | 3 | Homepage, 13 September |
| Bolets | 48 | 32 | Homepage, landing history dated 1 September |

The screenshot matches today's Catalan desktop ranks. Competitor URL fields on 14 September are null: yesterday's homepage URLs are the latest returned evidence, not newly confirmed landing URLs today. The Spanish desktop engine 1387419 gives Va de Bolets 2, Trobarbolets 1 and Bolets 32 today; Va de Bolets' last returned Spanish landing URL is its weekly map page. Mobile results are incomplete and were not interpreted as normal ranks. See [filtered API evidence](map-search-competitors-2026-09-14.json).

Do not equate these daily tracked positions with Search Console's earlier, aggregated 28-day average. The leaders' homepage results also mean that success need not require Google to choose `/map` over our homepage.

## What competitors expose

### Va de Bolets

The [homepage](https://www.vadebolets.cat/) frames the immediate outing decision, with prominent routes to the weekly table, map and analysis. It also retains a winter-pause message, so freshness is not consistent across the site.

The [weekly page](https://www.vadebolets.cat/mapa-boletaire-setmanal/) has a live 10 September 2026 briefing, named-area comparisons, traffic-light labels, rainfall and temperature columns, update timing, limitations and a simple method explanation. It offers a readable answer before requiring map interaction. A cached search excerpt contained older material; the live page superseded it for this review. This is a presentation comparison, not endorsement of its ecological thresholds or advice.

The [Solsonès guide](https://www.vadebolets.cat/solsones-bolets/) connects background advice to the weekly map in its planning steps and closing links.

### Trobarbolets

The [homepage](https://www.trobarbolets.cat/) puts the map search phrase in its title, displays a phone-map example and explains the outing benefit. It links prominently to a historical demo, an explanation and access. The demo is explicitly dated September 2025; current access requires registration and a cleanup video. Comarca and species links support discovery.

Its [explanation page](https://www.trobarbolets.cat/info) demonstrates the result with an example and answers practical questions about the inputs and benefit. Its model-performance claims are self-reported and were not audited.

The [Berguedà guide](https://www.trobarbolets.cat/comarques/bergueda) separates general season/habitat information from current conditions and ends with a clear route to the map. This is a useful connection between reference content and a planning tool.

## Implications for Bolets

Observable differences suggest clearer map communication and connected content as worthwhile improvements; they do not establish why Google ranks these sites higher. Backlinks, domain history and comparative model quality were not established. Vendor domain-trust zeros must not be interpreted as evidence that competitors have no authority.

Bolets already has an immediate homepage map action, Avui readings, local guides, methodology and an indexed map. Its current homepage preview is labelled simulated and leads to Avui; the `/map` explanation is server-rendered but initially inside the information panel. These observations do not prove an indexing problem or a penalty for hidden content. The earlier inspection found `/map` indexed with the intended canonical.

Recommended order:

1. Make the homepage map section explain a concrete use: choose a species, compare areas, read the day and legend. Preserve the agreed homepage H1/title and immediate map action. Clearly distinguish the interactive map from the daily overview. Consider a dated, verified real example using existing data, with a readable explanation and honest limitations; never present an old or simulated preview as live.
2. Expose a concise introduction to using `/map` without requiring discovery of the information panel, while preserving immediate map usability. Link the longer method instead of making the full-screen tool an essay. Check the newer map explanation's deployment before duplicating work.
3. Strengthen the existing Avui/local-guide journey: general season information leads naturally to current territorial conditions and the map. Audit existing links before adding duplicates. Reuse the existing verified summaries rather than introducing another weather or scoring pipeline.
4. Measure the map-query cluster and landing pages after release, separating desktop/mobile and Catalan/Spanish tracking. Follow organic map arrivals and eligible map-use events. Treat low-volume CTR and short-term rank movement cautiously; no guaranteed ranking target or timeline.

The earlier local footer/sitemap corrections are useful hygiene, not a sufficient response to the competitive gap. No product changes were made as part of this competitor review.

## Follow-up evidence, 14 September (afternoon)

- `trobarbolets.cat` was registered on 25 August 2026. SE Ranking's backlink index lists two referring domains, `boletometro.com` and `boletometre.cat`, and both redirect to the Trobarbolets homepage, so it has no external links. `vadebolets.cat` has 27 nofollow links from spam TLDs; `bolets.app` has none. Authority does not explain the gap.
- Trobarbolets first appeared in the Catalan desktop series on 2 September at 5 for `mapa bolets Catalunya`, then 2–3. It ranks 40–100 on every non-map keyword in the group (e.g. `bolets Catalunya` 73, `on trobar bolets avui` 69). It is an exact-match play, not a stronger site.
- Its homepage title starts with "el mapa de bolets de Catalunya", the copy uses "mapa" twelve times in FAQ-style H2s, and all 34 comarca pages and 18 species pages close with an "On buscar bolets … avui?" section that routes to the map. No JSON-LD.
- Live Catalan SERP for `mapa bolets Catalunya` (SE Ranking, Spain): Va de Bolets 1, a shopping-centre app roundup 2, Trobarbolets 3; our homepage about 33 and `/map` about 75. The page-one roundups (Diagonal Mar, Ara, Segre, Diari Més, Fundesplai, Catalunya Press) list Fungipedia and Mushroom Identify and mention none of the three Catalan map sites.
- Our position series moved 77 (14 August) to 32 (14 September); daily ranks swing by 15+ places, so judge trends over weeks.

Response applied the same day: see the implementation status in [the plan](../map-discovery-plan.md).
