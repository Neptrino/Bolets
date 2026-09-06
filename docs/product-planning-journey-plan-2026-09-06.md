# Plan: a mushroom reference for Catalonia

Status: Release 1 implemented and verified locally on 6 September 2026; see [local release verification](reference-release-local-2026-09-06.md). Nothing committed or deployed. Releases 2 and 3 remain planned. This roadmap pairs prediction-led acquisition with broader reference improvements; the map-to-save specification is retained as a bounded part of the roadmap.

## Outcome

Bolets should become a useful, trustworthy reference for mushrooms in Catalonia: their names, distinguishing characteristics, seasonality, habitats, cultural and practical uses, and responsible observation in the field. This is an ambition to earn through content and usefulness, not a claim of scientific authority or comprehensive coverage.

Predictions are the immediate selling point and lead homepage acquisition: help visitors understand where conditions are favourable, open the map directly and demonstrate it immediately after the hero. The wider reference gives people reasons to learn, return and trust Bolets. A reader who resolves a naming question, learns a distinguishing feature, understands a habitat or consults a seasonal guide has also received value; those pages keep next steps appropriate to their purpose.

The first release improves access to and connections within the reference material. The second completes contextual saving and the guide-to-map journey where relevant. Ongoing editorial work expands depth and trust, including species that have no prediction model.

## Product structure and editorial direction

| Reader's intent | Role of Bolets | Existing foundations |
|---|---|---|
| Know a mushroom | Find Catalan and scientific names, photographs, traits and lookalikes | `/bolets`, species profiles, name glossary, identification guides |
| Understand when and where it grows | Connect seasons, forests and broad territories with species | `/temporada`, seasonal guides, habitat maps, `/guies`, `/zones` |
| Prepare and enjoy a responsible outing | Consult conditions, access guidance, field practices and preservation | `/map`, `/bolets-avui`, regulations and conservation pages; existing recipe roadmap |
| Keep learning and contribute | Keep species/territory interests, record findings and propose corrections | El meu bosc, findings, contribution and editorial workflows |

These are visitor intents, not a requirement to add four top-level menus or build four new systems. Keep the interface compact and connect existing pages first.

Content decisions:

- Cover familiar, unusual, toxic and non-edible fungi when they help readers understand Catalonia's mushrooms. Prediction eligibility does not determine catalogue value.
- Prefer complete, sourced topic groups over species-count targets: a profile, meaningful lookalike destinations, names, season and habitat context.
- Give reference pages appropriate next steps: compare a lookalike, consult a name, understand a forest, see the season, save a species or open the map when useful. Do not make the map the universal primary CTA.
- Keep descriptive profiles separate from scored ecology. Never fabricate numerical parameters to make a new editorial subject appear in predictions.
- Use credited, licensed diagnostic photography for reference claims. Clearly distinguish generated/decorative imagery from identification evidence.
- Make sources, truthful authorship, correction routes and actual review dates easy to find. Maintain the stated absence of independent mycological review; no new expert-approval or indexing gate is introduced.
- Expand preparation, recipes and cultural material through their existing plans and authentic source material. Do not invent first-hand experience, tested recipes or regional traditions.

## Revised release order

### Release 1 — make the reference easier to use

**A. Audit the existing reference journeys.** Check the deployed catalogue, search aliases, species template, seasonal guides, local guides, glossary, identification comparisons and editorial attribution. The species-gap review from 2 September is historical: reconcile its proposals against today's catalogue before adding anything. Likewise, reuse the existing recipe plan rather than starting a competing content system.

Choose five representative task paths from existing content: resolve a Catalan name; find a species' distinguishing traits and lookalikes; understand its season; learn its habitat; find responsible collection or preservation guidance. Include a descriptive-only species and a non-edible/toxic subject. A public educational journey must work without an account or a functioning prediction service.

