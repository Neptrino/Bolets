# Recipe CMS and content plan — 3 September 2026

## Decision

Launch the recipe section as a version-controlled, validated JSON catalogue rather than a database CMS. One shared hub and one shared recipe template will render every page. This is the smallest architecture that supports the first 15 recipes, preserves editorial review and immutable deployments, and can later be backed by Supabase without rewriting the public pages.

Use Supabase only when browser editing, multiple contributors, scheduled publication or frequent post-deployment edits become real requirements. The public recipe pages must never read Supabase from the browser.

## Information architecture

- `/receptes` — canonical recipe hub.
- `/receptes/[slug]` — one canonical page per distinct dish.
- `/conservar-bolets` — remains the canonical preservation and storage guide.
- Species profiles link only to recipes that use that exact species or an explicitly supported substitution.
- Recipe pages link back to the relevant species profiles, preservation guidance and edible-mushroom safety material.

Do not create separate pages for spelling variants, singular/plural keywords, oven versus pan variations, or every permissible mushroom substitution.

## Content system

Store one record per file under `data/recipes/`, with a small typed index and a Zod schema. The public rendering layer should depend on a repository interface rather than importing storage details directly, so a future database adapter can replace the JSON adapter.

Suggested structure:

```text
data/recipes/
  estofat-de-vedella-amb-bolets.json
  rovellons-a-la-brasa.json
  pasta-amb-camagrocs.json
  index.ts
src/lib/recipe-schema.ts
src/lib/recipes.ts
app/receptes/page.tsx
app/receptes/[slug]/page.tsx
```

### Required record fields

- Identity: stable ID, Catalan slug, title, short description and publication status.
- Editorial provenance: `original`, `site_original` or `traditional_adaptation`; author; tested date; publication date; updated date; and source notes.
- Classification: meal type, technique, season, difficulty and relevant canonical `speciesId` values.
- Timing and yield: preparation, cooking, optional resting time and servings.
- Ingredients: structured groups with amount, unit, ingredient and optional note.
- Method: ordered steps with a short heading and complete instruction.
- Safety: identification notice, cooking requirement, raw/undercooked flag, species-specific warning and safe alternative when required.
- Practical guidance: equipment, allergens, substitutions, storage and reheating.
- Media: version-controlled local WebP, attribution, alt text and optional step association.
- Search presentation: SEO title, description and concise keywords.
- Sources: historical or institutional references used for context; never copied recipe prose.

Do not calculate or publish nutrition data unless it comes from a documented, reproducible source. Do not duplicate species edibility or identification facts in recipe JSON: resolve those from the canonical species catalogue.

### Publication states

- `draft`: available to tests and previews but absent from public lists and sitemap.
- `published`: visible on the hub, routable and included in the sitemap.
- `archived`: removed from discovery while preserving the stable record and redirect decision.

The build must fail for duplicate slugs, unknown species IDs, invalid dates, missing authorship, empty ingredient groups, unordered steps, missing safety treatment or a published record without suitable media.

## Public template

Build the recipe page with `PageShell`, `PageHeader` and `SectionHeader`, extending shared components only when the recipe collection needs a reusable variant. Use solid backgrounds and the existing type scale.

Every published page includes:

- An immediate summary with servings and preparation/cooking time.
- Original or traditional-adaptation attribution.
- Ingredients and numbered method that work without client JavaScript.
- A concise, prominent mushroom-identification and cooking notice.
- Allergens, storage and reheating.
- Exact related species and useful substitutions.
- Recipe and BreadcrumbList JSON-LD generated from the same record.
- Contextual links to the species profile and `/conservar-bolets`.

Serve the recipe photographs through the existing build-time responsive media system. Do not use remote runtime image transformation for version-controlled editorial images.

## Recipe collection

### Batch 1 — launch collection

Publish the first six once the content and photography are complete.

| Recipe | Canonical path | Role | Gate |
| --- | --- | --- | --- |
| Estofat de vedella amb bolets | `/receptes/estofat-de-vedella-amb-bolets` | Largest validated recipe query: 320 estimated searches, difficulty 5 | Keep distinct from fricandó: diced/stewed meat rather than thin floured slices and picada-led sauce |
| Rovellons a la brasa | `/receptes/rovellons-a-la-brasa` | Recognizable Catalan seasonal entry point: 70 estimated searches, difficulty 5 | Exact *Lactarius* scope and a planxa alternative may live on the same page |
| Pasta amb camagrocs | `/receptes/pasta-amb-camagrocs` | Strong species pairing: 110 estimated searches, difficulty 4 | Do not create separate fresh/dried pages; express that as an ingredient variation |
| Llibrets d’apagallums | `/receptes/llibrets-dapagallums` | Distinctive first-hand recipe and original authority asset | Credit the author, use *Macrolepiota procera*, require complete cooking and surface the dangerous small-*Lepiota* confusion |
| Carpaccio de ceps | `/receptes/carpaccio-de-ceps` | First-hand premium recipe with strong visual potential | Record the authentic method and add the official raw-mushroom caution plus a cooked or seared alternative |
| Carpaccio d’ous de reig | `/receptes/carpaccio-dous-de-reig` | Most distinctive first-hand recipe | Highest safety gate: exact *Amanita caesarea* provenance, dangerous-*Amanita* warning, raw-mushroom caution and cooked alternative |

The three first-hand recipes must use the author’s actual quantities, method, testing notes and photographs. Do not synthesize missing steps and present them as personal experience.

### Batch 2 — complete the approved nine

