# Instagram visual rules and templates

## Reference and intent

The current mushroom photograph ad (`InstagramPromoSingle`) and the newer cinematic map Reels (`InstagramMapCampaign`) are the visual references. Keep their heavy cream headlines, forest photography and orange accents. The active ad is an existing campaign asset; template work must not silently replace or re-render it with different typography.

The aim is a recognisable profile with visible mushrooms, maps and useful questions. This is a creative direction, not evidence of improved ad performance. Compare future creative variants against actual campaign results before replacing the active ad.

## Cover rules

- Give each cover one subject and one message. Aim for two to six headline words; move explanations into the carousel or caption.
- Use the shared forest, cream and orange palette in `src/lib/instagram-design.ts`. Photo covers use a solid forest text panel; educational covers use one solid background and a simple relevant illustration.
- Use the shared heavy typeface and scale. Existing Remotion assets keep their Avenir-first stack; generated share cards use the bundled Nunito Sans fonts.
- Keep branding small and in a consistent corner. A photograph or map should be recognisable before the logo or supporting text.
- Do not add a catalogue, guide and map thumbnail to every cover. The active ad can retain its existing composition; editorial posts should have a narrower purpose.
- Check the exported cover at phone size and in the intended profile crop. Keep essential text away from Reel controls. The local grid preview contains full reference Reel frames and therefore is not an exact Instagram crop.
- Avoid consecutive covers with the same photograph, dominant background and layout. Do not force a checkerboard or a quota if the content does not warrant it.

## Template families

| Family | Lead | Supporting content | Source |
| --- | --- | --- | --- |
| Daily Story | Short question and three clear territorial readings | Observation date, maxima and both extent measures; same signed card as the publisher | Daily renderer |
| Weekend | Actual combined Avui map and “On miraries?” | Five frames: map, comparison, species, extent, current map invitation | Signed weekend renderer |
| Species | Large credited catalogue photograph and common name | Existing five-slide species series with identification limits | Catalogue and species renderer |
| Education | Short question, cream/orange/forest background and one illustration | Existing sourced five-slide curriculum | Education renderer |
| Field detail | Credited reference photograph and one observational prompt | Caption or subsequent images explaining the detail | JSON photo brief |
| Cinematic Reel | Existing full-screen footage, heavy headline and map lens | Existing map campaign composition | Remotion campaign |
| Pinned introduction | “Abans de sortir.” | What the app offers and how to start | Pinned start cover/caption |
| Pinned method | “Un número. Més context.” | How to interpret conditions and territorial extent | Pinned method cover/caption |
| Pinned limits | “El bosc es respecta.” | Responsible use and identification limits | Pinned safety cover/caption |

Pinned covers are proposed replacements. Rendering their files does not change existing Instagram pins. Reuse the newer completed Reels before producing redundant feature introductions.

## Truthful maps and imagery

The weekend opener shows current conditions, even when its headline invites weekend planning. It is not a future forecast. Keep the Catalonia observation date, score legend, attribution and “Condicions d’avui · No confirma presència”. A territorial maximum must retain the positive-sector and 20+-sector shares wherever that maximum is presented.

Live publication continues through the existing signed current-day checks. Withheld, stale or unavailable readings do not become a post. Never build a live map from numbers typed into a generic design brief. The local preview uses an archived map reference and fictional territorial fixtures marked MOSTRA; it is not publishable weekend evidence.

Catalogue photos are reference images, not today's findings. Preserve their attribution/licence and source-backed identification limits. Use original field footage where possible. Illustrations must not imply documented sightings, harvests or exact collection locations.

## Profile copy and editorial use

Suggested bio draft:

> Bolets de Catalunya, amb criteri 🍄
> Mapa de condicions · Espècies · Guies de camp
> ↓ Consulta el mapa d’avui

Suggested highlight names: **Mapa · Espècies · Al bosc · Guies**. Populate them with useful existing stories before adding more categories.

Use the weekend map as the recurring timely post. Place species guides, field detail and education between map updates so the profile also rewards browsing. Reuse already-produced cinematic Reels where they fit. These are editorial rules, not changes to the existing publishing schedule or queue.