**B. Clarify homepage and discovery.** Preserve the agreed SEO H1 “Bolets de Catalunya. Mapa, espècies i temporada.” and title “Bolets de Catalunya: mapa, espècies i temporada”. Lead with the practical prediction benefit in the supporting copy and primary map action. Keep catalogue discovery and the current seasonal guide directly accessible, and place the map demonstration immediately after the hero. Follow with catalogue search, learning paths and seasonal species so visitors can discover the wider reference. Verify the header labels distinguish the species catalogue, local guides and practical tools; reorganize only where the audit shows ambiguity.

**C. Improve one reusable species-page pattern and apply it to the pilot.** Make the name, diagnostic photographs, distinguishing traits, lookalikes, season and habitat easy to scan on mobile. Connect existing glossary, comparison and seasonal content. Keep references and review status visible, and show prediction tools only for supported subjects. Reuse the catalogue's shared template for both descriptive and scored profiles.

**D. Complete one pilot topic group.** Start with the existing ceps hub and linked profiles because acquisition evidence already supports it, together with the representative non-prediction journeys above. First repair missing links, unclear naming and incomplete explanation. Add profiles or articles only when the audited gap has reliable sources and suitable media; do not duplicate completed catalogue expansion. Select the next group from actual coverage gaps and reader needs, rather than committing to another fixed article count now.

Primary surfaces: `app/page.tsx`, `components/site-header.tsx`, `app/bolets/page.tsx`, `components/species-directory.tsx`, `app/bolets/[slug]/page.tsx`, shared species/profile components, catalogue data and existing editorial records. Source search already includes common names, scientific names, alternate names and family; test its behavior before proposing a new search engine.

Release 1 acceptance:

- Each representative reader task has a clear entry and a useful answer on mobile without registration or map use.
- The homepage leads with the prediction benefit and a primary map action, followed immediately by the map preview. Catalogue and seasonal learning retain first-screen links and prominent discovery below.
- A descriptive-only species is fully discoverable and useful without invented conditions, scores or prediction CTAs.
- The pilot topic group's names, lookalikes, seasons and habitat links resolve to canonical pages and consistent data.
- Media provenance, supporting sources, authorship and actual review status are accessible; citations are not presented as endorsement.
- Reference content remains readable when dynamic condition data fails. A successful reference visit does not require a save or map conversion.

### Release 2 — connect learning, planning and saved interests

Enable species-only saving from profiles as well as species/territory saving from local guides and the map. El meu bosc must keep a saved species useful through links to its profile, season and lookalikes, even when no current territorial reading is available. Reuse existing preferences; do not introduce a separate bookmark store in this release.

Complete the detailed guide → map → save specification below as part of this release. Its mobile and analytics work remains bounded to that journey.

### Release 3 — deepen reference coverage and trust

Extend the validated page patterns to the next audited topic group. Prioritize missing lookalikes, Catalan name ambiguities, non-edible fungi, seasonal/habitat explanations and useful local distinctions. Keep maintenance and corrections in the publishing workflow; do not equate more pages with a better reference.

Develop practical/cultural material through the existing preservation and recipe work when its source material is ready. Improve contribution explanations and verified evaluation reporting as described below. Any broader search, community or content-management system needs its own demonstrated use case.

## Evidence and existing work

The [analytics review](product-priorities-analytics-2026-09-06.md) identifies one valuable journey, with caveats about small samples, changing instrumentation and different reporting periods. It does not define the product's whole purpose or establish that reference content has less value:

- Search Console: `/zones/ceps` received 59 clicks; Port del Comte, Rasos de Peguera, Setcases and Bellver guides already attract relevant searches.
- Umami, 29 August–4 September: 77% of reported visitors used mobile; `/map` had 218 visitors and `/bolets-avui` 92. These overlapping audiences must not be added together.
- The existing signup funnel had only 12 starters and seven completions. We cannot infer abandonment reasons or demand for alerts from this sample.

Repository inspection changes the scope from the initial product suggestions:

