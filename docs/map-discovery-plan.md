# Map discovery and use

Status: implementation plan, 14 September 2026; Release 1 and Release 2 code changes were applied in the working tree the same day (homepage map section, visible map introduction, consolidated "mapa de bolets" anchors, guide and zone closing map blocks, fixed `homepage-map-section-click`, `avui-map-open` and `guide-map-open` events). SE Ranking landing pages on 14 September show Google returning the homepage, not `/bolets-avui`, for "on trobar bolets avui" (19), "mapa bolets avui" (7) and "on hi ha bolets avui" (12); only "on trobar bolets aquesta setmana" lands on the overview. The homepage therefore keeps a second H2, "On trobar bolets avui", as a strip under the map demonstration, with an exact-phrase anchor to `/bolets-avui`. A verified public map capture is still pending, so the labelled simulation remains. Released to production on 14 September 2026 at revision b488578 (commit 739c510 plus a sitemap fix) through the GitHub Actions VPS deploy; public journeys smoke-tested after activation. This document does not authorize a deployment or schedule monitoring. Evidence: [competitor review](archive/map-search-competitors-2026-09-14.md), [map discovery diagnosis](archive/map-discovery-2026-09-14.md), [analytics review](archive/analytics-review-2026-09-14.md). Complements the [product roadmap](product-planning-journey-plan-2026-09-06.md); its saved-interest work remains outside this scope.

## Outcome and scope

Help people searching for a mushroom map of Catalonia understand the product, reach the appropriate view and use it. Improve acquisition across the homepage, `/map`, Avui and existing local guides. A homepage ranking for map queries is a valid outcome; do not force a landing-page switch.

Keep the homepage H1 “Bolets de Catalunya. Mapa, espècies i temporada.” and title “Bolets de Catalunya: mapa, espècies i temporada”. Keep the immediate map action, the preview directly after the hero and prominent reference discovery below. Retain public map access, current resolution rules and shared prediction data. This plan adds neither a new landing URL nor another prediction/briefing system.

## Before implementation: establish the release baseline

- Check the deployed revision against the current repository. Reconcile the newer map explanation and the existing local footer/sitemap corrections before modifying them; an unshipped change cannot explain a ranking improvement.
- Record the release date and save complete comparable GSC windows: the last 28 available days and preceding 28 days. Inspect the exact query and a defined map-query cluster, landing pages and device segments. Keep property totals separate from page aggregation. Retain the SE Ranking Catalan and Spanish desktop series separately.
- Verify the existing homepage CTA and map-use events. Establish session-based counts where available; raw repeated events are not unique converters. Keep map-query search metrics separate from all-organic map journeys: GSC queries cannot be joined to individual Umami sessions.
- Audit representative current journeys on mobile and desktop: homepage → map, homepage → Avui → map, Avui territorial row → map, local guide → contextual map. Record unclear copy, incorrect destinations or lost context before proposing link changes.

Baseline reference: on 14 September the exact query ranks 32 in Catalan desktop SE Ranking, versus Va de Bolets 1 and Trobarbolets 3. The earlier GSC 28-day map-containing cohort had 10 clicks/247 impressions; these are different reporting scopes. Sample size is too small for a reliable short A/B test.

## Release 1: explain and demonstrate the map

### Homepage

Owner: `app/page.tsx`, `components/home-map-feature.tsx`, its owned stylesheet and existing static-media pipeline.

- Keep the hero's direct map CTA. Refocus the following demonstration on the interactive map, with proposed H2 “Mapa de bolets de Catalunya” and short copy explaining how to compare species, areas and days.
- Make the preview and its primary action consistently open `/map`. Retain a secondary text link to `/bolets-avui`, labelled as today's territorial summary. This explicitly changes the current preview destination from Avui to the map to match what the section demonstrates.
- Replace the simulated preview with a representative, verified public map capture if one is available. Record its date, species/view and source generation beside the asset; visibly label it as an example from that date. It must remain understandable at phone size. Do not label a fixed image as today's map. If no suitable verified capture is available, retain the clearly labelled simulation until one exists.
- Include a compact explanation: choose a species, compare areas, then check the day and legend. Explain that colours describe conditions, not confirmed mushroom locations. Reuse existing visual language and avoid an additional interactive homepage map or new heavy requests.