## Rendering and review

Use `/admin/publicacio` to review the production templates and their captions. Regenerate the simulated daily Story/feed preview with `npx tsx scripts/preview-instagram-daily.tsx`. Keep the approved source assets and compare new renders before publishing through the existing workflow.

Review the headline at thumbnail size, image crop, spelling, scientific attribution, date and limits together. For ads, judge click and landing-page outcomes as well as engagement; a visual preview alone cannot establish which creative converts best.

## Implementation verification · 5 September 2026

The isolated publishing release passes 1,177 tests under Node 24 (eight skipped), lint/source-size checks, typecheck, production build and `git diff --check`. Daily Story/feed previews were rendered and visually inspected. The local Node 25 runtime causes four unrelated browser tests to fail because its localStorage implementation differs; the production Node 24 runtime passes them.

The Buffer queue audit found nine manually prepared campaign posts and no generated species or recurring posts containing old artwork. Existing uploaded campaign media does not change with this release.

## Scheduled publishing integration

The admin preview and server publishing triggers share the production image routes. Daily portrait cards, species carousels, rotating education carousels, evergreen covers and the five-frame weekend Reel use the same palette and bundled fonts. The weekend opener leads with the combined Avui map.

`src/lib/instagram-template-version.ts` versions all generated media URLs, including the daily Story and Reel, without changing the date/species idempotency markers. Bump it whenever published artwork changes. Existing media already copied into Buffer does not refresh by changing a server renderer; inspect the queue separately before a rollout. Manually prepared campaign media is a separate editorial workflow.

Regenerate a local, explicitly simulated daily preview with `npx tsx scripts/preview-instagram-daily.tsx`. No preview command publishes or queues a post.

## Weekend motion

The automatic Reel runs for 20 seconds at 30 fps. Map and species shots have a restrained 1.8% eased push/pull, while territorial comparison and extent figures stay still. Section changes use 600 ms directional transitions and dissolves; the final frame returns to the opening for looping. Keep the map, observation date, legend and attribution inside the existing safe margins. Do not animate condition scores or imply that the camera movement represents changing observations.

The server generates motion from one decoded image per scene, supersamples moving shots, and limits filter/encoder threads. The existing rendering timeout remains in force. Bump `reelVersion` in `src/lib/social-growth-assets.ts` for motion-only changes, keeping existing publication markers intact.

## Original field photographs and admin editor

Open `/admin/publicacio/fotos` from Publicació to prepare personal photographs. Use clean photographs by default, with an optional discreet wordmark or small logo and text. Reserve full text panels for short educational headlines and field-note slides. Keep observations in the Instagram caption or a later carousel slide, and preserve required image attribution. The local and online editors share Fotografia, Titular and Peu de camp presets, four branding choices, top/bottom text placement and the shared palette and fonts. Photos are processed in the browser; JPG/transparent PNG downloads are manual, with no automatic publishing.

## Daily colour and field lessons

The daily summary retains the original photo header, compact territorial ranking,
rounded rows and labelled condition scale. It is a deliberate exception to the
newer typographic cover style: the user prefers the earlier composition. Preserve
its regular type treatment and photo shading when updating other series.
Daily score panels use the shared condition-band colour for the actual value;
verified zero stays neutral. Keep the maximum and both territorial coverage
figures together. Never recolour data to make a post more varied.

From 9 September 2026, Wednesday carousels rotate through practical field lessons
in `src/lib/instagram-field-lessons.ts`. Historic topic identifiers remain valid
for signed links. Every new lesson needs a concrete observation question,
specific comparison or checklist, a useful final takeaway, a checked source and
a complete guide. Captions cite the source and disclose the absence of independent
mycological review. Do not insert unrelated current scores or turn an observation
aid into an identification/edibility guarantee. The four initial lessons cover
photographs, underside structures, a rossinyol comparison and wood substrates;
expand the sourced collection as new lessons are prepared.

Render all five slides with `scripts/preview-instagram-field-lessons.tsx` and
inspect them before changing the rotation. Previews are labelled MOSTRA.