| Recipe | Canonical path | Role |
| --- | --- | --- |
| Risotto de ceps | `/receptes/risotto-de-ceps` | Evergreen cep recipe and accessible entry point |
| Truita de fredolics | `/receptes/truita-de-fredolics` | Specific Catalan species pairing and quick dish |
| Arròs de galtes de porc amb ceps | `/receptes/arros-de-galtes-de-porc-amb-ceps` | Distinctive slow-cooked rice dish; avoids another generic mushroom rice |

### Batch 3 — traditional Catalan collection

These are independent Bolets Atles adaptations, not transcriptions. Verify the traditional claim and preparation context from more than one reliable source before publication.

| Recipe | Canonical path | Why it belongs |
| --- | --- | --- |
| Fricandó amb moixernons | `/receptes/fricando-amb-moixernons` | A documented emblematic Catalan preparation; moixernons/cama-secs distinguish it from the generic beef stew |
| Sopa de fredolics | `/receptes/sopa-de-fredolics` | Familiar seasonal preparation and a second, non-egg use for fredolics |
| Canelons de ceps i rovellons | `/receptes/canelons-de-ceps-i-rovellons` | Festive Catalan format with two strong species links |
| Pollastre rostit amb bolets, prunes i pinyons | `/receptes/pollastre-rostit-amb-bolets-prunes-i-pinyons` | Connects mushrooms with the Catalan roast tradition |
| Peus de porc amb bolets | `/receptes/peus-de-porc-amb-bolets` | Traditional slow-cooked dish with a materially different audience and technique |
| Conill amb bolets i picada | `/receptes/conill-amb-bolets-i-picada` | Rural Catalan preparation that introduces picada without duplicating the fricandó page |

Treat `rovellons amb all i julivert` as a variation on the brasa/planxa page rather than a second canonical. Do not add another generic mushroom rice in this batch because risotto and the pork-cheek rice already cover that format.

## Copyright and sourcing rule

A traditional dish is an editorial starting point, not reusable page copy. Research multiple references, develop and test an independent version, write all prose and instructions afresh, and use original or correctly licensed images. “Available online” does not mean free to reproduce. If a source is explicitly Creative Commons or public domain, record the exact licence and comply with attribution and adaptation terms.

Each traditional page should say `Recepta tradicional catalana — adaptació de Bolets Atles` and name the author who tested the adaptation. Historical notes must cite the source that supports them.

## Safety gates

- Every recipe assumes mushrooms are definitively identified; the atlas and photographs are never presented as sufficient identification.
- Cooking does not make a poisonous, misidentified mushroom safe.
- A raw or undercooked preparation must be marked explicitly and carry the official recommendation to cook wild mushrooms, plus a practical cooked alternative.
- The apagallums recipe identifies *Macrolepiota procera* and never generalizes from size or parasol shape.
- The ou-de-reig recipe names the dangerous *Amanita* confusion risk prominently and must not be framed as an identification guide.
- Storage guidance reuses `/conservar-bolets` and its ACSA sources rather than inventing recipe-specific shelf-life claims.
- No recipe receives an independent-mycologist-review claim unless a real reviewer, scope, date and approval are recorded.

## Delivery sequence

### Foundation

1. Define and test the recipe schema and JSON repository.
2. Build the hub, dynamic page, metadata, JSON-LD and sitemap integration.
3. Add shared recipe presentation styles and responsive media support.
4. Add recipe-to-species and species-to-recipe selectors without changing species ecology.
5. Document the JSON recipe catalogue as the source of truth in `AGENTS.md`.

### Content production

1. Capture the exact method and photographs for the three first-hand recipes.
2. Independently test and photograph the three demand-led launch recipes.
3. Publish Batch 1 together so `/receptes` is a credible hub rather than a one-page shell.
4. Publish Batch 2 after the initial templates and analytics are verified.
5. Research, test and publish the traditional recipes individually or in pairs; do not hold safe completed pages for an arbitrary batch date.

## Verification

- Unit tests: schema, unique slug/ID, known species references, publication-state filtering, safety requirements and structured-data mapping.
- Page tests: canonical metadata, authorship, dates, ingredient order, step order, safety text, internal links and sitemap dates.
- End-to-end: hub discovery, one cooked recipe, one original raw preparation and one traditional adaptation on mobile and desktop.
- Accessibility: heading order, list semantics, table overflow where used, focus styles, meaningful image alternatives and print readability.
- Project checks: media build, relevant tests, type check, lint, source-size check, production build and SEO audit.

## Measurement

Add neutral analytics events for recipe discovery and movement to species or preservation pages. Do not record recipe names in event payloads; use allowlisted event names on the neutral virtual analytics path required by the project.

Review Search Console and analytics after 28 comparable days:

- Impressions, clicks and ranking by recipe page.
- Whether the three validated keyword pages begin earning impressions.
- Navigation from recipes to species profiles and preservation guidance.
- Pages at positions 8–20 that merit improvement.
- Whether traditional adaptations or first-hand originals attract external citations.

Do not expand beyond 15 until the first collection shows either search demand, meaningful internal journeys or earned references.

## Database migration trigger

Keep JSON while one maintainer can review changes through Git. Introduce a private Supabase editorial workflow only when at least one of these is required: browser-based editing, multiple contributors, approval roles, scheduled publishing, frequent corrections without deployment, or a catalogue large enough that file-based editing creates measurable friction.

At that point, preserve the same validated recipe shape and repository interface. Keep administrative reads and writes server-side, protect every mutation with the signed admin session and `app_metadata.app_role = admin`, use new immutable migrations, enable RLS, and expose only published recipe projections to the public server renderer.
