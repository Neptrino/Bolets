# Instagram visual guide

Consolidated 8 September 2026. This document owns visual and rendering rules. Publishing, profile copy, budgets and measurement live in the [operating playbook](instagram-growth-playbook.md). The [illustrated-carousel reference](instagram-illustrated-carousel-style.md) adds detailed geometry and illustration instructions for that series only.

## Creative direction

Keep the current mushroom photograph ad (`InstagramPromoSingle`) and newer cinematic map Reels (`InstagramMapCampaign`) as visual references: heavy cream headlines, forest imagery and orange accents. Preserve the active ad when creating variants; a design preview does not establish improved campaign performance.

Give each cover one recognisable subject and one message. Aim for two to six headline words, with details in later slides or the caption. Check legibility at phone/thumbnail size and in the intended profile crop. Keep key content away from Reel controls. Avoid repeating the same photograph and layout on consecutive covers, without forcing a checkerboard or fixed colour quota.

Use the shared palette, type and margins from [`src/lib/instagram-design.ts`](../src/lib/instagram-design.ts). Use solid backgrounds. Existing Remotion compositions retain their Avenir-first stack; share-card renderers use bundled Nunito Sans. Do not create another palette or silently replace a reference composition's typography.

## Format-specific rules

| Format | Composition | Boundary |
| --- | --- | --- |
| Daily conditions Story | Original photo header, compact ranking, rounded rows and labelled scale | Preserve the earlier regular typography and photo shading as a deliberate exception to the newer cover style |
| Weekend conditions Reel | Combined Avui map first, then territorial comparison, species, extent and one closing action | Current observations, not a future forecast; use the signed production renderer |
| Species carousel / field detail | Large credited reference photo, common name and useful identifying details | Catalogue sources and identification limits remain; no claim that the photo is today's finding |
| Manual illustrated lesson | Large organic hand-drawn subject, short Catalan headline, concrete explanation and practical action | Follow the approved litter reference; the automatic education publisher stays retired |
| Cinematic campaign Reel | Continuous forest footage, heavy headline, map/product lens and one action | Generated footage is illustrative; product captures retain their actual date/reference status |
| Personal field photo | Clean photograph with optional discreet logo/wordmark | Put longer observations in the caption or a later slide |
| Evergreen pin | A distinct introduction, method explanation or responsible-use subject | Proposed artwork does not change actual pins; reuse completed Reels where suitable |

The older requirement for a photograph in every first frame is superseded for manual illustrated lessons. Legacy education rendering helpers remain for historical signed links and local drafts; their existence does not authorize scheduling them.

For the manual illustrated series, use the full [soil/ground logo](../public/brand/bolets-logo.svg) and Nunito Sans Black headings. Keep the approved proportions and measure number/checkmark alignment against visible text bounds. The [detailed reference](instagram-illustrated-carousel-style.md) owns its palette-role table, image sizes, geometry, story structure and Magnific prompt.

## Truthful maps, imagery and copy

- Current-condition publications use signed, verified current-day data. Never type scores into a generic design brief to create a live map; stale, unavailable and preview data cannot become a current report.
- A weekend-planning headline still describes today's conditions. Preserve the observation date, legend, attribution and “Condicions d’avui · No confirma presència”. Keep the territorial maximum together with positive-sector and 20+-sector shares.
- Daily score panels use the shared colour for the actual condition band; verified zero stays neutral. Do not recolour measurements to make a post more varied or animate scores to imply changing observations.
- Archived captures are reference material. Fictional local fixtures retain **MOSTRA**; generic drafts retain **ESBORRANY**. They are not publishable evidence of current conditions.
- Catalogue images retain their attribution/licence and sourced identification limits. Generated scenes and illustrations do not document a sighting or establish species identity, edibility or a collection location.
- Keep generation provenance in the source record and applicable caption. Do not burn an AI label into artwork; platform disclosure is handled through the playbook's publication review.

Write clear, natural Catalan with one useful action. Identification education must retain its safety limits and truthful absence of independent mycological review. Examples and diagrams must explain the feature they actually show.

## Rendering and source ownership

Reusable originals, provenance and manual templates live in [the asset library](../social/asset-library/README.md). Campaign exports live under `social/`, indexed in [social/README.md](../social/README.md). These local resources are ignored by Git except for that index; do not assume that their presence means they are committed or backed up. Keep runtime renderers and canonical brand resources in their existing source locations.

| Task | Entry point |
| --- | --- |
| Review production templates/captions | `/admin/publicacio` |
| Prepare a personal photograph locally in the browser | `/admin/publicacio/fotos` |
| Simulated daily preview | `npx tsx scripts/preview-instagram-daily.tsx` → `social/daily-style-preview/` |
| Simulated weekend preview | `npx tsx scripts/preview-instagram-weekend.tsx [map-image-path]` → `social/weekend-redesign/` |
| Generic JSON cover draft / profile kit | [Template commands](../templates/instagram/README.md) |
| Manual illustrated carousel / Reel | [Asset-library render commands](../social/asset-library/README.md#render-from-the-library) |

The photo editor offers Fotografia, Titular and Peu de camp presets, branding choices and top/bottom text placement. Photos stay in browser memory; downloads and publishing are separate actions. Prefer clean photographs, reserving full text panels for short educational headlines.

The weekend composition is in `components/instagram-weekend-card.tsx`; image/font loading is in `src/lib/instagram-weekend-render.tsx`. The Reel is 20 seconds at 30 fps, with a restrained 1.8% eased push/pull on map/species shots and still comparison/extent figures. Transitions are 600 ms; the closing frame returns to the opener. Keep date, legend and attribution within existing safe margins. The renderer supersamples motion from one decoded image per scene and retains bounded encoder threads and its rendering timeout.

Bump `src/lib/instagram-template-version.ts` when published artwork changes. For motion-only weekend changes, bump `reelVersion` in `src/lib/social-growth-assets.ts`. Preserve publication idempotency markers. Updating a renderer or media URL does not replace artwork already copied into Buffer or Meta; inspect queued media separately.

## Final creative review

Inspect each slide at native and phone size: text wraps, spelling, crop, source credits, date, legend, safe margins, correct logo and meaningful labels/arrows. Measure badge/checkmark alignment instead of judging only a contact sheet. Review the caption and media together. For ads, compare later click and landing-page outcomes; preview approval alone proves no conversion gain.

Historical tests and queue observations from the 5 September renderer release are retained in the [account/design receipt](archive/instagram-account-update-2026-09-05.md#historical-renderer-verification--5-september-2026). Do not reuse those results as validation of a later change.
