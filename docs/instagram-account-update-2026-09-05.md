# Instagram account update · 5 September 2026

The user authorized applying the profile redesign to the live account.

## Completed and verified

Saved the proposed bio through Instagram's profile editor and verified it on the public @bolets.app profile:

> Bolets de Catalunya, amb criteri 🍄
> Mapa de condicions · Espècies · Guies de camp
> ↓ Consulta el mapa d’avui

Previous bio, retained for rollback:

> La guia definitiva pels boletaires. Condicions per trobar bolets a Catalunya 🍄
> Guía amb hàbitat, condicions i descripció.
> 👇 Condicions d'avui

The profile name, avatar, links, account preferences, 17 posts and three pins remain unchanged. The active advertisement was not edited.

## Editor limitation

Inspected the existing first pinned Reel (`Dc2zlzpj2yN`) and Cep carousel (`Dc0f1_qlbkE`) through their More options → Edit screens. The web Reel editor exposes caption, tags, collaborators and AI label, but no cover-image replacement. The carousel editor exposes caption, tags, accessibility and deletion of individual items, but no replacement/upload control. Both editors were cancelled without saving changes.

Do not treat this as proof that a mobile-only control is absent. If the mobile app offers Edit cover, use the clean exports below.

## New non-Reel publication authorized

The user subsequently explicitly instructed: “go and publish all new posts except reels”. This authorizes publishing the redesigned photo posts and complete carousels. It does not authorize deleting or archiving originals. The unchanged active advertisement is excluded from the new-post batch.

Prepared 11 posts / 27 clean 1080 × 1350 JPEG images in `artifacts/instagram/publication-2026-09-05`: original positions 7–17, publishing in descending order to retain their relative order. Positions 7–10 are complete five-slide carousels. No draft stamps, old 73/100 example or purported live reading is included. Field photos are captioned as archive photographs. Caption/source/file mapping is in `manifest.json`; progress is recorded separately in `publication-log.json`.

Inspected the complete contact sheet and ran focused script lint. First upload through the signed-in Instagram web composer failed at Chrome `fileChooser.setFiles` with `Not allowed`. No Share action was executed and no new post was published. The browser's upload troubleshooting instructions require enabling “Allow access to file URLs” for the ChatGPT Chrome extension; these instructions were sent to the user. The user enabled the required capability and instructed “go”; uploads then succeeded.

Regenerate assets with `npx tsx scripts/render-instagram-publication-pack.tsx`. The rendering script never uploads or publishes.

## Clean pinned-cover handoff

`artifacts/instagram/pinned-cover-update.zip` contains three clean 1080 × 1920 covers and their post mapping. ESBORRANY/PROPOSTA labels were removed by rendering the source components; map-reference and ICGC attribution remain. These covers introduce existing evergreen tutorial Reels; they do not claim new live readings.

Regenerate with `npx tsx scripts/render-instagram-pinned-cover-pack.tsx`. The earlier current-profile study and its draft stamps remain unchanged.

## Publication completed

Published all 11 authorized new non-Reel posts through the signed-in Instagram web composer: seven individual images and four complete five-slide carousels (27 images total). Every post received Instagram’s “Post shared” confirmation. Verified the profile now has 28 posts, up from 17. All images used the full 4:5 portrait crop. Reels, pins, existing posts and the active ad remain in place; no paid boost or Facebook cross-post was enabled.

The third post initially received the preceding archive caption. Corrected it through Edit info and verified the intended caption live before continuing.

Publication receipts: `artifacts/instagram/publication-2026-09-05/publication-log.json`. Final profile screenshot: `profile-live.png` in the same folder.

- Source position 17: https://www.instagram.com/bolets.app/p/Dc5dRU1DHeF/
- Source position 16: https://www.instagram.com/bolets.app/p/Dc5dX7tjAFE/
- Source position 15: https://www.instagram.com/bolets.app/p/Dc5da1uDJjs/
- Source position 14: https://www.instagram.com/bolets.app/p/Dc5djHDjIjK/
- Source position 13: https://www.instagram.com/bolets.app/p/Dc5dnNLjPAT/
- Source position 12: https://www.instagram.com/bolets.app/p/Dc5dqr0DJ4E/
- Source position 11: https://www.instagram.com/bolets.app/p/Dc5dt15DN5M/
- Source position 10: https://www.instagram.com/bolets.app/p/Dc5dyKHjMNk/
- Source position 9: https://www.instagram.com/bolets.app/p/Dc5d2FajJ_U/
- Source position 8: https://www.instagram.com/bolets.app/p/Dc5d6flDLWu/
- Source position 7: https://www.instagram.com/bolets.app/p/Dc5d-XDDKvx/

## Pinned-post update requested

User requested updating the pins after publication. Proposed the new atlas introduction, method explanation and responsible-foraging designs as the three replacements. Inspected the profile Options menu, the existing pinned Reel Dc2zlzpj2yN and new introduction Dc5dt15DN5M. Neither post menu exposes Pin/Unpin; profile Options exposes account settings only. Cancelled the menus and left all three original pins unchanged. No permission is missing; the connected web UI lacks the required action.

Mobile handoff targets:
- Atlas introduction: https://www.instagram.com/bolets.app/p/Dc5dt15DN5M/
- Conditions explanation: https://www.instagram.com/bolets.app/p/Dc5dqr0DJ4E/
- Responsible foraging: https://www.instagram.com/bolets.app/p/Dc5dnNLjPAT/

## Superseded originals removed

User subsequently explicitly requested removing old posts. Removed the 11 original photo/carousel posts mapped to the published replacements (source positions 7–17) through Instagram’s Delete → Delete post confirmation. Every deletion returned “Post deleted.” Refreshed the profile and verified all 17 remaining URLs: 11 new posts, five existing Reels and the active ad. No superseded original remains.

Removal receipts: `artifacts/instagram/publication-2026-09-05/removal-log.json`. The original photos and caption mapping remain in the local source archive. Pin configuration changed externally during this work; no pin action was performed by the assistant.
