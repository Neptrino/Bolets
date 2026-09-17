# SEO and GEO gap review, 17 September 2026

Companion files: the full cluster table is `docs/keyword-clusters-2026-09-17.csv` (803 keywords, importable into SE Ranking). The interactive report page is linked at the end of this file. Previous review: 2 September 2026 (see `docs/seo-launch-operations.md` for the ownership table).

## Baseline

| Signal | Value | Source |
| --- | ---: | --- |
| Tracked keywords in the top 10 | 72 of 169 (11 unranked, average position 44) | SE Ranking, 16–17 Sept |
| Visibility | 2.75% (0.54% on 2 Sept, 1.05% on 8 Sept) | SE Ranking |
| Impressions → clicks | 11,506 → 136 (1.2% CTR); 39 clicks are brand queries | Search Console feed in SE Ranking |
| Species cluster | 6,260 impressions → 11 clicks (0.18% CTR) | same |
| Top-10 SERPs with an AI Overview | 30 of 72 | SE Ranking SERP features |
| Indexed pages | 279 indexed, 36 not (15 redirects, 11 noindex, 2 robots, 5 discovered, 3 crawled) | Search Console page indexing (verified 17 Sept). The "83 indexed" figure in SE Ranking is not reliable. |
| Site audit | 93/100; INP needs improvement on mobile; 216 pages link to redirecting internal URLs; 13 pages with a dead external link; 60 images without alt | SE Ranking audit, 15 Sept |
| AI crawler access | GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, PerplexityBot, Google-Extended, CCBot, Bytespider, Applebot, Amazonbot, meta-externalagent all return 200 through Cloudflare | live check |
| AI presence | ChatGPT (ca): link presence 31.8%, mention 15.4% on 26 prompts; AI Overview engine has no prompts; bolets.com has brand presence 82 / link presence 73 in SE Ranking's AI database, bolets.app has no record | SE Ranking AI Result Tracker and AI search database |

## The central finding

Rankings improved, clicks did not. Definitional species queries where we rank in the top 3 get no clicks (cortinari rogenc 89 impressions at 1.5, candeleta de prat 102 at 2.5, carner bord 79 at 5, pollancró 82 at 7.7, farinera pudent 84 at 3.5) because an AI Overview answers on the results page and cites bolets.com. The gap is therefore (1) becoming the cited source, (2) owning intents an AI answer cannot satisfy alone (live conditions, this week, this valley, bilingual names) and (3) the species template that carries most demand.

## Cluster summary

Market volume sums SE Ranking's Spanish database for Catalan-market terms only (Spain-wide generic terms and noise are flagged in the CSV `scope` column and excluded from the sum). Impressions and clicks are Search Console.

| Cluster | Keywords | Market volume /mo | GSC impressions | Clicks | Top 10 | 11–50 | Buried or missing |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Head terms | 7 | 3,660 | 665 | 27 | 4 | 2 | 1 |
| Where-now & map | 59 | 780 | 750 | 24 | 13 | 10 | 36 |
| Castilian bridge | 120 | 9,980 | 486 | 1 | 8 | 22 | 90 |
| Species pages | 260 | 18,160 | 6,260 | 11 | 55 | 126 | 79 |
| Scientific names | 17 | 40 | 53 | 0 | 0 | 4 | 13 |
| Weather & timing | 25 | 20 (plus 590 for «on plou ara a catalunya», Spain-wide flagged) | 94 | 0 | 3 | 0 | 22 |
| Season & calendar | 39 | 120 | 294 | 6 | 10 | 2 | 27 |
| Geo hubs | 90 | 290 | 1,336 | 15 | 13 | 12 | 65 |
| Identification & safety | 78 | 3,090 | 1,146 | 4 | 16 | 22 | 40 |
| How-to, rules & gear | 43 | 510 | 32 | 0 | 2 | 5 | 36 |
| Recipes | 42 | 4,260 | 0 | 0 | 0 | 0 | 42 |
| Brand & app | 23 | 50 | 278 | 44 | 7 | 1 | 15 |

