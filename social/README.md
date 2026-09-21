# Social content

Finished publications and campaign exports for Instagram and Meta ads live in this folder. It is git-ignored except for this index, so local resources are not automatically versioned or backed up. Keep reusable sources and manual renderers in `../assets/`; runtime publication code retains its existing owners.

## Current guidance

- [Operating playbook](../docs/instagram-growth-playbook.md): publishing, profile, budget and measurement.
- [Visual guide](../docs/instagram-style-guide.md): formats, rendering and creative review.
- [Illustrated carousels](../docs/instagram-illustrated-carousel-style.md): approved manual illustration reference.

Campaign captions, upload packs and proposed calendars below stay with their media. They are not a second operating plan or proof of a current scheduled post; check the platform and dated receipts before reuse.

## Illustration catalogue

[Browse all reusable illustrations](illustration-catalogue/index.html): species-grouped stock and AI variants, whole trees, supporting resources and gaps. Rebuild with `node --experimental-strip-types assets/templates/illustration-catalogue/build.mjs`.

## Campaigns and packs

| Folder | What it holds |
| --- | --- |
| `2026-09-18-discovery-reels-v2/` | Revised three discovery Reels using downloaded footage and no logo/wordmark. Existing music retained pending soundtrack selection; local previews only. |
| `2026-09-18-discovery-reels/` | Three 16-second discovery Reels: rain/planning, «Cinc minuts més» humour and species-first route planning; captions, provenance and preview gallery. Local drafts, not scheduled. |
| `2026-09-12-new-posts/` | New 21-second map tutorial and two five-slide «Quin arbre?» quizzes: alzina/faig and avet/pi roig; captions, alt text, Story covers, source records and preview. Local drafts, not scheduled. |
| `2026-09-11-diada/` | Approved photographic Story and dated Buffer scheduling receipt; frozen reference and reusable renderer in `../assets/`. |
| `2026-09-forest-discoveries/` | Ten finished local drafts: «Quin arbre?» alzina (6 slides), pi roig, castanyer, faig and avet plus a pi roig/pi negre comparison (5 each); rovelló, cep and rossinyol close-ups (4 each); and a 15-second empty-basket Reel; whole-tree covers and illustrative woodland mushroom rows; preview, captions, provenance, alt text and correctly framed Stories. Not scheduled. Reusable renderers in `../assets/templates/forest-discoveries/`. |
| `story-framing-2026-09-09/` | Audit of 29 queued Stories, 25 corrected 9:16 image frames, source-to-upload mappings and verified Buffer replacement receipts. Original schedules and feed posts retained. Reusable wrapper in `../assets/templates/story-frame/`. |
| `2026-09-map-campaign/` | September map-first campaign: eight Reels, five carousels, singles 15–22, Stories, `captions.md`, `buffer-manual-schedule.md`, Meta ad creatives in `ads/`, and `buffer-transfer/` with the media and `UPLOAD.md` prepared for moving the Planner posts into Buffer. Rendered by `scripts/render-instagram-map-campaign.mjs`. |
| `../output/autumn-content-2026-09-08/` | Four completed Reels and two illustrated carousels, preview gallery, captions and verified Buffer schedule receipts; reusable source in `../assets/templates/autumn-lessons/`. |
| `2026-09-promo/` | Promo single renders (`scripts/render-instagram-promo.mjs`). |
| `2026-09-respectem-el-bosc/` | "Respectem el bosc" pack: two carousels, the Reel "Aquest bolet també compta", captions, alt text and provenance. |
| `2026-09-species-guide-ad/` | Species-guide ad creatives from 7 September. |
| `2026-09-bosc-ple-de-ceps-reel/` | Build files for the "Bosc ple de ceps" Reel. |
| `meta-migration-2026-09-07/` | Receipts of the Buffer to Meta migration on 7 September: posts 1–8, captions and the audit scripts. |
| `publication-2026-09-05/`, `review-2026-09-05-field-lessons/` | The 5 September publication pack and the field-lessons review. |

## Profile, daily and weekend formats

| Folder | What it holds |
| --- | --- |
| `profile-kit/`, `profile-direction/`, `current-profile-redesign/`, `pinned-cover-update/` | Profile redesign work from 5 September (`scripts/preview-instagram-kit.tsx`, `scripts/recreate-instagram-profile.tsx`, `scripts/render-instagram-pinned-cover-pack.tsx`). |
| `species-cards/` | Previews of the species carousel renderer; recurring species publishing is retired (`scripts/preview-instagram-species-card.tsx`). |
| `daily-style-preview/`, `weekend-redesign/`, `weekend-motion/` | Daily Story and weekend Reel design previews. |
| `weekend-forest-fix-2026-09-11/` | Current-day Reel preview sharing Avui’s matching-habitat transparency and smoothing, with explicit sector thresholds. Supersedes the uniform-opacity preview in `weekend-fix-2026-09-11/`. Local render metadata only; not published. |
| `bolets-atles-avui-reel*.mp4`, `reel-bg-*.png`, `reel-contact-sheet.jpg`, `reel-frame.html` | Early Avui Reel renders. |