| Existing capability | What remains to do |
|---|---|
| Local guides already stream current readings, extent, limiting factor, freshness and a matching map link | Verify production state and continuity; improve placement or copy only where needed |
| `territorialMapPath` already carries species, region and bounds | Retain canonical territory identity for saving; verify the displayed scoring window is preserved |
| El meu bosc already stores species and territory preferences and builds current readings | Add contextual entry and preserve selection through authentication |
| Preferences are independent species and territory lists | Add to those lists; do not imply a saved coordinate, route or exclusive species/territory pair |
| Authentication uses a strict return-destination allowlist | Extend only for a validated forest preference proposal; retain redirect protection |
| The homepage has an uncommitted `HomeMapFeature` with direct map access and an Avui link | Coordinate with this work and verify its release before any homepage redesign |

Existing homepage, CSS and media edits belong to ongoing work and must not be overwritten by this plan's implementation.

## Release 2 specification: guide → map → save

### 1. Establish the current baseline

- Verify the deployed versions of the ceps hub and the four named local guides. Resolve their canonical routes through the catalogue, not assumptions based on route-folder names.
- Check mobile navigation, species, territory, layer and scoring-window continuity from guide to map, including reload and browser back.
- Record loading and interaction measurements on the same device/network setup for comparison after changes. Use available route timings and browser traces; do not introduce new infrastructure.
- Document release activation times and the actual event definitions. Keep existing events stable while introducing any missing funnel stages.

Deliverable: a short baseline and gap list attached to the implementation PR. Already-working behavior requires no rewrite.

### 2. Preserve the user's context

For a local guide, resolve the canonical species ID and existing overview-hub territory slug. Keep them when opening the matching map. Validate any URL context against the existing catalogues. A generic map viewport must not silently become a saved territory: if no canonical territory is selected, offer the existing territory picker.

The map's current condition must continue to match the guide's species, bounds, layer and scoring window. Saving a preference stores the species and territory only; it does not save a historical date or promise the same score on return.

The combined-species view must not save `all` as a catalogue species. Let the user select a supported species or save only the selected canonical territory, explaining what was saved.

Primary implementation surfaces:

- `app/zones/[place]/[species]/[guide]/page.tsx`
- `components/ceps-local-guides.tsx`
- `src/lib/territorial-map.ts`, existing map query/link utilities
- Existing map controls and territory context

### 3. Add contextual saving

Offer saving on species profiles, next to a useful territorial reading or in the map's selected-territory controls, without obstructing reading or map gestures. Use copy such as “Desa a El meu bosc”, with supporting text naming the species and/or territory being added. A profile supports species-only saving, including descriptive-only catalogue records.

Signed-in flow:

1. Show the proposed species and/or territory.
2. On the explicit save action, add them to the authenticated owner's existing preferences.
3. Confirm success with “Preferències desades” and an “Obre El meu bosc” link. Show an already-saved state when applicable.

Signed-out flow:

1. Explain that an account lets the visitor keep these interests and return to their reference information and available current readings later.
2. Carry a validated proposal through the existing authentication flow to `/compte/bosc`.
3. Present the named proposal for confirmation after authentication. Do not save merely because a GET page was opened.
4. After saving, offer the saved species reference and, when applicable, the relevant current reading or an honest unavailable/out-of-season state. A species-only preference must not lead to an empty dashboard whose only instruction is to choose a territory.

Use narrowly parsed canonical species/territory parameters on the private forest destination. Extend the return-destination allowlist to that typed destination only; reject arbitrary paths, external origins, unknown values and oversized input. Carry the same normalized destination through supported code/OAuth/callback paths. Do not broaden the redirect helper to accept arbitrary query strings.

Reuse the existing owner-scoped preferences and server-side database access. The contextual operation must add idempotently, preserve other preferences, respect list limits and avoid stale read/write replacement of concurrent changes. No new saved-coordinate or paired-preference data model is required. On failure, retain the proposal and make retry possible without claiming success.