### Map entry

Owner: `app/map/map-page-content.tsx`, existing map styles and `src/lib/map-seo.ts` only if the content audit warrants it.

- Expose one concise, server-rendered explanatory sentence alongside the existing heading: compare conditions by area, species and day; predictions do not confirm findings. Keep extended explanation, sources and methodology in the existing information panel.
- Preserve the usable opening viewport, controls and map gestures on small screens. No blocking tutorial or extra step before opening the map.
- Reuse the existing day/freshness and legend components. Check withheld/stale states; the introduction must not claim fresh observations when data is unavailable.
- Retain canonical URLs and truthful structured data. Change editorial dates only for a substantive content change; do not create annual doorway pages or add repetitive SEO text.

Release 1 acceptance: the homepage preview matches its destination, the daily-summary alternative is clear, a first-time visitor can understand the map without expanding a panel, and all existing map interactions remain usable. Keyboard access, mobile layout and reference discovery remain intact.

## Release 2: improve Avui and guide-to-map continuity

Owner: `app/bolets-avui/page.tsx`, the existing local-guide route/template and shared territorial map helpers, identified during the audit.

- Avui already has row-level map links, narrative links and a full-map action. Improve their placement or labels only where the audit identifies ambiguity; do not add another block of duplicate buttons.
- Pilot the existing local guides that already receive search traffic: Port del Comte, Rasos de Peguera, Setcases and Bellver. Verify current analytics before finalizing the pilot. Make the distinction between general habitat/season and current conditions explicit.
- Ensure contextual map links retain the intended species and territorial bounds, and verify displayed day continuity where the existing route supports it. A missing-data state still offers useful reference content and a clearly labelled map destination.
- Apply validated improvements through the shared template. Retain non-map next steps where they better serve identification or learning intent.
- Add fixed allowlisted events for Avui-to-map and guide-to-map clicks only if current instrumentation cannot distinguish these transitions. If the new homepage preview needs a distinct event, add one fixed name rather than dynamic properties. Emit through the existing privacy-safe mechanism, on the neutral virtual path, with no species, coordinates, query strings, account data or private route context.

Release 2 acceptance: all pilot journeys open the intended map context on mobile and desktop; links are understandable without duplicated actions; event validation shows no sensitive data and no tracking when DNT applies.

## Verification and release

For each release, run relevant SEO/navigation/analytics tests, type checks, lint and the production build. Add focused journey coverage where destinations, context or analytics boundaries change; avoid tests that simply freeze marketing wording. Inspect mobile and desktop layouts, keyboard use, heading structure, canonical output, unavailable-data states and map gestures. Confirm the homepage does not start a new map bundle or data fetch on first paint.

Deploy through the normal verified release workflow when implementation is authorized. Record the exact revision and release date; smoke-test the public journeys and assets after deployment. Request indexing only when quota allows, without treating a successful request as a ranking guarantee. Revert the affected presentation/link change if it obstructs map use or breaks context; do not alter the prediction model as an SEO rollback.

## Measurement and decisions

- Immediately after release: check navigation, rendering, event delivery and privacy. These checks establish correctness, not SEO impact.
- After 14 complete days: assess eligible homepage-to-map, Avui-to-map and guide-to-map sessions and their subsequent map interactions, using cohort-compatible denominators. Monitor organic arrivals separately. If counts are too small, report counts and continue collecting rather than declaring a winner.
- After 28 complete days: compare GSC map-query impressions/clicks and relevant landing-page performance against the preceding window, using complete dates and device segments. Review the daily rank series rather than one snapshot. Annotate release dates, seasonal demand and other site changes; a before/after difference alone does not establish causality.
- Success means sustained growth in relevant search discovery and more visitors reaching and using the map without usability regression. No guaranteed rank or percentage uplift is assumed. If impressions grow but CTR stays weak at comparable positions, revisit the search promise; if arrivals grow but use does not, inspect the entry experience. If visibility remains weak, investigate indexing/internal links and competitor referring domains before commissioning more content.

These are manual review checkpoints, not a created automation. Instagram, model changes, paid promotion and backlink outreach are outside these releases.
