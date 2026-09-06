# Mushroom reference: local release verification

6 September 2026. Implemented locally; no commit, push or deployment.

## What changed

- The homepage leads with the immediate prediction benefit under the “Bolets de Catalunya” identity. The map is the primary action and its preview follows the hero; catalogue discovery and the current seasonal guide remain directly accessible. The species, names, forests and seasons sections develop the broader reference underneath.
- A server-rendered homepage search and four concise topic groups connect the existing glossary, comparisons, calendar, local guides, preservation, collection guidance, anatomy guide and game.
- Main navigation exposes the species catalogue and season alongside local guides and practical tools. The existing map showcase and field notebook sections are retained.
- The homepage map preview reuses Avui’s heatmap renderer with simulated conditions over a selection of real compatible-habitat cells, clearly labelled “Exemple simulat”. The card’s primary “Bolets avui” button and image open the current territorial comparison at `/bolets-avui`. The repeated secondary map action is removed; the hero still leads directly to `/map`. The image footer is removed, with cartography attribution retained inside the map. The homepage does not fetch prediction data for this static image. `scripts/capture-home-map-preview.mjs` reproduces the local capture with intercepted prediction requests and a saved public habitat sample; its fictional response and display selection never enter the prediction model.
- Catalogue search handles accents, whitespace, punctuation, Catalan aliases, verified Spanish names and scientific names. It matches terms within a name rather than combining unrelated aliases. Shared names intentionally retain multiple results: “pinetell bord” finds both documented entries.
- GET search and the clear-search link work without JavaScript. With JavaScript, filtering remains immediate. Search results no longer run the staggered entrance animation that interfered with opening a result during the no-JavaScript test.
- Every species profile now exposes links to traits, names, lookalikes, consumption guidance, habitat/season, field card and sources. The contents navigation remains accessible as a horizontally scrollable row on phones.
- Ecology sections connect to the shared calendar; peak-month links are derived only from scored species' existing structured seasonality. Descriptive profiles receive no fabricated monthly values or map CTA.
- Non-culinary profiles use “Consum i precaucions” instead of a heading inviting cooking. Existing scientific and consumption statements were not rewritten.
- Sources and authorship can be reached directly from the contents menu. The homepage links to the editorial and corrections page with the actual review status.

## Audit and pilot journeys

The local catalogue contains 62 profiles. The older 2 September species-gap list is not a current implementation checklist: several proposed profiles already exist, including pinetell bord, rovelló de cabra, peu de rata bord, lleterola roja and cigró. This release improves discovery of the existing collection rather than duplicating those records.

| Reader task | Verified local path |
|---|---|
| Resolve a common name | Homepage search → both “pinetell bord” results → selected profile → Catalan/scientific names |
| Inspect traits and lookalikes | Species profile → identifying traits and linked lookalike profiles; existing comparison guides |
| Find season information | Profile ecology section → existing calendar; scored profiles also expose their structured peak months |
| Understand a habitat | Cep and descriptive-only false-chanterelle profiles retain useful habitat text independently of prediction data |
| Find practical guidance and provenance | Cep culinary section → preservation guide; homepage → collection guidance; contents → sources/authorship |

Desktop and phone previews were visually inspected. Automated checks cover 360, 390, 800 and 1280 px widths, including no horizontal page overflow on the reference profiles, functioning galleries and keyboard-dismissable image dialogs.

## Verification

- 78 focused unit tests passed across catalogue search, descriptive profiles, species/common-name collections and routes, SEO, editorial metadata and analytics privacy. Tests that rendered the formerly synchronous catalogue were updated to await its server-rendered query handling.
- 13 Playwright tests passed in `reference-discovery.spec.ts` and `reference-species.spec.ts`.
- The no-JavaScript tests submit and clear searches, open a profile and follow its section links without registration.
- Descriptive-profile tests verify no requests to habitat, prediction or occurrence endpoints. The cep test keeps reference content usable with a deliberately unavailable habitat endpoint.
- `npm run typecheck`, `npm run lint` (including source-size checks) and the production build passed. Responsive images were regenerated; the final build reused those generated assets through `npx next build`.
- `git diff --check` passed. Existing homepage/CSS/media work remains in the working tree.

After restoring prediction-led homepage positioning, the no-JavaScript homepage search → naming question journey passed again, as did focused homepage linting and `git diff --check`. The revised hero and map preview were visually checked at 390 px and 1280 px widths. This follow-up changed presentation and planning documents only; the full checks above preceded that adjustment.

The subsequent Avui-style simulated preview was checked at the same phone and desktop widths. Its 1,683 responsive media variants generated successfully under media version `v13`; 13 static-media and analytics unit tests, focused linting and `git diff --check` passed. The existing full-map capture is retained as an earlier local artifact.

The broad artificial patches were subsequently replaced with a public 2.5 km habitat sample for cep and pinetell, using canonical bucket URLs and rejecting truncated or invalid responses. The saved sample in `artifacts/home-map-preview/habitat-v1.json` records its request provenance and capture time. Of 4,658 distinct returned cells, the illustration selects 1,195 with at least 40% altitude-weighted compatible coverage; their real coverage attenuates a fictional response. That selection is an illustration choice, not a production habitat gate or a claim about current conditions. The final imagery uses media version `v14`; all 1,683 responsive variants regenerated successfully. The 13 static-media/analytics tests, focused linting and whitespace checks passed again, and the final card was visually checked at 390 px and 1280 px widths.

An intermediate browser run overlapped regeneration of the optimized image directory and encountered missing images; the final run started with complete assets. A separate repeatable no-JavaScript result-opening failure was resolved by removing the catalogue entrance animation, not by bypassing the test interaction.

## Architectural note and limits

The final card copy and CTA follow-up was checked against the existing SEO intent plan, the 6 September SE Ranking report and Google's title/link guidance. It retains the agreed homepage title/H1, uses “Bolets avui: condicions per territori” as the card heading and removes the image footer. The existing SEO ownership test now inspects the rendered homepage, including the extracted card and its crawlable links, rather than expecting the former inline markup. All 14 SEO-ownership/analytics tests, TypeScript, focused linting and whitespace checks passed; the card was visually checked at desktop and 390 px widths. This presentation-only follow-up did not repeat the full production build.

`/bolets` now renders the submitted, bounded `q` parameter on the server so search works without JavaScript. Its canonical URL remains `/bolets`; it reads the version-controlled catalogue, not a database or external search service. The homepage remains statically rendered. No new analytics events, remote settings or prediction inputs were introduced, and query strings remain excluded by the existing analytics privacy guard.

This is Release 1 of the broader reference plan. Contextual saving/authentication continuation and a species-first El meu bosc dashboard remain Release 2 work. New editorial subject groups, recipes, model evaluation and longer-term outcome measurement remain later work. Production parity, field performance improvements and traffic/conversion impact are not claimed from this local verification.

## Main release preparation

The user subsequently requested publication to `main`, after explicitly reverting the contextual saved-interest implementation. This release contains only the retained homepage/reference work and its research and planning records. The agreed homepage title and H1 remain unchanged.

Final checks on the retained changes: 1,253 unit tests passed (eight skipped), lint/source-size checks passed, and the production build including TypeScript passed. All 13 reference browser tests passed against the production build on loopback port 3102, including mobile, no-JavaScript search and unavailable habitat data. An initial run against the development server had two search interaction timeouts while other checks were running; the complete production-build run passed without code or test changes. Deployment success must be checked separately in the repository's main-branch workflow.
