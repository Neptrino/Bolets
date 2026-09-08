# Social content

Everything produced for Instagram and Meta ads lives in this folder. It is git-ignored except for this index, so nothing here is versioned: keep the sources you care about in `asset-library/` and the render scripts in `scripts/`.

## Current guidance

- [Operating playbook](../docs/instagram-growth-playbook.md): publishing, profile, budget and measurement.
- [Visual guide](../docs/instagram-style-guide.md): formats, rendering and creative review.
- [Illustrated carousels](../docs/instagram-illustrated-carousel-style.md): approved manual illustration reference.

Campaign captions, upload packs and proposed calendars below stay with their media. They are not a second operating plan or proof of a current scheduled post; check the platform and dated receipts before reuse.

## Campaigns and packs

| Folder | What it holds |
| --- | --- |
| `2026-09-map-campaign/` | September map-first campaign: eight Reels, five carousels, singles 15–22, Stories, `captions.md`, `buffer-manual-schedule.md`, Meta ad creatives in `ads/`, and `buffer-transfer/` with the media and `UPLOAD.md` prepared for moving the Planner posts into Buffer. Rendered by `scripts/render-instagram-map-campaign.mjs`. |
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
| `bolets-atles-avui-reel*.mp4`, `reel-bg-*.png`, `reel-contact-sheet.jpg`, `reel-frame.html` | Early Avui Reel renders. |

## Sources

| Folder | What it holds |
| --- | --- |
| `asset-library/` | Reusable sources: illustration packs, brand SVGs, fonts, audio, catalogue photos, templates, `instagram-design.ts` and `catalog.json` (rebuild with `node social/asset-library/reindex.mjs`). Start there before searching dated folders. |
| `asset-library-verification/` | Verification copy of the "Respectem el bosc" pack rendered from the library. |

## What stays outside

- Code: the Remotion project in `video/` (captures in `video/assets`), `components/instagram-species-card.tsx`, the Buffer publishers in `src/lib/buffer-*` and the admin publication page.
- Plans and guides: `docs/instagram-*.md`.
- Raw footage and photos on the Desktop (`~/Desktop/Bolets/Resources`) and in Pictures are not part of the repository.
