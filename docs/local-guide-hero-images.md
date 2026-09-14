# Local guide hero images

The local guide pages (`/zones/<area>/<place>/<species>`) can show a full-bleed hero
band like the homepage. Commons reference photographs do not work there: their
subject sits mid-frame under the heading and most originals are below 2560 px.
Purpose-made compositions are catalogued in `data/local-guide-hero-media.ts`;
species without an entry show their reference photograph in the same band.

## Producing an image with Magnific

1. Start from the species identification reference photograph (path below) as the
   image reference, following the same rule as the illustrated carousel: keep the
   photographed cap, stem, underside, proportions and orientation; do not invent
   hidden structures.
2. Compose for the band: subject group in the right half, quiet dark forest floor
   and litter on the left third, soft top-left light, no text. The homepage hero
   (`public/media/generated/home-hero-boletus-v2.webp`, 3024×1296) is the style
   and proportion reference.
3. Export at 3024×1296 px, encode to WebP quality 84 and save it as
   `public/media/generated/hero/<speciesId>.webp`.
4. Add an entry to `localGuideHeroMedia` with `sourceUrl`, `attribution` and
   `license` of the photograph it derives from plus the adaptation notice, e.g.
   `license: "CC BY-SA 4.0 · adaptació generada amb Magnific"`. Share-alike terms
   carry over to the derivative.
5. Run `npm run media:build`; the page picks the entry up automatically.

## Species with local guides (57 guides)

| speciesId | Guides | Reference photograph | Source | Licence |
| --- | --- | --- | --- | --- |
| boletus-edulis | 13 | public/media/wikimedia/boletus-edulis.webp | Boletus_edulis_IT.jpg | CC BY-SA |
| cantharellus-cibarius | 9 | public/media/wikimedia/cantharellus-cibarius.webp | Chanterelle_Cantharellus_cibarius.jpg | CC BY-SA 3.0 |
| lactarius-deliciosus | 8 | public/media/contributed/lactarius-deliciosus-field-aleix-20241124.webp | own photograph | © Aleix Ventayol |
| craterellus-lutescens | 8 | public/media/wikimedia/craterellus-lutescens.webp | Cantharellus_lutescens.jpg | CC BY-SA 3.0 |
| lactarius-sanguifluus | 5 | public/media/wikimedia/lactarius-sanguifluus.webp | Weinroter_Kiefern-Reizker_Lactarius_sanguifluus.jpg | CC BY-SA |
| craterellus-cornucopioides | 5 | public/media/wikimedia/craterellus-cornucopioides.webp | Craterellus_cornucopioides_JPG1.jpg | CC BY 3.0 |
| boletus-pinophilus | 2 | public/media/wikimedia/boletus-pinophilus.webp | Boletus_pinophilus3.JPG | CC BY-SA |
| tricholoma-terreum | 2 | public/media/wikimedia/tricholoma-terreum.webp | Tricholoma_terreum_20061105wa.jpg | CC BY-SA |
| amanita-caesarea | 2 | public/media/wikimedia/amanita-caesarea.webp | Oronges.jpg | CC BY-SA |
| hygrophorus-russula | 1 | public/media/wikimedia/hygrophorus-russula.webp | Hygrophorus_russula_(Moselle,_France).jpg | CC BY-SA |
| hygrophorus-latitabundus | 1 | public/media/wikimedia/hygrophorus-latitabundus.webp | Hygrophorus_latitabundus1.JPG | CC BY-SA |
| boletus-aereus | 1 | public/media/wikimedia/boletus-aereus.webp | Boletus_aereus_(29105181796).jpg | CC BY-SA |

Licence column: check the exact version on the Commons file page recorded in
`data/species-media.ts` before publishing a derivative.
