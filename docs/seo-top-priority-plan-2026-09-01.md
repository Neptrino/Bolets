# SEO top-priority implementation plan — 1 September 2026

## Decision

Do not spend the first sprint rewriting the homepage, map, catalogue, edible hub, poisonous hub or `/bolets-avui`. The source and live-response audit confirmed that these pages already own their intended queries, the important aliases and safety modifiers are present, and the complete Googlebot response for `/bolets-avui` includes the dated territorial answer.

The remaining constraint is authority and distinct coverage on a very new domain. The first release should therefore protect the live-answer advantage and publish the largest safety-sensitive topic that is genuinely missing.

## Release 1 — protect current intent and fill the largest gap

Target: one focused release within one week.

### 1. Add a raw-response SEO regression for `/bolets-avui`

Add an integration check against the built application that requests the route with a crawler user agent and consumes the complete response.

Acceptance criteria:

- HTTP 200 and the canonical URL are present.
- The response includes `On trobar bolets ara a Catalunya?` after the stream completes.
- It includes one truthful result state: a current ranking, a verified-zero explanation or an unavailable/incomplete-data explanation.
- The page does not invent scores, expose exact ecological locations or trigger extra provider calls.
- Existing generation-bound caches, twelve-hour maximum lifetime and fail-closed publication rules remain unchanged.

Likely scope: `tests/e2e/seo-foundation.spec.ts` or a focused server-response integration test. Do not change the page architecture unless this regression fails in the deployed environment.

### 2. Publish a broad peus-de-rata safety guide

Proposed canonical: `/bolets/peus-de-rata`.

This guide owns the group intent around `peu de rata` and `peus de rata`; the existing `/bolets/peu-de-rata-daurat` remains the profile for *Ramaria aurea*.

Required content:

- Explain that the popular name covers multiple coral fungi and is not an edibility guarantee.
- Contrast the sourced group traits and the limits of macroscopic identification.
- Link to the existing *Ramaria aurea* profile and its toxic lookalikes without turning the guide into a new scored species.
- State that some separations may require expert examination or microscopy.
- Include visible sources, truthful authorship and the standard absence-of-independent-review disclosure.
- Add contextual links from `/bolets`, `/bolets-comestibles`, `/bolets-verinosos` and `/bolets/peu-de-rata-daurat`.

Guardrails:

- No numerical ecology, habitat score, prediction map or quantified calendar for the group.
- No blanket claim that yellow or golden ramàries are edible.
- No thin pages for singular/plural or each common-name variant.

Acceptance criteria:

- One canonical URL owns the group cluster and appears once in the sitemap.
- Article and breadcrumb structured data validate.
- Safety wording and cited distinctions have focused unit tests.
- Internal links use descriptive Catalan anchors and do not create query cannibalization with *Ramaria aurea*.

## Release 2 — add three evidence-backed reference profiles

Target: weeks 2–4, only after each evidence package passes its gate.

Priority order:

1. Sabatera — estimated demand 210 for `sabatera` plus 140 for `sabatera bolet`.
2. Lleterola vermella — estimated demand 110, difficulty 7.
3. Moixernó de tardor — estimated demand 110, difficulty 8 and distinct from the spring moixeró.

Each profile must:

- Verify the accepted scientific taxon and Catalan names against primary or institutional sources before choosing a slug.
- Enter `reference-species.ts`, not the scored species catalogue, unless justified numerical ecology exists independently.
- Use sourced habitat and season prose only; no fabricated altitude, pH, thermal response or phenology score.
- Include at least one properly licensed, attributed identification image and a useful alt description.
- Include safety limits, likely confusions, visible sources and the truthful review status.
- Receive a unique Catalan slug, catalogue entry, sitemap entry and schema/test coverage.

Do not ship all three merely to meet a date. A profile without a reliable taxonomy, safety treatment and image package remains blocked while the other profiles proceed.

## Release 3 — build evidence and links competitors already have

Target: weeks 3–8, running alongside editorial work.

### Original field-image programme

Prioritize camagroc, fredolic, rovelló, cep and rossinyol. Capture an identification view plus one habitat/context view for each, with creator, date, licence/permission and only coarse/non-sensitive location metadata. Wikimedia images remain as attributed reference material; original field photography should become the stronger editorial evidence where quality permits.

### One linkable seasonal data story

Prepare one non-sensitive aggregate story, such as how the 2026 season moved across altitude bands. It must publish method, date range, limitations and area-equivalent aggregates, and must never expose finding coordinates or imply observed presence from compatible habitat. Outreach should target Catalan outdoor, weather, tourism and mycology publishers for relevant earned citations—not bulk link acquisition.

## Measurement and decision gates

Record the baseline before Release 1 and review on days 7, 14 and 28 after deployment.

Track:

- Search Console indexing and rendered-page inspection for `/`, `/bolets-avui`, `/map`, `/bolets`, the peus-de-rata guide and five priority species.
- Query-to-page ownership; investigate only when Google repeatedly assigns the same query to the wrong canonical page.
- Impressions, clicks, CTR and average position by cluster, with special attention to positions 8–20.
- First top-20 and top-10 appearances across the 12-query SE Ranking watch set.
- Relevant referring domains and citations to the data story or original field material.

Decision rules:

- Do not create more territory pages until Search Console shows distinct demand and verified local coverage.
- Do not start recipes until the preservation and species clusters have enough impressions to judge their adjacent demand.
- Do not start a Spanish layer unless the team can maintain a complete current/map/catalogue experience.
- After 28 comparable days, optimize pages already receiving impressions before adding another content cluster.

## Explicitly out of scope for the first release

- Rebuilding `/bolets-avui` rendering: the live complete response already contains the answer.
- New canonical pages for `pota de perdiu`, `fredolic tòxic` or `apagallums tòxic`: existing pages already own those variants.
- Mass location pages, singular/plural duplicates, isolated Spanish articles or recipe filler.
- Any new prediction ecology created solely to target a keyword.
