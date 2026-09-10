# Illustrated field-guide carousels

This is the detailed illustration supplement to the [visual guide](instagram-style-guide.md). Publishing, scheduling and disclosure procedures live in the [operating playbook](instagram-growth-playbook.md).

The user approved the revised **La brossa torna amb tu** carousel on 7 September 2026. This is the visual reference for future manually created educational carousels. The frozen reference is in [`social/asset-library/style-references/illustrated-field-guide/approved-litter/`](../social/asset-library/style-references/illustrated-field-guide/approved-litter/). Use those images to judge the result, not just the description below.

![Approved litter carousel](../social/asset-library/style-references/illustrated-field-guide/approved-litter/contact-sheet.jpg)

Choose formats and reusable resources in the [visual production index](instagram-style-guide.md#start-here-one-publishing-system). The approved photographic Story treatment is documented there; do not apply opaque illustration panels over photographic greetings.

This direction applies to manual educational content. Existing photographic ads, cinematic Reels, daily cards and signed current-condition maps retain their own compositions. It does not re-enable automated educational publishing.

## What defines the style

Large, recognisable hand-drawn objects explain one useful idea. Warm botanical illustration, confident dark contours, organic curves and restrained shading make the objects feel tangible. The tone is friendly and adult, like an illustrated field guide. The approved rubbish bag, crushed bottle, fruit scraps and tissue are the clearest examples.

- Give the cover one large subject and a short, bold Catalan headline. Build an intentional scene rather than putting a small decorative sticker in the middle of an otherwise empty template.
- Draw curved folds, curled leaves and irregular natural edges. Use fine dark brown contours with some variation in weight and a few interior lines to explain form.
- Keep colour areas simple, with restrained shadow shapes. Avoid glossy 3D, photographic textures, airbrushed shading, crude geometric placeholders and emoji-style objects.
- Use a consistent illustration family within a lesson. Existing mushroom stock may support a scene, but its colour and detail must sit comfortably alongside the main illustration.
- The object must be recognisable before its label is read. A tissue should look like crumpled soft paper; packaging should look used; mushrooms remain generic illustrative subjects unless a separate sourced identification workflow supports them.

## Colour and typography

Import the shared palette from [`src/lib/instagram-design.ts`](../src/lib/instagram-design.ts). Do not create a second palette constant in a new renderer.

| Role | Shared colour |
| --- | --- |
| Dark background, headline and main contours | Forest `#14271c` |
| Light background and light text | Cream `#f4ecd7` |
| Cover emphasis, numbered badges and closing strip | Orange `#f28a32` |
| Secondary plants and bags | Moss `#3d513f` |
| Soil and warm illustration shading | Clay `#7a452f` |
| Light inset panels | Cream soft `#fff9ec` |

Use solid backgrounds. Covers can alternate cream and orange according to the subject; explanatory or closing slides may use forest. A shared style does not require identical backgrounds on every post.

Use bundled Nunito Sans Black for headlines, labels and actions; Regular for explanatory sentences. The current 1080 × 1350 reference uses 79–110 px headlines, 38–43 px short action headings, 28–33 px body text, 22–25 px small labels and 29 px footer text. These are image-rendering pixels, not website CSS sizes. Prefer the shared type roles when adding a new design; fit longer headlines by rewriting or intentional line breaks before reducing legibility.

## Composition and alignment

| Element | Current reference geometry at 1080 × 1350 |
| --- | --- |
| Main safe content bounds | x = 66 to 1014 |
| Logo | x = 66, y = 55, 42 × 42 |
| Header divider | y = 125 |
| Topic and slide count | y = 151 |
| Headline begins | approximately y = 220 |
| Main illustrated area | approximately y = 550 to 1170 |
| Closing strip | y = 1202, height = 148 |

Use [`public/brand/bolets-logo.svg`](../public/brand/bolets-logo.svg), including the green ground and brown soil. Keep it small beside the wordmark. The simpler icon without soil is not the social logo for this series.

Numbered badges must be centred on the **rendered heading's visible bounds**. Centre the number inside the circle using its measured width and height. Do the same for checkmarks and adjacent labels. Do not align with guessed font-size offsets: that produced the earlier misalignment. Supporting text starts on the same left edge as its heading. Keep gaps consistent across rows and leave space between copy and illustration.

Use broad, calm panels only when they help compare examples, as in the three waste categories. Small callout lines and arrows should point to the actual feature they describe. Keep typography as editable local text, outside generated artwork.

## Story structure

The three-slide reference is a useful starting point, not a mandatory length:

1. **Hook:** one memorable statement plus a large relevant illustration.
2. **Explain:** a labelled diagram or concrete examples that justify the advice.
3. **Act:** two or three practical actions, then one save/share invitation.

Write clear, natural Catalan. Prefer direct, conversational phrasing such as «El reconeixes tan de prop?» and «Fes lliscar i descobreix quin bolet és». Avoid production language such as «obrim el pla» and abstract constructions such as «l’hàbitat no confirma el consum» in audience-facing copy. Read captions as connected prose, not a sequence of slogans. Keep the advice specific, constructive and free of guilt or exaggerated claims. Retain sources and image provenance in the caption. Diagram labels must explain the right feature; a mycelium illustration remains a schematic, not a scale drawing or a species identification guarantee.

## Species selection

Prioritise mushrooms with strong relevance for Catalan boletaires, such as rovellons/pinetells, ceps, rossinyols, camagrocs, trompetes and carlets. Lead discovery and close-up posts with this familiar core before niche subjects. Choose familiar Catalan species within each tree’s verified woodland associations before niche examples; repetition across trees is preferable to introducing an unfamiliar species just for variety. The castanyer episode uses cep d’estiu, ou de reig and cep negre; pi roig uses rovelló, camagroc and rossinyol. Keep editorial familiarity distinct from measured local abundance; do not label a species rare without evidence. Use precise scientific names where common names cover several species.

## «Quin arbre?» series

Use a whole-tree illustration on each tree episode’s cover, showing its full crown and trunk. Put leaf/needle, fruit/cone and bark details on subsequent slides. Integrate illustration assets directly into the cream background without white rectangles, neighbouring sheet fragments or clipped edges. Preserve proportions and generous margins.

Use species-specific schematic mushroom illustrations in the woodland examples, as requested by the user on 9 September. Check each against the catalogue’s morphology and reject obvious errors such as rings on russulas, gills on boletes, cap warts or incorrect colours. These are editorial illustrations, not identification plates or edibility evidence. Retain prompts, source references, rejected versions and generation provenance. Keep truthful AI disclosure in captions, without an overlaid AI label. Photo-based “Mira de prop” episodes remain photographic.

Connect tree recognition to mushroom habitats in every episode: common and scientific names, sourced woodland associations, and the reminder that soil, season and conditions also matter. If photographs are used in another format, fill their slots with proportional subject-centred crops and preserve original credits.

## Creating matching resources in Magnific

For species-specific illustrations, prefer adapting a correctly identified real photograph through Magnific image references over generating anatomy from text alone. Preserve the photographed cap, stem, underside, proportions and orientation; remove scenery and change the drawing style without inventing hidden structures. Inspect the result against the photo before adding it to the catalogue. Keep the source photograph’s author, source URL, licence and adaptation notice with the derivative, including share-alike terms where applicable. Retain the earlier illustration as a separate version.

Use existing library assets first. For botanical subjects, search Magnific stock for species-labelled illustrations before generating new artwork. The pi roig revision uses rawpixel.com’s «Scots pine conifer cones» (Magnific 4042176); the user rejected the sparse generated needle-and-bark composition. For missing illustration subjects, the successful generation route was Magnific **Recraft v4 Pro Vector**. The exact available tool/model may change; select the corresponding current vector option. The reusable prompt is [`social/asset-library/style-references/illustrated-field-guide/prompt-template.md`](../social/asset-library/style-references/illustrated-field-guide/prompt-template.md).

Generate isolated objects on a plain background with generous margins. For a sheet, explicitly specify its rows, columns, empty gutters and each object. Ask for no text, labels, logos or panels. Keep the number of objects small. Match the approved reference's contour weight, organic folds and warm palette; simply saying “flat vector” is not specific enough.

Inspect the completed SVG before use. Retain the original, remove only the known full-sheet background shape in a working copy, and isolate objects with viewBoxes without clipping their edges. Preserve aspect ratio, explicitly clip each extract to its source bounds, and remove sheet dividers. Letterbox space can otherwise reveal adjacent artwork outside the viewBox. Check that no neighbouring object or border leaks into an extract. Store the source prompt, creation link, model, date and preparation alongside the vectors; refresh `social/asset-library/catalog.json` with `node social/asset-library/reindex.mjs`.

## Final review

Check every slide at native size and phone size: alignment, text wrap, spelling, readable labels, correct logo, meaningful arrows, clean object edges and consistent illustration style. Measure text and badge bounds; do not rely only on a small contact sheet. Export 1080 × 1350 JPGs and retain PNGs and source SVGs. Preserve approved examples in `social/asset-library/style-references/`; keep working exports under the appropriate `social/` campaign folder.

The user requested no overlaid AI label on the artwork. Preserve truthful generation provenance in source records and prepared captions; platform labelling is handled when publishing. Do not publish or schedule a post simply because the artwork is ready.