Primary implementation surfaces:

- `components/my-forest/preference-manager.tsx` and a small shared contextual-save component
- `app/compte/bosc/page.tsx`, `components/my-forest/dashboard.tsx`
- `src/lib/my-forest/{schema,preferences,preferences.server}.ts`
- `app/api/me/forest-preferences/route.ts`
- `src/lib/findings/access-destination.ts`, access form and auth callback

### 4. Make the mobile reading understandable

Keep the existing map architecture and shared controls. The initial work is an information-hierarchy adjustment:

- Keep species and date accessible; show the condition label before detailed numbers.
- In the selected-cell/territory explanation, show the update time and a short description derived from existing verified fields. Do not infer a causal explanation that the model does not support.
- Label the best-sector reading separately from how widespread favourable conditions are. Preserve verified zero, withheld, stale and incomplete states.
- Place supporting measurements in the shared expandable detail surface. Ensure overlays do not capture unintended pan/zoom gestures or obscure attribution and essential controls.
- Keep the save action attached to the named territory, rather than implying that an exact clicked location is stored.

Use existing UI components, solid backgrounds and typography tokens. Keep the MapLibre stylesheet in `app/globals.css`. Read the installed Next.js guides before implementation.

### Release 2 acceptance criteria

- On the priority guides, a visitor reaches the correct map without reselecting species or territory; the reading's scoring window remains consistent.
- Signed-in and signed-out visitors can save canonical preferences without losing existing selections. Repeat clicks and retries do not duplicate them.
- Authentication completion preserves the proposal; cancelled or failed authentication leaves public map access available.
- No preference mutation occurs on navigation alone. Unknown/tampered proposals and external return URLs are rejected safely.
- A returning user sees current readings for saved interests, or an explicit unavailable/out-of-season state. No unimplemented “improved since last visit” claim appears.
- Species-only interests, including descriptive profiles, remain useful through reference links. The absence of a forecast does not appear as a failure to save.
- At 360–390 px widths, the principal flow works with touch and keyboard, readable text, visible focus, and usable map gestures.
- Private routes, selections, coordinates, referrers and auth return queries are excluded from analytics payloads.

## Measurement

Evaluate the reference and the planning tool separately. Reference-page traffic is not merely the top of a map-conversion funnel. Report learning/discovery, planning and optional participation as distinct outcomes.

For Release 1, use existing public-page analytics and GSC to track species, identification, names, seasonality and practical-guide page groups separately. Verify the five representative reader tasks manually; assess answer clarity rather than declaring a long session, a scroll or multiple clicks proof of learning. A short visit can successfully answer a question. Reconcile the historical keyword and species-gap research with current coverage before prioritizing further publication. Do not create new behavioral tracking simply to assign a learning score.

For Release 2, retain the bounded funnel below:

Reuse existing `species-map-open`, `map-cell-click`, `signup-started` and `user-signup` events. If a guide-specific distinction is needed, use one fixed allowlisted event rather than dynamic labels. Add only the missing fixed stages: contextual save started and contextual save completed. Completion fires after a confirmed successful mutation, not after an optimistic click or page load.

Use the established neutral virtual conversion path. Never attach species, territory, coordinates, account identifiers, private-route context, URL queries or fragments. Respect Do Not Track and disabled analytics. Preserve the existing tracking boundary and test the outbound payloads.

Evaluate:

| Question | Evidence |
|---|---|
| Can readers find and use the reference? | Five representative task checks; canonical navigation and catalogue-search checks, including non-predicted species |
| Is reference discovery broadening? | Separate GSC/public-page trends for species, names, identification, season and practical guidance; account for position and seasonality |
| Is the reference dependable? | Pilot content audit of provenance, lookalike links, naming consistency and correction handling; no fabricated review claims |
| Do guide visitors reach the map and interact? | Same-session, report-defined guide → map → cell-interaction funnel where supported; show raw counts |
| Can people complete contextual saving? | Fixed save-start → save-complete funnel, supported by functional tests |
| Is mobile use easier? | Repeat the same task/device checks and compare measured loading/interaction behavior |
| Are saved preferences useful on return? | Manual return-visit scenarios and optional user feedback; no private-page tracking or new persistent identity |
| Is acquisition improving? | Separate GSC page/query trends over a longer comparable period, with seasonality and campaign changes noted |

