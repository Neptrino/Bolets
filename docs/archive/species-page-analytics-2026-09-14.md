# Species detail page review — 14 September 2026

Read-only review of `/bolets/<slug>` pages. Umami read through the owner's logged-in browser session (`/api/websites/<id>/metrics|stats|events`), window **31 Aug–13 Sep 2026** (Europe/Madrid). Search Console via the SE Ranking connector (rolling window). SERP: SE Ranking desktop, ca/ES, 14 Sep. Nothing was changed.

## Umami

`metrics?type=path` returns visitors per path (72 species pages, 424 visitor-page pairs of 5,009 site-wide, 8.5%). Comparators: `/bolets` 161 visitors, `/zones/ceps` 135, `/bolets-avui` 797.

| Page | Visitors | Visits | Pageviews | Bounces | Bounce % |
| --- | ---: | ---: | ---: | ---: | ---: |
| /bolets/cep | 68 | 72 | 103 | 19 | 26 |
| /bolets/pinetell | 30 | 32 | 50 | 9 | 28 |
| /bolets/ou-de-reig | 24 | 25 | 29 | 12 | 48 |
| /bolets/cep-rogenc | 19 | 20 | 24 | 6 | 30 |
| /bolets/cep-d-estiu | 19 | 20 | 23 | 14 | 70 |
| /bolets/rovello | 17 | 18 | 30 | 2 | 11 |
| /bolets/camagroc | 15 | 18 | 21 | 4 | 22 |
| /bolets/apagallums | 14 | 21 | 34 | 6 | 29 |
| /bolets/fredolic | 12 | 13 | 15 | 6 | 46 |
| /bolets/camasec | 10 | 11 | 14 | 4 | 36 |
| /bolets/llenega | 9 | 10 | 11 | 3 | 30 |
| /bolets/pet-de-llop-gegant | 9 | 10 | 15 | 4 | 40 |

- Entry pages: species pages start 76 of 1,924 visits (4%). Exit pages: 96 of 1,942 (5%). Against roughly 450 species-page visits, ~17% land directly and ~21% leave there; the rest arrive from and continue to other site pages.
- Referrers on species pages are almost all empty (internal navigation). Google: cep 10, cep-d-estiu 4, cep-rogenc 1, apagallums 1, ou-de-reig 1. Facebook: ou-de-reig 4.
- Device on /bolets/cep: mobile 55, laptop 8, desktop 4, tablet 1.
- `totaltime` with a path filter only accumulates between pageviews of the same path, so per-page dwell is not measurable from this API.
- Events (site-wide, two weeks): species-map-open 103, infographic-downloaded 16, infographic-shared 0. All custom events are recorded with `urlPath=/analytics-event` (privacy design in `src/lib/umami-privacy.ts`), so they cannot be attributed to species pages versus local guides or the catalogue infographic.
- Journey report rows for species paths are capped and sparse (cep 17 of 72 visits); not used.
- No in-page instrumentation exists: section visibility and "Contingut" anchor clicks are not tracked.

## Search Console (species queries, rolling window)

All species-name queries below have 0 clicks. Rare species rank top 3 and still get no clicks; popular ones sit at 20–70.

| Query | Impressions | Position |
| --- | ---: | ---: |
| rovelló | 68 | 68 |
| ou de reig | 79 | 55 |
| fredolic | 77 | 51 |
| trompeta de la mort | 81 | 54 |
| llenega blanca | 85 | 48 |
| camagroc | 68 | 29 |
| farinera borda | 85 | 27 |
| rossinyol bolet | 78 | 20 |
| cortinari rogenc | 82 | 1.6 |
| candeleta de prat | 92 | 2.6 |
| carner bord | 72 | 5.3 |
| matagent | 94 | 9.8 |
| pollancró | 75 | 8.1 |

Modifiers that appear repeatedly: `confusions`, `toxic`, `comestible`, `bord`, `vs pinetell`, `en castellano`, `diferencia entre pinetell i rovello`.

## SERP "rovelló bolet" (ca/ES desktop, 14 Sep)

1 ca.wikipedia (infobox: edibility + photo at top, Descripció/Gastronomia/Hàbitat, ~470 words) · 2 bioports.org "Hi ha diferències entre un rovelló i un pinetell?" (~500 words, two side-by-side photos) · 3 bolets.com/rovello.html (~1,500 words, photo first, confusions near the end) · 58 bolets.app/bolets/rovello · 86 /bolets/rovello-de-cabra · 95 /bolets/pinetell. Fungipedia (es): edibility badge + photo above the fold, description → habitat → confusions → GBIF map, ~650 words.

## Our page on a 375 px viewport (rovelló)

Total height 12,177 px (~15 screens) for ~830 words. Section tops: hero 0 (photo carousel from ~870 px, below the first screen) · nav chips 1,116 · "què cal saber" summary + 7 links 1,204 · identification 2,215 (lookalikes near its end, ~screen 5) · cuina 4,442 · ecologia 6,161 · distribució 8,523 · targeta de camp 10,023 · footer 11,759.