Who wins today: bolets.com on species names, the rain page («on plou ara a catalunya» #1 and cited in the AI Overview) and recipes; vadebolets.cat on «on trobar bolets aquesta setmana» and Montseny; boletsbergueda.cat on Berguedà, fredolic and «on trobar bolets ara»; dos-a-la-tres.com on «bolets catalunya», «guia de bolets» and «bolets comestibles catalunya» with one long list page; nobody on the Castilian bridge (micocat PDF at 36–40, dos-a-la-tres at 29, bolets.info at 73).

## The ten gaps, ranked

1. **Species fitxes do not win their own names.** Compact fitxes rank 40–75 where bolets.com ranks 1–8 (moixernó 67, apagallums 38–58, fredolic 37–50, ou de reig 41–57). Defects seen in the HTML: morphology lead instead of an answer, searched name forms missing from title/H1 («Moixeró» for moixernó/moixernons, «Cep negre» for sureny, only a «daurat» page for peu de rata), «carreretes bolet» lands on /bolets-d-estiu, no FAQ on about 35 pages. Missing fitxes: pebrassos 480, cua de cavall 590 (shared with the plant), sabatera 210, gita de bruixa 90, bolet de bou 50, llengua de gat 40, verderol 30, brumosa 30, plus a genus-level peu de rata (590). Fix: template upgrade (answer-first lead with Catalan, scientific and Spanish names, edibility, season, habitat; name forms in H1/title; «Com es diu en castellà?»; 3–5 FAQ items; visible update date) and the new fitxes.
2. **Castilian bridge unbuilt.** 120 keywords, about 10,000/mo, top-3 on one, no ranking on 58. Head: rovellons en castellano 590, moixernó/moixernons en castellano 590 each, setas en catalan 390, seta en catalan 390, donde hay setas ahora en cataluña 320, rovello en castellano 320, ceps setas 320, cep seta 320, setas en cataluña 260, setas catalunya 260, rebozuelo en catalan 260, fredolic(s) en castellano 260 each. The glossary targets «en catalán» (16 mentions) but not «en castellano» (0). Fix: «En castellà: …» in every fitxa lead and FAQ; three Spanish pages with hreflang pairs (glossary ES, ¿Dónde hay setas ahora en Cataluña?, Setas comestibles de Cataluña).
3. **Weather hub.** bolets.com's rain page is 84% of its estimated traffic; «on plou ara a catalunya» 590 (bolets.com #1, cited), radar pluges catalunya 590, mapa precipitacions catalunya 390, pluges avui catalunya 210. Our rain page: 6–10 on «quan surten els bolets després de ploure» (AI Overview present), 50 in GSC on «quants dies després de ploure…» (54 impressions). Fix: live «Pluja i bolets» page from the XEMA gauge data (72-h rainfall by comarca, days since useful rain, flush window per species), linked from every hub, dateModified daily.
4. **No dated weekly brief.** «on trobar bolets avui» 144 impressions at 29, «aquesta setmana» 83 at 37, «aquest cap de setmana» 52 at 66, «mapa bolets catalunya» 84 at 42; vadebolets wins with a weekly post. Fix: weekly «Bolets aquesta setmana (dates)» series through November with Article schema, large photo and byline (also the Discover / Preferred Sources play); /bolets-avui stays canonical.
5. **Zone hubs rank through sub-pages.** Berguedà 40 impressions at 78, Cerdanya 51 at 69, Montseny 66 at 35, Pirineu 68 at 44 (no page), Solsonès 78 at 23; «bolets garrotxa» lands on the Vall d'en Bas page. Place pages work (Port del Comte 6 clicks at 7, Vall d'en Bas at 3). Fix: local prose on hubs, live board, links to place pages; ship /zones/pirineu.
6. **Catalogue intents.** dos-a-la-tres.com ranks #1–2 for guia de bolets, bolets catalunya, bolets comestibles catalunya with one list page; «tipus de bolets» lands on our homepage, «bolets comestibles» sits at 42–57. Fix: make /bolets the catalogue table with filters; rebuild /bolets-comestibles as a photo list; image SEO for «bolet dibuix» (260).
7. **AI search: linked, never named.** «Bolets Atles» appears 22 times in AI answers, «Bolets» never; people search «bolets app» (27 clicks / 34 impressions) and «app bolets de catalunya» (137 impressions). Fix: one brand string with `alternateName` on Organization/WebSite, `sameAs` on Taxon (Wikidata, GBIF) and author; load Catalan prompts into the AI Overview engine including the 72 prompts where bolets.com is cited; monthly presence review.
8. **Content shape for citation.** AI Overview on 42% of top-10 SERPs; leads do not answer, zone hubs lack dateModified, FAQ on five pages only. llms.txt is not the lever (Google does not use it). Fix: answer-first pass on the 40 pages with 50+ impressions.
9. **Landing mismatches.** «temporada de bolets» lands on /temporada/febrer, «cep d'estiu» on the compare page, «carreretes bolet» on the summer guide; tracked landings still on scientific-name URLs. Fix: one canonical target per intent, internal links, retrack.
10. **Technical hygiene.** INP on mobile, 216 pages linking to /instagram (302) and /compte/* (307), one dead external link on 13 Solsonès/Ripollès pages, Cloudflare e-mail obfuscation 404 path, 60 images without alt, two slow local guides. One PR.

Parked with numbers: recipes (42 keywords, 4,260/mo, decision pending since 4 Sept), video (video carousel on nearly every SERP; Shorts from existing Reels), off-site mentions (outreach campaign written, unsent).

## Plan

| Week | Ship | Success signal |
| --- | --- | --- |
| 1 | Species template upgrade; brand alternateName and sameAs; technical PR | Species CTR moves off 0.2%; moixernó, sureny, peu de rata enter the top 20 |
| 2 | Castilian bridge block on every fitxa; three Spanish pages with hreflang; first weekly brief | Impressions on «en castellano» and «setas en catalan»; brief indexed within 24 h |
| 3 | «Pluja i bolets» live page; hub rewrites (Berguedà, Cerdanya, Montseny, Solsonès); /zones/pirineu | «on plou ara a catalunya» in the top 20; hubs become the landing URL |
| 4 | Catalogue pages; answer-first pass on 40 pages; Catalan prompts in the AI Overview engine | First AI Overview link-presence measurement; «tipus de bolets» lands on /bolets |

Checkpoints already scheduled: 28 September (journeys, events) and 12 October (Search Console and SE Ranking series). Add CTR by cluster and AI Overview citation share to both.

## Method and caveats

Sources: SE Ranking project 12765494 (tracked positions, Search Console feed, site audit of 15 September, AI Result Tracker, AI search database, Spanish keyword database), competitor keyword exports (bolets.com, vadebolets.cat, bolets.info, micocat.org, dos-a-la-tres.com, boletsbergueda.cat; trobarbolets.cat returns nothing), Search Console page indexing, live page and crawler checks. The database returns zero volume for 298 of 576 Catalan candidates, many with Search Console impressions, so treat volumes as a floor. The Search Console feed window is undisclosed. AI Overview presence is the SERP feature flag, not a citation check. Trend context used: AI Mode supports Catalan since February 2026; Preferred Sources extended into AI Mode in May 2026; small publishers lost about 60% of search traffic in two years (Chartbeat, March 2026); Google states llms.txt is not used.

Report page: https://claude.ai/artifact/XgsvBvPe5ubh2ZXRZikban