Start the stable baseline once instrumentation is deployed; do not compare new events with earlier zeros. Review after two complete weeks, extending observation if counts remain small. This is a suggested manual review, not an automation. No percentage uplift or statistical significance is promised. Fix broken journeys immediately; treat conversion movements as directional evidence, not proof of causation.

## Supporting planning and contribution work

### Avui and current-condition clarity within Release 2

Build on the homepage's prediction introduction and map preview described in Release 1. Keep the hero’s primary action pointed directly to `/map`. The preview card introduces today’s territorial comparison: its primary “Bolets avui” button and preview image open `/bolets-avui`. Do not repeat the hero’s map action inside this card. Preserve the catalogue and learning sections that follow the introduction.

If current summaries are added to the homepage, reuse the shared cached overview in an independently streamed section. The hero and map CTA must render without waiting for data. Include freshness and favourable-area extent; show honest unavailable or low-condition states instead of always presenting “promising areas”. Do not place dynamic readings inside the existing daily static freshness assumption without an explicit cache design.

On Avui, evaluate repeated territories and comparison labels with concrete mobile tasks before changing grouping. Preserve species attribution, extent and exact scoring-window map links. Do not build another weekend landing page or a parallel overview model.

### Prediction trust and contribution explanations within Release 3

Bring existing freshness and uncertainty explanations beside readings, with a concise method link. Publish model evaluation only after provenance, held-out evaluation and limitations are reviewable; competitor AUC claims do not establish a target or our relative accuracy.

Unify contribution-access copy using existing rules: public 2.5 km; a qualifying public finding with a public photo may grant 1 km for seven days at most once per 30 days; reviewed contributions grant 1 km and 250 m for 30 days. Use the rules' single source of truth and avoid suggesting that registration itself unlocks detail.

Historical change summaries and alerts require a separate evidence and storage assessment. The current dashboard shows current readings, not a verified change since the previous visit.

## Verification and delivery

Split Release 1 into reviewable changes: (1) audited homepage/catalogue navigation, (2) reusable species-page improvements and connected pilot content, (3) task verification and baseline reporting. Do not overhaul sections already working well or overwrite the current homepage changes.

Split Release 2 into reviewable changes: (1) context and destination validation, (2) contextual saving and authentication continuation, (3) mobile hierarchy and final funnel instrumentation. Each change must remain usable on its own; expose the save action only when its complete path works.

For reference changes, validate catalogue/schema consistency, alias lookup, canonical routes, descriptive-versus-scored rendering, internal links and source/media attribution. Verify useful reading without client JavaScript and when prediction data is unavailable. Add focused tests for changed reusable behavior; do not mirror static editorial prose in tests.

Extend meaningful existing tests for territorial URLs, canonical preferences, return-destination validation, ownership and additive saving. Cover authenticated and unauthenticated end-to-end journeys, existing preferences, duplicate/retry behavior, stale data and failed saves. Exercise supported authentication variants without sending unsolicited real emails. Inspect network payloads for analytics exclusions and use representative mobile widths for map control checks.

Run relevant tests, typecheck, lint/source-size checks and build for implementation changes. Verify production behavior through the existing deployment process and retain its rollback path. Record any unavailable real-provider checks explicitly.

Native apps, subscriptions, newsletters, extra prediction layers, model rewrites and infrastructure expansion are outside this plan. The first release is complete when the pilot reference journeys are clear, connected and useful on their own. Map and saved-interest improvements support the larger ambition of becoming a mushroom reference for Catalonia.