## Sources

| Folder | What it holds |
| --- | --- |
| `../assets/` | Reusable sources: illustration packs, brand SVGs, fonts, audio, catalogue photos, templates, `instagram-design.ts` and `catalog.json` (rebuild with `node assets/reindex.mjs`). Start there before searching dated folders. |
| `asset-library-verification/` | Verification copy of the "Respectem el bosc" pack rendered from the library. |

## What stays outside

- Code: the Remotion project in `video/` (captures in `video/assets`), `components/instagram-species-card.tsx`, the Buffer publishers in `src/lib/buffer-*` and the admin publication page.
- Plans and guides: `docs/instagram-*.md`.
- Raw footage and photos on the Desktop (`~/Desktop/Bolets/Resources`) and in Pictures are not part of the repository.

- [Discovery Reels v3 · 18 September](2026-09-18-discovery-reels-v3/index.html): simplified Catalan, no counters, map and guide screenshot endings. Local drafts; not scheduled. Renderer: `assets/templates/discovery-reels-v3/render.mjs`.

- [Six product/discovery Reels · 18 September v4](2026-09-18-product-reels-v4/index.html): three soundtrack updates and three new product demonstrations (destination, conditions evolution, species guide). Local drafts, not scheduled. Source: `assets/templates/product-reels-v4/`.

- [Six Reels v5 · distinct openings](2026-09-18-product-reels-v5/index.html): replaces repeated opening footage in v4; same scripts and music. Local drafts, not scheduled.

- [Cinematic product Reels v6](2026-09-18-product-reels-v6/index.html): framed app demos, softened product backgrounds, gentle camera movement and cross-dissolves. Six distinct openings; drafts not scheduled.

- [Product Reels v7 · natural footage, animated screenshots](2026-09-18-product-reels-v7/index.html): removes v6's pale/blurred background treatment and moves effects onto screenshot entrances. Six local drafts, not scheduled.

- [Readable product Reels v8](2026-09-18-product-reels-v8/index.html): compact dark backing under text lines protects contrast over moving highlights. Retains natural footage and animated screenshot entrances; six unscheduled drafts.

- [15 product/discovery Reels](2026-09-18-product-reels-15/index.html): six revised plus nine new ideas; animated stock photos, distinct openings, fine text contours and screenshot entrances. No added labels/credits/dates on frames; attribution remains in captions. Local drafts, not scheduled.

- [15 Reels with full-screen app demos](2026-09-18-product-reels-15-app-demos/index.html): 04 species selection, 05 conditions details and 08 scrolling guide use full-screen app captures with visual interaction cues. Other twelve unchanged; not scheduled.

- [15 Reels · readable full-screen demos](2026-09-18-product-reels-15-readable-app/index.html): consistent high-contrast text bands, natural footage, animated photos and three full-screen app sequences. Complete conditions chart retained. Local drafts, not scheduled.

- [15 Reels · current species pages](2026-09-18-product-reels-current-species-app/index.html): fresh live captures for seven species; user-selected Cep photo, Llenega season view and updated Rovelló scroll demo. Keeps readability bands and prior animation. Local drafts, not scheduled.

- [15 Reels · smaller type and lighter backing](2026-09-18-product-reels-balanced-app/index.html): working review draft with reduced headlines, true 60% backing opacity, current species pages and three full-screen app demonstrations. All 15 exports verified; not scheduled or approved as a new style reference.

- [15 Reels · stronger openings](2026-09-18-product-reels-hooks-app/index.html): concrete opening questions and relatable situations, no competing opening subheading, first cut at 2.4 seconds, revised follow-through and three full-screen app demos. Research and source copy: `assets/templates/product-reels-hooks/`. Unscheduled review drafts.
- [Current Reel preview](reels-current/index.html): one review page for all 15 product Reels and 8 humour Reels. Every opener is distinct, all 32 humour scenes use different sources, repeated product footage has been replaced, and the app demonstrations are preserved. Verified and unscheduled.

- [Profile-follow paid ad · revised 18 September](2026-09-18-profile-follow-ad-v2/index.html): 13-second draft with a Cep opening, animated species selection, sector result and same-sector forecast, then a dedicated follow closing. Supersedes the rejected nine-second draft. Renderer and provenance: `assets/templates/profile-follow-ad-v2/`. Not launched or scheduled.

- [Magnific stock selection · 18 September](2026-09-18-magnific-stock-shortlist/index.html): all 19 non-AI videos and 21 non-AI photos downloaded with provenance; the three rejected resources remain excluded.
