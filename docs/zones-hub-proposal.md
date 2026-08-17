# Zones hub restructure — proposal

**Date:** 2026-08-17 · **Status:** implemented 2026-08-17 (all phases, plus hub board on /bolets-avui; Pirineu editorial hub still open)

## Why

Three findings drive this:

1. **Search demand lives at massís/paratge scale, not comarca scale.** Of every geo
   query that registers any volume in SE Ranking's database, five of six are
   massissos or paratges: *bolets prades* (70/mo), *bolets pirineu* (50–70),
   *bolets montseny* (50–90), *bolets rasos de peguera* (10–30), *bolets port del
   comte* (10). The only comarca that registers is *bolets berguedà* (30–50).
   Comarca names people "should" search (Solsonès, Garrotxa, Osona…) show no data
   at all. Boletaires search for the mountain they park under.
2. **Vadebolets validates the unit.** Their weekly map
   (vadebolets.cat/mapa-boletaire-setmanal) runs ~36–43 zones at valley/massís
   scale — "Vall de Camprodon cota alta", "Port del Comte–Tuixent–La Vansa",
   "Prades–Capafonts–la Mussara" — grouped under massís/comarca headers. Crucially
   they have **no per-zone pages**: one dashboard, updated Thursdays, traffic-light
   rating + 5-day rain + mean temperature per zone. Our per-zone hubs with live
   per-cell prediction are the differentiator they don't have.
3. **The current /zones page leads with the wrong layer.** It presents the 9
   internal prediction regions ("Serralades Prelitorals", "Catalunya Central") —
   units nobody searches for — while the 5 real hubs (Ripollès, Berguedà,
   Montseny, Cerdanya, Ports) and the on-trobar guides are buried in sitemap-only
   linking.

## Proposed /zones structure

Reorder the page into four sections, demoting the prediction regions:

### A. Guies "on trobar" (species-first)
The existing `/zones/rovellons` and `/zones/ceps` guides, presented as the
entry point for species-first searchers. Grow this set later (camagrocs,
trompetes, fredolics) — highest-volume species queries first.

### B. Massissos i paratges
Areas with `typeLabel: "massís"` plus notable paratge-level places surfaced
directly:

| Hub | Status | Signal |
|---|---|---|
| Montseny | live | 50–90/mo |
| Ports | live | competitor coverage |
| **Muntanyes de Prades** | **new** | 70/mo — strongest uncovered query |
| **Guilleries** | **new** | cultural (Sant Hilari "capital boletaire"); fills Montseny↔Ripollès gap |
| **Montnegre-Corredor** | **new** | competitor-validated; closest hub to Barcelona metro |
| Rasos de Peguera (paratge, Berguedà) | live | 10–30/mo — surface at top level, keep URL |
| **Port del Comte (paratge, Solsonès)** | **new** | 10/mo |

### C. Comarques boletaires
Areas with `typeLabel: "comarca"` — only ones with real pages, no thin stubs:

| Hub | Status | Places under it |
|---|---|---|
| Ripollès | live | Camprodon, Setcases, Les Lloses (+ candidate: Vall de Ribes, Vidrà) |
| Berguedà | live | Castellar de n'Hug, Rasos de Peguera (+ candidate: Bagà–Gisclareny, Catllaràs) |
| Cerdanya | live | Bellver (+ candidate: La Molina–Masella, Lles–Aransa) |
| **Solsonès** | **new** | Port del Comte, Vall de Lord / Sant Llorenç de Morunys |
| **Garrotxa** | **new** | Vall d'en Bas–Puigsacalm, Fageda d'en Jordà–Santa Pau |

Hold Alt Urgell and Pallars until GSC shows impressions; vadebolets' five
Pallars valley zones are the roadmap if demand appears.

### D. Regions de predicció (demoted)
The 9 internal regions stay as compact map entry points (`/map?region=…`) at the
bottom. They are the model's aggregation unit, not a search demand unit — except
**Pirineu**, which does register 50–70/mo; consider one editorial hub
`/zones/pirineu` as the exception.

## Guide ↔ zone interlinking

The graph today: guides link species profiles; area hubs list places; species-
location pages (32) are leaves. Missing edges:

1. **Guide → hubs:** each on-trobar guide gets a "Millors zones" section linking
   area hubs by ecology — rovellons → Solsonès, Berguedà, Prades (pinedes
   calcàries); ceps → Ripollès, Cerdanya, Guilleries, Montseny (fagedes/obagues).
   Derivable from `ecologicalConfig` (forest types + region compatibility), so no
   hand-maintained matrix.
2. **Hub → guides:** area/place hubs link the guide for each species they feature
   via the existing `territoryGuideForSpecies()` helper.
3. **Hub → live prediction:** aggregate prediction cells over each area's bounds
   (comarca/massís-scale median + range) so hubs carry "condicions ara" — the same
   summarise machinery as regions, run over hub bounds. This is what vadebolets'
   dashboard does weekly at zone level, but live and per-species. Needs area
   bounds (areas currently have no polygon — add bounds or derive from member
   places' `mapCentre` buffer).
4. **Species profile → local pages:** already handled via territory guides and
   species-location pages.

## Implementation phases

1. **Restructure `/zones`** using existing data — `typeLabel` already
   distinguishes massís/comarca; no new content required. Update metadata (drop
   "9 regions" framing from title/description).
2. **New hubs** in `data/location-pages.ts`: Prades, Solsonès (+ Port del Comte,
   Vall de Lord), Guilleries (+ Sant Hilari), Montnegre-Corredor, Garrotxa
   (+ Vall d'en Bas). Each needs profile copy + territorial source, following the
   existing pattern; species-location pages for the 2–3 strongest species per
   place. Respect the no-picking-spots principle: paratge pages describe habitat,
   never coordinates.
3. **Interlinks + live conditions** (edges 1–3 above), then add the geo keywords
   (`bolets` + each hub name) to SE Ranking — the tracked list currently has zero
   geo terms, so there is no rank feedback on zone pages at all.

Timing: geo queries peak September–October. Phases 1–2 published before
mid-September index in time for the season.
